import React from 'react';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './TableSkeleton';

const DataTable = ({ 
  columns, 
  data, 
  isLoading = false,
  emptyTitle = "No data found",
  emptyDescription = "There are no records to display.",
  onRowClick,
  className = ''
}) => {
  if (isLoading) {
    return <TableSkeleton columns={columns.length} rows={5} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border bg-background py-10">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={`w-full overflow-auto rounded-md border bg-background ${className}`}>
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            {columns.map((col, idx) => (
              <th 
                key={idx} 
                className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {data.map((row, rowIndex) => (
            <tr 
              key={row.id || rowIndex} 
              onClick={() => onRowClick && onRowClick(row)}
              className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={`p-4 align-middle ${col.className || ''}`}>
                  {col.cell ? col.cell(row) : row[col.accessorKey]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export { DataTable };
export default DataTable;
