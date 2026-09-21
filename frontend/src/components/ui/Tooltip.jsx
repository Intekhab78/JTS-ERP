import React, { useState } from 'react';

const Tooltip = ({ 
  children, 
  content,
  position = 'top',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div 
          role="tooltip"
          className={`absolute z-50 px-2.5 py-1.5 text-xs font-medium text-primary-foreground bg-foreground rounded-md shadow-sm whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 ${positions[position]} ${className}`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export { Tooltip };
export default Tooltip;
