/**
 * File upload and validation service with backend integration.
 */

import { cachedApi } from './cachedApiClient';
import { ApiResponse } from '../types/api';

export interface FileValidationResult {
  filename: string;
  size: number;
  mime_type: string;
  is_safe: boolean;
  status: 'valid' | 'invalid' | 'error';
  error?: string;
}

export interface FileUploadResult {
  files: Array<{
    filename: string;
    size: number;
    mime_type: string;
    hash: string;
    is_safe: boolean;
  }>;
  total_size: number;
  total_files: number;
}

export interface FileTypeConfig {
  allowed_mime_types: string[];
  max_file_size: number;
  max_file_size_mb: number;
  max_files_per_user: number;
  allowed_extensions: string[];
}

export const fileService = {
  /**
   * Get allowed file types and limits from backend.
   */
  async getFileConfig(): Promise<FileTypeConfig> {
    const response = await cachedApi.get<ApiResponse<FileTypeConfig>>(
      '/files/allowed-types',
      {
        useCache: true,
        cacheTTL: 300000, // 5 minutes
      }
    );
    return response.data;
  },

  /**
   * Validate files on backend before upload.
   */
  async validateFiles(files: File[]): Promise<{
    results: FileValidationResult[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
    };
  }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await cachedApi.post<ApiResponse<{
      results: FileValidationResult[];
      summary: { total: number; valid: number; invalid: number };
    }>>('/files/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      retryConfig: false, // Don't retry file uploads
    });

    return response.data;
  },

  /**
   * Upload files to backend with validation.
   */
  async uploadFiles(files: File[]): Promise<FileUploadResult> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await cachedApi.post<ApiResponse<FileUploadResult>>(
      '/files/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        retryConfig: false, // Don't retry file uploads
      }
    );

    return response.data;
  },

  /**
   * Perform security check on a single file.
   */
  async securityCheckFile(file: File): Promise<{
    validation: {
      filename: string;
      size: number;
      mime_type: string;
      hash: string;
      is_safe: boolean;
    };
    security: {
      filename_safe: string;
      content_analysis: {
        size: number;
        has_null_bytes: boolean;
        null_byte_percentage: number;
        line_count: number;
        max_line_length: number;
      };
      risk_assessment: string;
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await cachedApi.post<ApiResponse<any>>(
      '/files/check-security',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        retryConfig: false,
      }
    );

    return response.data;
  },

  /**
   * Format file size for display.
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  },

  /**
   * Get file type icon based on MIME type.
   */
  getFileTypeIcon(mimeType: string): string {
    const iconMap: Record<string, string> = {
      'application/pdf': '📄',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📽️',
      'text/plain': '📄',
      'text/csv': '📊',
      'application/json': '🔧',
      'text/markdown': '📝',
      'application/rtf': '📝',
    };
    
    return iconMap[mimeType] || '📁';
  },

  /**
   * Check if file type is allowed based on config.
   */
  isFileTypeAllowed(file: File, config: FileTypeConfig): boolean {
    return config.allowed_mime_types.includes(file.type);
  },

  /**
   * Check if file size is within limits.
   */
  isFileSizeValid(file: File, config: FileTypeConfig): boolean {
    return file.size <= config.max_file_size && file.size > 0;
  },

  /**
   * Get comprehensive file validation errors.
   */
  getFileValidationErrors(file: File, config: FileTypeConfig): string[] {
    const errors: string[] = [];

    if (file.size === 0) {
      errors.push('Файл пустой');
    }

    if (file.size > config.max_file_size) {
      errors.push(
        `Файл слишком большой: ${this.formatFileSize(file.size)} (максимум: ${this.formatFileSize(config.max_file_size)})`
      );
    }

    if (!this.isFileTypeAllowed(file, config)) {
      errors.push(`Неподдерживаемый тип файла: ${file.type || 'неизвестный'}`);
    }

    // Check for suspicious filename patterns
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|com|pif|vbs|js|jar|sh)$/i,
      /^\./,
      /[<>:"|?*\x00-\x1f]/,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.name)) {
        errors.push(`Подозрительное имя файла: "${file.name}"`);
        break;
      }
    }

    return errors;
  },
};
