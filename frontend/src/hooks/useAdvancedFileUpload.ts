/**
 * Advanced file upload hook with backend validation integration.
 */

import { useState, useCallback, useRef } from 'react';
import { fileService, FileValidationResult, FileTypeConfig } from '../services/fileService';
import { useAsyncOperation } from './useAsyncOperation';

export interface UseAdvancedFileUploadOptions {
  autoValidate?: boolean;
  autoUpload?: boolean;
  onValidationComplete?: (results: FileValidationResult[]) => void;
  onUploadComplete?: (results: any) => void;
  onError?: (error: Error) => void;
}

export function useAdvancedFileUpload(options: UseAdvancedFileUploadOptions = {}) {
  const {
    autoValidate = true,
    autoUpload = false,
    onValidationComplete,
    onUploadComplete,
    onError,
  } = options;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationResults, setValidationResults] = useState<FileValidationResult[]>([]);
  const [fileConfig, setFileConfig] = useState<FileTypeConfig | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load file configuration
  const {
    data: config,
    loading: configLoading,
    execute: loadConfig,
  } = useAsyncOperation(
    () => fileService.getFileConfig(),
    {
      onSuccess: setFileConfig,
      onError,
    }
  );

  // File validation
  const {
    loading: validating,
    execute: validateFiles,
  } = useAsyncOperation(
    (files: File[]) => fileService.validateFiles(files),
    {
      onSuccess: (result) => {
        setValidationResults(result.results);
        onValidationComplete?.(result.results);
      },
      onError,
    }
  );

  // File upload
  const {
    loading: uploading,
    execute: uploadFiles,
  } = useAsyncOperation(
    (files: File[]) => fileService.uploadFiles(files),
    {
      onSuccess: onUploadComplete,
      onError,
    }
  );

  // Security check
  const {
    loading: securityChecking,
    execute: performSecurityCheck,
  } = useAsyncOperation(
    (file: File) => fileService.securityCheckFile(file),
    {
      onError,
    }
  );

  const selectFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      setSelectedFiles(fileArray);
      setValidationResults([]);

      // Load config if not already loaded
      if (!fileConfig && !configLoading) {
        await loadConfig();
      }

      // Auto-validate if enabled
      if (autoValidate && fileArray.length > 0) {
        await validateFiles(fileArray);

        // Auto-upload if enabled and validation passes
        if (autoUpload) {
          const hasErrors = validationResults.some(r => r.status !== 'valid');
          if (!hasErrors) {
            await uploadFiles(fileArray);
          }
        }
      }
    },
    [
      fileConfig,
      configLoading,
      loadConfig,
      autoValidate,
      autoUpload,
      validateFiles,
      uploadFiles,
      validationResults,
    ]
  );

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setValidationResults(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
    setValidationResults([]);
    
    // Cancel any ongoing operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const retryValidation = useCallback(async () => {
    if (selectedFiles.length > 0) {
      await validateFiles(selectedFiles);
    }
  }, [selectedFiles, validateFiles]);

  const manualUpload = useCallback(async () => {
    if (selectedFiles.length > 0) {
      await uploadFiles(selectedFiles);
    }
  }, [selectedFiles, uploadFiles]);

  const securityCheck = useCallback(async (file: File) => {
    return await performSecurityCheck(file);
  }, [performSecurityCheck]);

  // Client-side validation using config
  const getClientValidationErrors = useCallback((file: File): string[] => {
    if (!fileConfig) return [];
    return fileService.getFileValidationErrors(file, fileConfig);
  }, [fileConfig]);

  // Statistics
  const stats = {
    totalFiles: selectedFiles.length,
    totalSize: selectedFiles.reduce((sum, file) => sum + file.size, 0),
    validFiles: validationResults.filter(r => r.status === 'valid').length,
    invalidFiles: validationResults.filter(r => r.status === 'invalid').length,
    errorFiles: validationResults.filter(r => r.status === 'error').length,
  };

  const isValid = validationResults.length > 0 && validationResults.every(r => r.status === 'valid');
  const hasFiles = selectedFiles.length > 0;
  const isLoading = configLoading || validating || uploading || securityChecking;

  return {
    // State
    selectedFiles,
    validationResults,
    fileConfig,
    stats,
    
    // Status
    isValid,
    hasFiles,
    isLoading,
    configLoading,
    validating,
    uploading,
    securityChecking,
    
    // Actions
    selectFiles,
    removeFile,
    clearFiles,
    retryValidation,
    manualUpload,
    securityCheck,
    loadConfig,
    
    // Utilities
    getClientValidationErrors,
    formatFileSize: fileService.formatFileSize,
    getFileTypeIcon: fileService.getFileTypeIcon,
  };
}
