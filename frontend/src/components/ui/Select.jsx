import React, { forwardRef, useId } from 'react';

const Select = forwardRef(({ 
  className = '', 
  children,
  error,
  label, // Legacy wrapper support
  required,
  name,
  helperText,
  disabled,
  ...props 
}, ref) => {
  const generatedId = useId();
  const selectId = props.id || name || generatedId;

  const baseSelect = (
    <select
      ref={ref}
      id={selectId}
      name={name}
      disabled={disabled}
      required={required}
      aria-invalid={!!error}
      aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
      className={`flex h-10 w-full items-center justify-between rounded-md border ${error ? 'border-error focus-visible:ring-error' : 'border-input focus-visible:ring-ring'} bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  );

  if (label) {
    return (
      <div className="flex flex-col mb-4 w-full">
        <label className="text-sm font-medium text-foreground mb-1.5" htmlFor={selectId}>
          {label} {required && <span className="text-error" aria-hidden="true">*</span>}
        </label>
        {baseSelect}
        {error && <span id={`${selectId}-error`} className="text-error text-xs mt-1.5" role="alert">{error}</span>}
        {helperText && !error && <span id={`${selectId}-helper`} className="text-muted-foreground text-xs mt-1.5">{helperText}</span>}
      </div>
    );
  }

  return baseSelect;
});

Select.displayName = 'Select';
export { Select };
export default Select;
