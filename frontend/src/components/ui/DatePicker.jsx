import React, { forwardRef, useId } from 'react';
import { Calendar } from 'lucide-react';
import { Input } from './Input';

// A simple accessible wrapper around native date input for Phase 2 foundation
const DatePicker = forwardRef(({ 
  className = '',
  error,
  label, // Legacy support
  required,
  name,
  helperText,
  disabled,
  ...props 
}, ref) => {
  return (
    <Input
      ref={ref}
      type="date"
      name={name}
      label={label}
      error={error}
      required={required}
      helperText={helperText}
      disabled={disabled}
      className={`[&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:hover:opacity-100 ${className}`}
      {...props}
    />
  );
});

DatePicker.displayName = 'DatePicker';
export { DatePicker };
export default DatePicker;
