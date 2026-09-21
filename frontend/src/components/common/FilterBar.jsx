import React from 'react';
import { SearchInput } from '../ui/SearchInput';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { FilterX } from 'lucide-react';

const FilterBar = ({ 
  onSearch, 
  searchPlaceholder = "Search...",
  filters = [], // Array of { name, options: [{label, value}], value, onChange }
  onClearFilters,
  className = ''
}) => {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 items-center w-full ${className}`}>
      {onSearch && (
        <div className="w-full sm:max-w-xs">
          <SearchInput 
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      )}
      
      {filters.length > 0 && (
        <div className="flex flex-1 flex-wrap gap-3 items-center justify-end w-full">
          {filters.map((filter, index) => (
            <div key={index} className="w-full sm:w-auto sm:min-w-[150px]">
              <Select
                value={filter.value || ''}
                onChange={(e) => filter.onChange(e.target.value)}
                aria-label={`Filter by ${filter.name}`}
              >
                <option value="">{`All ${filter.name}`}</option>
                {filter.options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
          ))}
          
          {onClearFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} leftIcon={<FilterX className="h-4 w-4" />} className="w-full sm:w-auto">
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export { FilterBar };
export default FilterBar;
