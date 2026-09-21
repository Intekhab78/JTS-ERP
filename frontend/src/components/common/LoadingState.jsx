import React from 'react';
import { Spinner } from '../ui/Spinner';

const LoadingState = ({ 
  text = "Loading...", 
  fullScreen = false,
  className = ''
}) => {
  const baseClasses = "flex flex-col items-center justify-center gap-3 text-muted-foreground";
  const wrapperClasses = fullScreen ? "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" : className;

  return (
    <div className={`${baseClasses} ${wrapperClasses}`}>
      <Spinner size="lg" />
      <p className="text-sm font-medium animate-pulse">{text}</p>
    </div>
  );
};

export { LoadingState };
export default LoadingState;
