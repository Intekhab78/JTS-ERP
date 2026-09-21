import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const Drawer = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  position = 'right',
  className = ''
}) => {
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (drawerRef.current) {
        drawerRef.current.focus();
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const positionStyles = {
    right: 'inset-y-0 right-0 h-full w-3/4 sm:max-w-sm border-l animate-slideInRight',
    left: 'inset-y-0 left-0 h-full w-3/4 sm:max-w-sm border-r animate-slideInLeft',
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div 
        ref={drawerRef}
        role="dialog" 
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex="-1"
        className={`fixed z-50 bg-background shadow-lg transition-transform duration-300 ease-in-out flex flex-col ${positionStyles[position]} ${className}`}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id="drawer-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export { Drawer };
export default Drawer;
