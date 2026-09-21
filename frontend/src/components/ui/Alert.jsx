import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const Alert = ({ 
  title,
  children, 
  variant = 'default',
  className = '',
  ...props 
}) => {
  const baseStyles = "relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:text-foreground [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11";
  
  const variants = {
    default: "bg-background text-foreground border-border",
    destructive: "border-error/50 text-error [&>svg]:text-error bg-error/10",
    success: "border-success/50 text-success [&>svg]:text-success bg-success/10",
    warning: "border-warning/50 text-warning-foreground [&>svg]:text-warning-foreground bg-warning/10",
    info: "border-info/50 text-info-foreground [&>svg]:text-info-foreground bg-info/10",
  };
  
  const icons = {
    default: null,
    destructive: <AlertCircle className="h-5 w-5" />,
    success: <CheckCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  const variantStyle = variants[variant] || variants.default;

  return (
    <div role="alert" className={`${baseStyles} ${variantStyle} ${className}`} {...props}>
      {icons[variant] || icons.default}
      <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>
      <div className="text-sm opacity-90">
        {children}
      </div>
    </div>
  );
};

export { Alert };
export default Alert;
