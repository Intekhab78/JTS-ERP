import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { Card, CardHeader, CardContent, CardFooter } from './Card';

const CardSkeleton = ({ className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader className="gap-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-24 rounded-md" />
      </CardFooter>
    </Card>
  );
};

export { CardSkeleton };
export default CardSkeleton;
