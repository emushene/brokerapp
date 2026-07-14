import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, ArrowUp, ArrowDown, ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  sortable?: boolean;
  sortAccessor?: (item: T) => string | number | boolean;
}

interface Action<T> {
  icon: React.ReactNode | ((item: T) => React.ReactNode);
  label: string | ((item: T) => string);
  onClick: (item: T) => void;
  className?: string | ((item: T) => string);
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  actions?: Action<T>[];
  pageSize?: number;
  filterElement?: React.ReactNode;
  onSearch?: (term: string) => void;
  // Server-side pagination support
  serverSide?: boolean;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  loading = false,
  searchPlaceholder = "Search...",
  actions = [],
  pageSize = 10,
  filterElement,
  onSearch,
  serverSide = false,
  totalItems = 0,
  currentPage: externalCurrentPage = 1,
  onPageChange,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: number, direction: 'asc' | 'desc' } | null>(null);

  const currentPage = serverSide ? externalCurrentPage : internalCurrentPage;
  const setCurrentPage = (page: number) => {
    if (serverSide) {
      onPageChange?.(page);
    } else {
      setInternalCurrentPage(page);
    }
  };

  // Search logic
  const searchedData = useMemo(() => {
    if (serverSide || onSearch || !searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    
    return data.filter((item) => {
      // 1. Search in raw object values (original behavior)
      const matchesRaw = Object.values(item).some((val) => 
        val !== null && val !== undefined && String(val).toLowerCase().includes(lowerSearch)
      );
      if (matchesRaw) return true;

      // 2. Search in sortAccessor results (new behavior - enables searching calculated fields)
      const matchesCalculated = columns.some((col) => {
        if (col.sortAccessor) {
          const val = col.sortAccessor(item);
          return val !== null && val !== undefined && String(val).toLowerCase().includes(lowerSearch);
        }
        return false;
      });
      
      return matchesCalculated;
    });
  }, [data, searchTerm, columns, serverSide, onSearch]);

  // Sort logic
  const sortedData = useMemo(() => {
    if (serverSide) return searchedData;
    if (!sortConfig) return searchedData;

    const column = columns[sortConfig.key];
    const sorted = [...searchedData].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (column.sortAccessor) {
        valA = column.sortAccessor(a);
        valB = column.sortAccessor(b);
      } else if (typeof column.accessor === 'string') {
        valA = a[column.accessor];
        valB = b[column.accessor];
      } else {
        return 0; // Cannot sort by function accessor without sortAccessor
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const result = valA < valB ? -1 : 1;
      return sortConfig.direction === 'asc' ? result : -result;
    });

    return sorted;
  }, [searchedData, sortConfig, columns, serverSide]);

  // Pagination logic
  const totalPages = serverSide 
    ? Math.ceil(totalItems / pageSize) 
    : Math.ceil(sortedData.length / pageSize);

  const currentData = useMemo(() => {
    if (serverSide) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, serverSide]);

  // Reset to page 1 on search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setCurrentPage(1);
    if (onSearch) {
      onSearch(term);
    }
  };

  const requestSort = (index: number) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === index && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: index, direction });
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearch}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        {filterElement}
      </div>

      {/* Table Container */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                {columns.map((col, i) => {
                  const isSortable = col.sortable || typeof col.accessor === 'string' || col.sortAccessor;
                  const isSorted = sortConfig?.key === i;
                  
                  return (
                    <th 
                      key={i} 
                      className={`px-4 py-3 ${col.className || ''} ${isSortable ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                      onClick={() => isSortable && requestSort(i)}
                    >
                      <div className="flex items-center gap-1">
                        {col.header}
                        {isSortable && (
                          <div className="flex flex-col text-slate-600">
                            {isSorted ? (
                              sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                            ) : (
                              <div className="flex flex-col -space-y-1 opacity-20">
                                <ChevronUp className="w-2.5 h-2.5" />
                                <ChevronDown className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
                {actions.length > 0 && <th className="px-4 py-3 text-right w-24">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="px-4 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      Loading records...
                    </div>
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="px-4 py-8 text-center text-slate-500 text-sm italic">
                    No records found.
                  </td>
                </tr>
              ) : (
                currentData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/20 transition-colors group">
                    {columns.map((col, i) => (
                      <td key={i} className={`px-4 py-2.5 text-sm ${col.className || ''}`}>
                        {typeof col.accessor === 'function' 
                          ? col.accessor(item) 
                          : String(item[col.accessor] || '')}
                      </td>
                    ))}
                    {actions.length > 0 && (
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          {actions.map((action, i) => {
                            const icon = typeof action.icon === 'function' ? action.icon(item) : action.icon;
                            const label = typeof action.label === 'function' ? action.label(item) : action.label;
                            const className = typeof action.className === 'function' ? action.className(item) : action.className;
                            
                            return (
                              <button
                                key={i}
                                onClick={() => action.onClick(item)}
                                className={`p-1.5 rounded-lg transition-all hover:bg-slate-700 ${className || 'text-slate-400 hover:text-white'}`}
                                title={label}
                              >
                                {icon}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-slate-900/30 px-4 py-3 border-t border-slate-700/50 flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="text-slate-300">
                {serverSide ? (totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1) : (sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1)}
              </span> to <span className="text-slate-300">
                {serverSide ? Math.min(currentPage * pageSize, totalItems) : Math.min(currentPage * pageSize, sortedData.length)}
              </span> of <span className="text-slate-300">
                {serverSide ? totalItems : sortedData.length}
              </span> entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 px-2">
                <span className="text-xs font-bold text-blue-500">{currentPage}</span>
                <span className="text-xs text-slate-600">/</span>
                <span className="text-xs font-medium text-slate-500">{totalPages}</span>
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
