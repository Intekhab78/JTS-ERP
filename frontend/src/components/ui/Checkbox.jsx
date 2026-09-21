import React, { forwardRef, useId } from 'react';

const Checkbox = forwardRef(({ 
  className = '', 
  label,
  error,
  name,
  disabled,
  ...props 
}, ref) => {
  const generatedId = useId();
  const checkboxId = props.id || name || generatedId;

  return (
    <div className="flex items-start space-x-2">
      <input
        type="checkbox"
        ref={ref}
        id={checkboxId}
        name={name}
        disabled={disabled}
        aria-invalid={!!error}
        className={`h-4 w-4 shrink-0 rounded border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 accent-primary ${className}`}
        {...props}
      />
      {label && (
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor={checkboxId}
            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {label}
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
        </div>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
export { Checkbox };
export default Checkbox;
