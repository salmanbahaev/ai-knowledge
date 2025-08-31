/**
 * Secure file upload component with drag & drop, validation, and progress tracking.
 */

import React, { useRef, useState, useCallback } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';
import { formatFileSize, getFileTypeIcon } from '../../utils/fileValidation';
import { LoadingSpinner } from './LoadingSpinner';

export interface FileUploadProps {
  onUploadComplete?: (results: any[]) => void;
  onFilesSelected?: (files: File[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
  accept?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onFilesSelected,
  multiple = true,
  maxFiles = 10,
  className = '',
  accept = '.pdf,.doc,.docx,.txt,.md,.rtf'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    selectedFiles,
    uploadProgress,
    validationResults,
    selectFiles,
    uploadFiles,
    cancelUpload,
    removeFile,
    clearFiles,
    overallProgress,
    uploadStats,
    isValid,
    hasFiles,
    isUploading,
    isCompleted
  } = useFileUpload({
    validationConfig: { maxFiles },
    onAllUploadsComplete: onUploadComplete
  });

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    selectFiles(files);
    onFilesSelected?.(Array.from(files));
  }, [selectFiles, onFilesSelected]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-blue-600 hover:text-blue-500">
                Нажмите для выбора файлов
              </span>
              {' '}или перетащите их сюда
            </p>
            <p className="text-xs text-gray-500">
              {accept} до {formatFileSize(10 * 1024 * 1024)} каждый
            </p>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationResults && !validationResults.isValid && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-sm font-medium text-red-800 mb-2">Ошибки валидации:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {validationResults.globalErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
            {validationResults.results
              .filter(result => !result.isValid)
              .map((result, index) => (
                <li key={index}>
                  • {result.file.name}: {result.errors.join(', ')}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* File List */}
      {hasFiles && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Выбранные файлы ({selectedFiles.length})
            </h4>
            {!isUploading && (
              <button
                onClick={clearFiles}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Очистить все
              </button>
            )}
          </div>

          <div className="space-y-2">
            {uploadProgress.map((progress) => (
              <FileProgressItem
                key={progress.fileId}
                progress={progress}
                onCancel={() => cancelUpload(progress.fileId)}
                onRemove={() => removeFile(progress.fileId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upload Controls */}
      {hasFiles && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {isCompleted ? (
              <span>
                Завершено: {uploadStats.completed} из {uploadStats.total}
                {uploadStats.error > 0 && `, ошибок: ${uploadStats.error}`}
              </span>
            ) : isUploading ? (
              <span>Загрузка: {overallProgress}%</span>
            ) : (
              <span>Готово к загрузке: {selectedFiles.length} файлов</span>
            )}
          </div>

          <div className="flex space-x-2">
            {!isUploading && !isCompleted && isValid && (
              <button
                onClick={uploadFiles}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Загрузить файлы
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface FileProgressItemProps {
  progress: any;
  onCancel: () => void;
  onRemove: () => void;
}

const FileProgressItem: React.FC<FileProgressItemProps> = ({
  progress,
  onCancel,
  onRemove
}) => {
  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'uploading': return 'text-blue-600';
      case 'cancelled': return 'text-gray-500';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      case 'uploading':
        return <LoadingSpinner size="sm" />;
      default:
        return <span className="text-lg">{getFileTypeIcon(`.${progress.fileName.split('.').pop()}`)}</span>;
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {progress.fileName}
          </p>
          <span className={`text-xs font-medium ${getStatusColor()}`}>
            {progress.status === 'uploading' ? `${progress.progress}%` : progress.status}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>{formatFileSize(progress.total)}</span>
          {progress.status === 'uploading' && progress.speed > 0 && (
            <span>• {formatFileSize(progress.speed)}/s</span>
          )}
        </div>

        {progress.status === 'uploading' && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        )}

        {progress.error && (
          <p className="mt-1 text-xs text-red-600">{progress.error}</p>
        )}
      </div>

      <div className="flex-shrink-0">
        {progress.status === 'uploading' ? (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            title="Отменить загрузку"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-gray-600"
            title="Удалить файл"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L10 9.586 7.707 7.293a1 1 0 00-1.414 1.414L8.586 11l-2.293 2.293a1 1 0 101.414 1.414L10 12.414l2.293 2.293a1 1 0 001.414-1.414L11.414 11l2.293-2.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
