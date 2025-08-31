/**
 * Skeleton loading components for different content types.
 */

import React from 'react';

export interface LoadingSkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  width = 'w-full',
  height = 'h-4',
  rounded = true
}) => {
  const skeletonClasses = `
    ${width}
    ${height}
    ${rounded ? 'rounded' : ''}
    bg-gray-200
    animate-pulse
    ${className}
  `.trim();

  return <div className={skeletonClasses} />;
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 border border-gray-200 rounded-lg shadow-sm ${className}`}>
    <div className="flex items-center space-x-4">
      <LoadingSkeleton width="w-12" height="h-12" />
      <div className="flex-1 space-y-2">
        <LoadingSkeleton width="w-3/4" height="h-4" />
        <LoadingSkeleton width="w-1/2" height="h-3" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <LoadingSkeleton height="h-3" />
      <LoadingSkeleton width="w-5/6" height="h-3" />
      <LoadingSkeleton width="w-4/6" height="h-3" />
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ items?: number; className?: string }> = ({ 
  items = 3, 
  className = '' 
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded">
        <LoadingSkeleton width="w-8" height="h-8" />
        <div className="flex-1 space-y-1">
          <LoadingSkeleton width="w-3/4" height="h-4" />
          <LoadingSkeleton width="w-1/2" height="h-3" />
        </div>
        <LoadingSkeleton width="w-16" height="h-6" />
      </div>
    ))}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => (
  <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
    {/* Header */}
    <div className="flex bg-gray-50 p-3 border-b border-gray-200">
      {Array.from({ length: columns }).map((_, index) => (
        <div key={index} className="flex-1 px-2">
          <LoadingSkeleton width="w-3/4" height="h-4" />
        </div>
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex p-3 border-b border-gray-100 last:border-b-0">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div key={colIndex} className="flex-1 px-2">
            <LoadingSkeleton 
              width={colIndex === 0 ? "w-5/6" : "w-3/4"} 
              height="h-3" 
            />
          </div>
        ))}
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;
