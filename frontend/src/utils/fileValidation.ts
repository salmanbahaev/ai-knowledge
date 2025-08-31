/**
 * Client-side file validation utilities.
 */

export interface FileValidationConfig {
  maxSize: number; // bytes
  allowedTypes: string[];
  allowedExtensions: string[];
  maxFiles?: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  extension: string;
  lastModified: number;
}

export const DEFAULT_VALIDATION_CONFIG: FileValidationConfig = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/rtf'
  ],
  allowedExtensions: [
    '.pdf', '.doc', '.docx', '.txt', '.md', '.rtf'
  ],
  maxFiles: 10
};

/**
 * Extract file information from File object.
 */
export function getFileInfo(file: File): FileInfo {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase() || '';
  
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    extension,
    lastModified: file.lastModified
  };
}

/**
 * Format file size in human-readable format.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate a single file against configuration.
 */
export function validateFile(
  file: File, 
  config: FileValidationConfig = DEFAULT_VALIDATION_CONFIG
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fileInfo = getFileInfo(file);

  // Size validation
  if (fileInfo.size > config.maxSize) {
    errors.push(
      `Файл "${fileInfo.name}" слишком большой. Максимум: ${formatFileSize(config.maxSize)}, текущий: ${formatFileSize(fileInfo.size)}`
    );
  }

  // Size warning for large files
  if (fileInfo.size > config.maxSize * 0.8) {
    warnings.push(
      `Файл "${fileInfo.name}" довольно большой (${formatFileSize(fileInfo.size)}). Загрузка может занять время.`
    );
  }

  // MIME type validation
  if (config.allowedTypes.length > 0 && !config.allowedTypes.includes(fileInfo.type)) {
    errors.push(
      `Неподдерживаемый тип файла "${fileInfo.name}". Разрешены: ${config.allowedTypes.join(', ')}`
    );
  }

  // Extension validation
  if (config.allowedExtensions.length > 0 && !config.allowedExtensions.includes(fileInfo.extension)) {
    errors.push(
      `Неподдерживаемое расширение файла "${fileInfo.name}". Разрешены: ${config.allowedExtensions.join(', ')}`
    );
  }

  // Empty file check
  if (fileInfo.size === 0) {
    errors.push(`Файл "${fileInfo.name}" пустой`);
  }

  // Suspicious file names
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|scr|com|pif|vbs|js|jar|sh)$/i,
    /^\./,
    /[<>:"|?*\x00-\x1f]/
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fileInfo.name)) {
      errors.push(`Подозрительное имя файла: "${fileInfo.name}"`);
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate multiple files.
 */
export function validateFiles(
  files: File[], 
  config: FileValidationConfig = DEFAULT_VALIDATION_CONFIG
): {
  isValid: boolean;
  results: Array<FileValidationResult & { file: File }>;
  globalErrors: string[];
  totalSize: number;
} {
  const results = files.map(file => ({
    file,
    ...validateFile(file, config)
  }));

  const globalErrors: string[] = [];
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  // Check total number of files
  if (config.maxFiles && files.length > config.maxFiles) {
    globalErrors.push(`Слишком много файлов. Максимум: ${config.maxFiles}, выбрано: ${files.length}`);
  }

  // Check for duplicate names
  const fileNames = files.map(f => f.name.toLowerCase());
  const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    globalErrors.push(`Найдены файлы с одинаковыми именами: ${[...new Set(duplicates)].join(', ')}`);
  }

  // Check total size
  const maxTotalSize = config.maxSize * (config.maxFiles || 10);
  if (totalSize > maxTotalSize) {
    globalErrors.push(
      `Общий размер файлов слишком большой. Максимум: ${formatFileSize(maxTotalSize)}, текущий: ${formatFileSize(totalSize)}`
    );
  }

  const isValid = globalErrors.length === 0 && results.every(r => r.isValid);

  return {
    isValid,
    results,
    globalErrors,
    totalSize
  };
}

/**
 * Get file type icon based on extension.
 */
export function getFileTypeIcon(extension: string): string {
  const iconMap: Record<string, string> = {
    '.pdf': '📄',
    '.doc': '📝',
    '.docx': '📝',
    '.txt': '📃',
    '.md': '📋',
    '.rtf': '📄'
  };

  return iconMap[extension.toLowerCase()] || '📄';
}

/**
 * Check if file type is text-based for preview.
 */
export function isTextFile(file: File): boolean {
  const textTypes = [
    'text/plain',
    'text/markdown',
    'application/rtf'
  ];

  const textExtensions = ['.txt', '.md', '.rtf'];
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();

  return textTypes.includes(file.type) || textExtensions.includes(extension);
}

/**
 * Read file content as text (for preview).
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isTextFile(file)) {
      reject(new Error('Файл не является текстовым'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Ошибка чтения файла'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}
