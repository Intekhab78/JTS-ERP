import React from 'react';

const Skeleton = ({ 
  className = '',
  ...props 
}) => {
  return (
    <div 
      className={`animate-pulse rounded-md bg-secondary ${className}`} 
      {...props}
    />
  );
};

export { Skeleton };
export default Skeleton;
