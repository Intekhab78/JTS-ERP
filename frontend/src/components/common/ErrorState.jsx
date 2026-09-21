import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from '../ui/Button';

const ErrorState = ({ 
  title = "Something went wrong", 
  description = "An unexpected error occurred while trying to process your request.", 
  onRetry,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center animate-in fade-in ${className}`}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-error/10 mb-4 text-error">
        <AlertOctagon className="h-10 w-10" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 mb-6 text-sm text-muted-foreground max-w-sm">
        {description}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-2">
          Try Again
        </Button>
      )}
    </div>
  );
};

export { ErrorState };
export default ErrorState;
