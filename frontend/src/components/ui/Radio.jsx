import React, { forwardRef, useId } from 'react';

const Radio = forwardRef(({ 
  className = '', 
  label,
  name,
  disabled,
  ...props 
}, ref) => {
  const generatedId = useId();
  const radioId = props.id || name || generatedId;

  return (
    <div className="flex items-center space-x-2">
      <input
        type="radio"
        ref={ref}
        id={radioId}
        name={name}
        disabled={disabled}
        className={`h-4 w-4 shrink-0 rounded-full border border-primary text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 accent-primary ${className}`}
        {...props}
      />
      {label && (
        <label
          htmlFor={radioId}
          className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {label}
        </label>
      )}
    </div>
  );
});

Radio.displayName = 'Radio';
export { Radio };
export default Radio;
