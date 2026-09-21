import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/Button';

const Pagination = ({ 
  currentPage = 1, 
  totalPages = 1, 
  onPageChange,
  className = ''
}) => {
  if (totalPages <= 1) return null;

  const renderPageNumbers = () => {
    const pages = [];
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, currentPage + 1);

    if (currentPage <= 2) {
      endPage = Math.min(totalPages, 3);
    }
    if (currentPage >= totalPages - 1) {
      startPage = Math.max(1, totalPages - 2);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={currentPage === i ? 'outline' : 'ghost'}
          size="icon"
          onClick={() => onPageChange(i)}
          aria-current={currentPage === i ? "page" : undefined}
          className="h-8 w-8"
        >
          {i}
        </Button>
      );
    }
    return pages;
  };

  return (
    <nav role="navigation" aria-label="pagination" className={`mx-auto flex w-full justify-center ${className}`}>
      <ul className="flex flex-row items-center gap-1">
        <li>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onPageChange(currentPage - 1)} 
            disabled={currentPage === 1}
            className="gap-1 pl-2.5"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
        </li>
        
        {currentPage > 2 && (
          <>
            <li>
              <Button variant="ghost" size="icon" onClick={() => onPageChange(1)} className="h-8 w-8">1</Button>
            </li>
            {currentPage > 3 && (
              <li>
                <span className="flex h-9 w-9 items-center justify-center">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More pages</span>
                </span>
              </li>
            )}
          </>
        )}

        {renderPageNumbers()}

        {currentPage < totalPages - 1 && (
          <>
            {currentPage < totalPages - 2 && (
              <li>
                <span className="flex h-9 w-9 items-center justify-center">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More pages</span>
                </span>
              </li>
            )}
            <li>
              <Button variant="ghost" size="icon" onClick={() => onPageChange(totalPages)} className="h-8 w-8">{totalPages}</Button>
            </li>
          </>
        )}
        
        <li>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onPageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="gap-1 pr-2.5"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </li>
      </ul>
    </nav>
  );
};

export { Pagination };
export default Pagination;
