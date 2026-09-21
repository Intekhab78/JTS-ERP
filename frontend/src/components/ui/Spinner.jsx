import React from 'react';
import { Loader2 } from 'lucide-react';

const Spinner = ({ 
  size = 'md',
  className = '',
  ...props 
}) => {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };
  
  const sizeStyle = sizes[size] || sizes.md;

  return (
    <div role="status" aria-label="Loading" className={`flex justify-center items-center ${className}`} {...props}>
      <Loader2 className={`animate-spin text-primary ${sizeStyle}`} />
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export { Spinner };
export default Spinner;
