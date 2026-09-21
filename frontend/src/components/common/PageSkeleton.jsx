import React from 'react';
import { Skeleton } from '../ui/Skeleton';

const PageSkeleton = ({ className = '' }) => {
  return (
    <div className={`p-6 w-full space-y-6 ${className}`}>
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 pb-6 sm:flex-row sm:items-center sm:justify-between border-b">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      {/* Filter/Action Bar Skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md ml-auto" />
      </div>

      {/* Content Skeleton - Defaulting to a table look */}
      <div className="rounded-md border p-4 space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
};

export { PageSkeleton };
export default PageSkeleton;
