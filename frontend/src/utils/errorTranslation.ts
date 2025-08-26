/**
 * Safe error translation utility
 */

export interface TranslatedError {
  message: string;
  isTranslated: boolean;
}

/**
 * Safely translates error messages with fallback to original message
 */
export const translateError = (error: string | Error, t: (key: string) => string): TranslatedError => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Common error patterns and their translation keys
  const errorPatterns: Record<string, string> = {
    'Failed to load dashboard data': 'errors.dashboardLoadFailed',
    'Network error': 'errors.network',
    'Server error': 'errors.serverError',
    'Unauthorized': 'errors.unauthorized',
    'Not found': 'errors.notFound',
    'Timeout': 'errors.timeout',
    'Connection failed': 'errors.connectionFailed',
    'Invalid response': 'errors.invalidResponse',
    'Permission denied': 'errors.permissionDenied',
  };

  // Check for exact matches first
  const exactMatch = errorPatterns[errorMessage];
  if (exactMatch && t(exactMatch) !== exactMatch) {
    return {
      message: t(exactMatch),
      isTranslated: true
    };
  }

  // Check for partial matches (contains)
  for (const [pattern, translationKey] of Object.entries(errorPatterns)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      const translatedMessage = t(translationKey);
      if (translatedMessage !== translationKey) {
        return {
          message: translatedMessage,
          isTranslated: true
        };
      }
    }
  }

  // If no translation found, return original message
  return {
    message: errorMessage,
    isTranslated: false
  };
};

/**
 * Hook for error translation in components
 */
export const useErrorTranslation = (t: (key: string) => string) => {
  return (error: string | Error): string => {
    const { message } = translateError(error, t);
    return message;
  };
};
