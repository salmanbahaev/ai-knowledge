/**
 * Custom hook for secure file upload with progress tracking and validation.
 */

import { useState, useCallback, useRef } from 'react';
import { NetworkError } from '../utils/errorHandler';
import { 
  validateFiles, 
  FileValidationConfig, 
  DEFAULT_VALIDATION_CONFIG,
  FileInfo,
  getFileInfo 
} from '../utils/fileValidation';

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  uploaded: number; // bytes
  total: number; // bytes
  speed: number; // bytes per second
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

export interface UseFileUploadOptions {
  validationConfig?: FileValidationConfig;
  uploadEndpoint?: string;
  onUploadProgress?: (progress: UploadProgress) => void;
  onUploadComplete?: (fileId: string, response: any) => void;
  onUploadError?: (fileId: string, error: NetworkError) => void;
  onAllUploadsComplete?: (results: Array<{ fileId: string; success: boolean; response?: any; error?: NetworkError }>) => void;
  chunkSize?: number; // For chunked uploads
  maxConcurrentUploads?: number;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    validationConfig = DEFAULT_VALIDATION_CONFIG,
    uploadEndpoint = '/api/v1/files/upload',
    onUploadProgress,
    onUploadComplete,
    onUploadError,
    onAllUploadsComplete,
    maxConcurrentUploads = 3
  } = options;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [validationResults, setValidationResults] = useState<{
    isValid: boolean;
    results: Array<any>;
    globalErrors: string[];
  } | null>(null);

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const uploadQueueRef = useRef<string[]>([]);
  const activeUploadsRef = useRef<Set<string>>(new Set());

  const generateFileId = useCallback((file: File): string => {
    return `${file.name}_${file.size}_${file.lastModified}`;
  }, []);

  const selectFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);

    // Validate files
    const validation = validateFiles(fileArray, validationConfig);
    setValidationResults(validation);

    // Initialize progress tracking
    const progressMap = new Map<string, UploadProgress>();
    fileArray.forEach(file => {
      const fileId = generateFileId(file);
      progressMap.set(fileId, {
        fileId,
        fileName: file.name,
        progress: 0,
        uploaded: 0,
        total: file.size,
        speed: 0,
        status: validation.isValid ? 'pending' : 'error',
        error: validation.results.find(r => r.file === file)?.errors.join(', ')
      });
    });

    setUploadProgress(progressMap);
  }, [validationConfig, generateFileId]);

  const updateProgress = useCallback((fileId: string, updates: Partial<UploadProgress>) => {
    setUploadProgress(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(fileId);
      if (current) {
        const updated = { ...current, ...updates };
        newMap.set(fileId, updated);
        onUploadProgress?.(updated);
      }
      return newMap;
    });
  }, [onUploadProgress]);

  const uploadSingleFile = useCallback(async (file: File): Promise<any> => {
    const fileId = generateFileId(file);
    const abortController = new AbortController();
    abortControllersRef.current.set(fileId, abortController);

    updateProgress(fileId, { status: 'uploading' });

    const formData = new FormData();
    formData.append('file', file);

    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    try {
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
        // Add upload progress tracking
        ...(window.fetch && {
          onUploadProgress: (event: ProgressEvent) => {
            if (event.lengthComputable) {
              const now = Date.now();
              const timeDiff = (now - lastTime) / 1000; // seconds
              const bytesDiff = event.loaded - lastLoaded;
              const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

              updateProgress(fileId, {
                progress: Math.round((event.loaded / event.total) * 100),
                uploaded: event.loaded,
                speed
              });

              lastLoaded = event.loaded;
              lastTime = now;
            }
          }
        })
      });

      if (!response.ok) {
        throw new NetworkError(
          `Upload failed: ${response.statusText}`,
          response.status
        );
      }

      const result = await response.json();

      updateProgress(fileId, {
        status: 'completed',
        progress: 100,
        uploaded: file.size
      });

      onUploadComplete?.(fileId, result);
      return result;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        updateProgress(fileId, {
          status: 'cancelled',
          error: 'Загрузка отменена'
        });
        return null;
      }

      const networkError = error instanceof NetworkError 
        ? error 
        : new NetworkError(error.message || 'Ошибка загрузки файла');

      updateProgress(fileId, {
        status: 'error',
        error: networkError.message
      });

      onUploadError?.(fileId, networkError);
      throw networkError;

    } finally {
      abortControllersRef.current.delete(fileId);
      activeUploadsRef.current.delete(fileId);
    }
  }, [uploadEndpoint, generateFileId, updateProgress, onUploadComplete, onUploadError]);

  const processUploadQueue = useCallback(async () => {
    while (uploadQueueRef.current.length > 0 && activeUploadsRef.current.size < maxConcurrentUploads) {
      const fileId = uploadQueueRef.current.shift();
      if (!fileId) continue;

      const file = selectedFiles.find(f => generateFileId(f) === fileId);
      if (!file) continue;

      activeUploadsRef.current.add(fileId);

      // Start upload (don't await here to allow concurrent uploads)
      uploadSingleFile(file).catch(() => {
        // Error already handled in uploadSingleFile
      });
    }
  }, [selectedFiles, generateFileId, uploadSingleFile, maxConcurrentUploads]);

  const uploadFiles = useCallback(async () => {
    if (!validationResults?.isValid || selectedFiles.length === 0) {
      return;
    }

    // Initialize upload queue
    uploadQueueRef.current = selectedFiles.map(generateFileId);
    
    // Start processing queue
    await processUploadQueue();

    // Wait for all uploads to complete
    const results: Array<{ fileId: string; success: boolean; response?: any; error?: NetworkError }> = [];
    
    const promises = selectedFiles.map(async (file) => {
      const fileId = generateFileId(file);
      try {
        const response = await uploadSingleFile(file);
        results.push({ fileId, success: true, response });
      } catch (error) {
        results.push({ 
          fileId, 
          success: false, 
          error: error instanceof NetworkError ? error : new NetworkError(error.message)
        });
      }
    });

    await Promise.allSettled(promises);
    onAllUploadsComplete?.(results);

  }, [validationResults, selectedFiles, generateFileId, processUploadQueue, uploadSingleFile, onAllUploadsComplete]);

  const cancelUpload = useCallback((fileId: string) => {
    const abortController = abortControllersRef.current.get(fileId);
    if (abortController) {
      abortController.abort();
    }

    // Remove from queue if pending
    uploadQueueRef.current = uploadQueueRef.current.filter(id => id !== fileId);

    updateProgress(fileId, {
      status: 'cancelled',
      error: 'Загрузка отменена'
    });
  }, [updateProgress]);

  const cancelAllUploads = useCallback(() => {
    // Cancel all active uploads
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();

    // Clear queue
    uploadQueueRef.current = [];
    activeUploadsRef.current.clear();

    // Update all progress to cancelled
    uploadProgress.forEach((progress, fileId) => {
      if (progress.status === 'uploading' || progress.status === 'pending') {
        updateProgress(fileId, {
          status: 'cancelled',
          error: 'Загрузка отменена'
        });
      }
    });
  }, [uploadProgress, updateProgress]);

  const removeFile = useCallback((fileId: string) => {
    // Cancel upload if in progress
    cancelUpload(fileId);

    // Remove from selected files
    setSelectedFiles(prev => prev.filter(file => generateFileId(file) !== fileId));

    // Remove from progress
    setUploadProgress(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  }, [cancelUpload, generateFileId]);

  const clearFiles = useCallback(() => {
    cancelAllUploads();
    setSelectedFiles([]);
    setUploadProgress(new Map());
    setValidationResults(null);
  }, [cancelAllUploads]);

  const getOverallProgress = useCallback(() => {
    if (uploadProgress.size === 0) return 0;

    const totalProgress = Array.from(uploadProgress.values())
      .reduce((sum, progress) => sum + progress.progress, 0);

    return Math.round(totalProgress / uploadProgress.size);
  }, [uploadProgress]);

  const getUploadStats = useCallback(() => {
    const progressArray = Array.from(uploadProgress.values());
    
    return {
      total: progressArray.length,
      pending: progressArray.filter(p => p.status === 'pending').length,
      uploading: progressArray.filter(p => p.status === 'uploading').length,
      completed: progressArray.filter(p => p.status === 'completed').length,
      error: progressArray.filter(p => p.status === 'error').length,
      cancelled: progressArray.filter(p => p.status === 'cancelled').length
    };
  }, [uploadProgress]);

  return {
    // State
    selectedFiles,
    uploadProgress: Array.from(uploadProgress.values()),
    validationResults,
    
    // Actions
    selectFiles,
    uploadFiles,
    cancelUpload,
    cancelAllUploads,
    removeFile,
    clearFiles,
    
    // Computed
    overallProgress: getOverallProgress(),
    uploadStats: getUploadStats(),
    
    // Validation
    isValid: validationResults?.isValid ?? false,
    hasFiles: selectedFiles.length > 0,
    isUploading: Array.from(uploadProgress.values()).some(p => p.status === 'uploading'),
    isCompleted: Array.from(uploadProgress.values()).every(p => 
      p.status === 'completed' || p.status === 'error' || p.status === 'cancelled'
    )
  };
}
