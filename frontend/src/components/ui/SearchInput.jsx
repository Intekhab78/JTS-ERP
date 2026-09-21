import React, { forwardRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from './Input';

const SearchInput = forwardRef(({ 
  className = '',
  placeholder = "Search...",
  ...props 
}, ref) => {
  return (
    <Input
      ref={ref}
      type="search"
      placeholder={placeholder}
      prefixIcon={<Search className="h-4 w-4" />}
      className={className}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';
export { SearchInput };
export default SearchInput;
