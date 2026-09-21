import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
// Assuming react-router-dom is used, though passing generic links is safer
// For this foundation, we'll accept an array of { label, href, icon }

const Breadcrumb = ({ 
  items = [], 
  className = ''
}) => {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <React.Fragment key={index}>
              <li className="inline-flex items-center gap-1.5">
                {isLast ? (
                  <span 
                    role="link" 
                    aria-disabled="true" 
                    aria-current="page"
                    className="font-normal text-foreground"
                  >
                    {item.icon && <span className="mr-1 inline-flex">{item.icon}</span>}
                    {item.label}
                  </span>
                ) : (
                  <a 
                    href={item.href || '#'} 
                    className="transition-colors hover:text-foreground"
                  >
                    {item.icon && <span className="mr-1 inline-flex">{item.icon}</span>}
                    {item.label}
                  </a>
                )}
              </li>
              {!isLast && (
                <li role="presentation" aria-hidden="true" className="[&>svg]:size-3.5">
                  <ChevronRight />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export { Breadcrumb };
export default Breadcrumb;
