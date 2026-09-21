import React from 'react';

const Badge = ({ 
  children, 
  variant = 'default',
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-error text-error-foreground",
    success: "border-transparent bg-success text-success-foreground",
    warning: "border-transparent bg-warning text-warning-foreground",
    info: "border-transparent bg-info text-info-foreground",
    outline: "text-foreground border-border",
  };
  
  const variantStyle = variants[variant] || variants.default;

  return (
    <div className={`${baseStyles} ${variantStyle} ${className}`} {...props}>
      {children}
    </div>
  );
};

export { Badge };
export default Badge;
