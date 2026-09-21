import React, { useId } from 'react';

const FormField = ({ 
  label, 
  error, 
  helperText, 
  required, 
  children,
  className = ''
}) => {
  const generatedId = useId();
  const inputId = children?.props?.id || children?.props?.name || generatedId;

  return (
    <div className={`flex flex-col mb-5 w-full ${className}`}>
      {label && (
        <label className="text-sm font-medium text-foreground mb-1.5" htmlFor={inputId}>
          {label} {required && <span className="text-error" aria-hidden="true">*</span>}
        </label>
      )}
      
      {/* Clone the child to inject ARIA attributes and IDs */}
      {React.isValidElement(children) ? React.cloneElement(children, {
        id: inputId,
        'aria-invalid': !!error,
        'aria-describedby': error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined,
      }) : children}

      {error && (
        <span id={`${inputId}-error`} className="text-error text-xs mt-1.5 font-medium" role="alert">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span id={`${inputId}-helper`} className="text-muted-foreground text-xs mt-1.5">
          {helperText}
        </span>
      )}
    </div>
  );
};

export { FormField };
export default FormField;
