import React, { forwardRef, useId } from 'react';

const Textarea = forwardRef(({ 
  className = '', 
  error,
  label, // Legacy wrapper support
  required,
  name,
  helperText,
  disabled,
  rows = 3,
  ...props 
}, ref) => {
  const generatedId = useId();
  const textareaId = props.id || name || generatedId;

  const baseTextarea = (
    <textarea
      ref={ref}
      id={textareaId}
      name={name}
      disabled={disabled}
      required={required}
      rows={rows}
      aria-invalid={!!error}
      aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
      className={`flex min-h-[80px] w-full rounded-md border ${error ? 'border-error focus-visible:ring-error' : 'border-input focus-visible:ring-ring'} bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );

  if (label) {
    return (
      <div className="flex flex-col mb-4 w-full">
        <label className="text-sm font-medium text-foreground mb-1.5" htmlFor={textareaId}>
          {label} {required && <span className="text-error" aria-hidden="true">*</span>}
        </label>
        {baseTextarea}
        {error && <span id={`${textareaId}-error`} className="text-error text-xs mt-1.5" role="alert">{error}</span>}
        {helperText && !error && <span id={`${textareaId}-helper`} className="text-muted-foreground text-xs mt-1.5">{helperText}</span>}
      </div>
    );
  }

  return baseTextarea;
});

Textarea.displayName = 'Textarea';
export { Textarea };
export default Textarea;
