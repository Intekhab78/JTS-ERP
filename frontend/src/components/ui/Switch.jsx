import React, { forwardRef, useId } from 'react';

const Switch = forwardRef(({ 
  className = '', 
  label,
  name,
  disabled,
  checked,
  onChange,
  ...props 
}, ref) => {
  const generatedId = useId();
  const switchId = props.id || name || generatedId;

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (onChange && !disabled) {
        onChange({ target: { checked: !checked, name } });
      }
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-readonly={disabled}
        disabled={disabled}
        id={switchId}
        name={name}
        ref={ref}
        onClick={() => onChange && !disabled && onChange({ target: { checked: !checked, name } })}
        onKeyDown={handleKeyDown}
        className={`peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-input'} ${className}`}
        {...props}
      >
        <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
      {label && (
        <label
          htmlFor={switchId}
          className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => onChange && !disabled && onChange({ target: { checked: !checked, name } })}
        >
          {label}
        </label>
      )}
    </div>
  );
});

Switch.displayName = 'Switch';
export { Switch };
export default Switch;
