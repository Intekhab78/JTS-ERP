import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';

const DropdownMenu = ({ 
  trigger, 
  items, 
  align = 'right', 
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const alignments = {
    left: 'left-0',
    right: 'right-0',
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(!isOpen); }}
      >
        {trigger || (
          <button className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer">
            <MoreVertical className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className={`absolute z-50 mt-2 w-56 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-1.5 text-card-foreground shadow-xl shadow-black/8 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 ${alignments[align]}`} role="menu">
          {items.map((item, index) => {
            if (item.separator || item.type === 'divider') {
              return <div key={`sep-${index}`} className="-mx-1 my-1.5 h-px bg-border/60" role="separator" />;
            }
            return (
              <button
                key={index}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled && item.onClick) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                className={`relative flex w-full cursor-pointer select-none items-center rounded-xl px-2.5 py-2 text-xs font-semibold tracking-tight outline-none transition-all duration-150 focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-primary/10 hover:text-primary ${
                  item.danger ? '!text-rose-600 dark:!text-rose-400 !hover:bg-rose-500/10' : 'text-foreground'
                } ${item.disabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}`}
              >
                {item.icon && <span className="mr-2 h-4 w-4 shrink-0 flex items-center justify-center text-current">{item.icon}</span>}
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export { DropdownMenu };
export default DropdownMenu;
