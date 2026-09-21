import React, { forwardRef, useId } from 'react';

const Input = forwardRef(({ 
  className = '', 
  type = 'text',
  error,
  label, // Legacy support
  required, // Legacy support
  name,
  helperText,
  prefixIcon,
  suffixIcon,
  disabled,
  ...props 
}, ref) => {
  const generatedId = useId();
  const inputId = props.id || generatedId;

  const baseInput = (
    <div className="relative flex items-center w-full">
      {prefixIcon && (
        <span className="absolute left-3 text-muted-foreground flex items-center justify-center pointer-events-none">
          {prefixIcon}
        </span>
      )}
      <input
        type={type}
        ref={ref}
        id={inputId}
        name={name}
        disabled={disabled}
        required={required}
        autoComplete={props.autoComplete || "off"}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        className={`flex h-10 w-full rounded-md border ${error ? 'border-error focus-visible:ring-error' : 'border-input focus-visible:ring-ring'} bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${prefixIcon ? 'pl-10' : ''} ${suffixIcon ? 'pr-10' : ''} ${className}`}
        {...props}
      />
      {suffixIcon && (
        <span className="absolute right-3 text-muted-foreground flex items-center justify-center pointer-events-none">
          {suffixIcon}
        </span>
      )}
    </div>
  );

  // Backward compatibility: If label is provided, wrap in a div like the old component
  if (label) {
    return (
      <div className="flex flex-col mb-4 w-full">
        <label className="text-sm font-medium text-foreground mb-1.5" htmlFor={inputId}>
          {label} {required && <span className="text-error" aria-hidden="true">*</span>}
        </label>
        {baseInput}
        {error && <span id={`${inputId}-error`} className="text-error text-xs mt-1.5" role="alert">{error}</span>}
        {helperText && !error && <span id={`${inputId}-helper`} className="text-muted-foreground text-xs mt-1.5">{helperText}</span>}
      </div>
    );
  }

  return baseInput;
});

Input.displayName = 'Input';
export { Input };
export default Input;
