import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ 
  title = "No results found", 
  description = "We couldn't find anything matching your criteria.", 
  icon,
  action,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center animate-in fade-in ${className}`}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4 text-muted-foreground">
        {icon ? (
          React.isValidElement(icon) ? icon : React.createElement(icon, { className: "h-10 w-10 opacity-70" })
        ) : (
          <Inbox className="h-10 w-10 opacity-70" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 mb-6 text-sm text-muted-foreground max-w-sm">
        {description}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
};

export { EmptyState };
export default EmptyState;
