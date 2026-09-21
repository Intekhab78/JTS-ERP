import React from 'react';
import { Skeleton } from '../ui/Skeleton';

const TableSkeleton = ({ columns = 4, rows = 5, className = '' }) => {
  return (
    <div className={`w-full overflow-hidden rounded-md border bg-background ${className}`}>
      <div className="border-b bg-muted/20 px-4 py-3">
        <div className="flex justify-between gap-4">
          {Array(columns).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full max-w-[100px]" />
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        {Array(rows).fill(0).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 border-b px-4 py-4 last:border-0">
            {Array(columns).fill(0).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" style={{ maxWidth: `${Math.random() * 40 + 60}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export { TableSkeleton };
export default TableSkeleton;
