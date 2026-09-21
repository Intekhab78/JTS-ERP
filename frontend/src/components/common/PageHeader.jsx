import React from 'react';

const PageHeader = ({ 
  title, 
  description, 
  breadcrumbs, 
  actions,
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex flex-col gap-1.5">
        {breadcrumbs && (
          <div className="mb-2">
            {breadcrumbs}
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-col sm:flex-row gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export { PageHeader };
export default PageHeader;
