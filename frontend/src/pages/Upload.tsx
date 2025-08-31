import React, { useState } from 'react';
import { Upload as UploadIcon, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
}

export const Upload: React.FC = () => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    // Handle file drop logic here
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'uploading':
      case 'processing':
        return <AlertCircle className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white i18n-card-title">{t('upload.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('upload.subtitle')}
        </p>
      </div>

      {/* Upload Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
            isDragOver
              ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('upload.dropzone.title')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('upload.dropzone.description')}
          </p>
          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <p>{t('upload.dropzone.supported')}</p>
            <p>{t('upload.dropzone.maxSize')}</p>
          </div>
          <button className="i18n-enhanced-button mt-6">
            <div className="i18n-button-content">
              <UploadIcon className="w-4 h-4 i18n-button-icon" />
              <span>Select Files</span>
            </div>
          </button>
        </div>
      </div>

      {/* Upload Progress */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Upload Progress</h3>
            <div className="space-y-4">
              {files.map((file) => (
                <div key={file.id} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  {getStatusIcon(file.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.status === 'uploading' || file.status === 'processing' ? (
                      <>
                        <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[3rem]">
                          {file.progress}%
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {file.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};





