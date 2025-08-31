/**
 * Comprehensive error handling and retry logic for network requests.
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitter: boolean;
}

export interface ErrorContext {
  url?: string;
  method?: string;
  status?: number;
  attempt?: number;
  maxAttempts?: number;
}

export class NetworkError extends Error {
  public readonly status?: number;
  public readonly isNetworkError: boolean;
  public readonly isRetryable: boolean;
  public readonly context: ErrorContext;

  constructor(
    message: string,
    status?: number,
    context: ErrorContext = {},
    isRetryable = false
  ) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    this.isNetworkError = true;
    this.isRetryable = isRetryable;
    this.context = context;
  }
}

export class RetryableError extends NetworkError {
  constructor(message: string, status?: number, context: ErrorContext = {}) {
    super(message, status, context, true);
    this.name = 'RetryableError';
  }
}

/**
 * Determine if an error is retryable based on status code and error type.
 */
export function isRetryableError(error: any): boolean {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  const status = error.response?.status;
  
  // Retryable HTTP status codes
  const retryableStatuses = [
    408, // Request Timeout
    409, // Conflict (sometimes)
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ];

  return retryableStatuses.includes(status);
}

/**
 * Calculate delay for exponential backoff with jitter.
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.exponentialBase, attempt - 1);
  const delay = Math.min(exponentialDelay, config.maxDelay);
  
  if (config.jitter) {
    // Add random jitter ±25%
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(0, delay + jitter);
  }
  
  return delay;
}

/**
 * Sleep for specified milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for async functions with exponential backoff.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: ErrorContext = {}
): Promise<T> {
  const retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    exponentialBase: 2,
    jitter: true,
    ...config
  };

  let lastError: any;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      // Log successful retry
      if (attempt > 1 && process.env.NODE_ENV === 'development') {
        console.log(`✅ Operation succeeded on attempt ${attempt}/${retryConfig.maxAttempts}`);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      const errorContext = { ...context, attempt, maxAttempts: retryConfig.maxAttempts };

      // Check if we should retry
      if (attempt === retryConfig.maxAttempts || !isRetryableError(error)) {
        throw new NetworkError(
          error.message || 'Request failed',
          error.response?.status,
          errorContext,
          false
        );
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, retryConfig);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `⚠️ Attempt ${attempt}/${retryConfig.maxAttempts} failed, retrying in ${delay}ms:`,
          error.message
        );
      }

      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Get user-friendly error message based on error type and status.
 */
export function getUserFriendlyErrorMessage(error: any): string {
  // Network errors (no response)
  if (!error.response) {
    return 'Проблемы с подключением к серверу. Проверьте интернет-соединение.';
  }

  const status = error.response?.status;
  const message = error.response?.data?.message || error.message;

  switch (status) {
    case 400:
      return 'Некорректный запрос. Проверьте введенные данные.';
    case 401:
      return 'Необходима авторизация. Пожалуйста, войдите в систему.';
    case 403:
      return 'Недостаточно прав для выполнения операции.';
    case 404:
      return 'Запрашиваемый ресурс не найден.';
    case 409:
      return 'Конфликт данных. Возможно, ресурс уже существует.';
    case 429:
      return 'Слишком много запросов. Попробуйте позже.';
    case 500:
      return 'Внутренняя ошибка сервера. Мы работаем над исправлением.';
    case 502:
      return 'Сервер временно недоступен. Попробуйте позже.';
    case 503:
      return 'Сервис временно недоступен. Попробуйте позже.';
    case 504:
      return 'Превышено время ожидания ответа сервера.';
    default:
      return message || `Ошибка сервера (${status})`;
  }
}

/**
 * Handle API errors with logging and user notification.
 */
export function handleApiError(error: any, context: ErrorContext = {}): NetworkError {
  const errorMessage = getUserFriendlyErrorMessage(error);
  const status = error.response?.status;
  
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 API Error:', {
      url: context.url,
      method: context.method,
      status,
      message: error.message,
      response: error.response?.data
    });
  }

  // Create appropriate error type
  const isRetryable = isRetryableError(error);
  const ErrorClass = isRetryable ? RetryableError : NetworkError;
  
  return new ErrorClass(errorMessage, status, context, isRetryable);
}

/**
 * Default retry configurations for different types of operations.
 */
export const RETRY_CONFIGS = {
  // Quick operations (search, health checks)
  quick: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    exponentialBase: 2,
    jitter: true
  },
  
  // Standard operations (dashboard, API calls)
  standard: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    exponentialBase: 2,
    jitter: true
  },
  
  // Heavy operations (file uploads, processing)
  heavy: {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    exponentialBase: 1.5,
    jitter: true
  }
} as const;
