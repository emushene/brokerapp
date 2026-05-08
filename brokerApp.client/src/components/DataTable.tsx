import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface Action<T> {
  icon: React.ReactNode;
  label: string;
  onClick: (item: T) => void;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  actions?: Action<T>[];
  pageSize?: number;
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  loading = false,
  searchPlaceholder = "Search...",
  actions = [],
  pageSize = 10,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Search logic
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter((item) => {
      return Object.values(item).some((val) => 
        String(val).toLowerCase().includes(lowerSearch)
      );
    });
  }, [data, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Reset to page 1 on search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={handleSearch}
          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      {/* Table Container */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                {columns.map((col, i) => (
                  <th key={i} className={`px-4 py-3 ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
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
                          {actions.map((action, i) => (
                            <button
                              key={i}
                              onClick={() => action.onClick(item)}
                              className={`p-1.5 rounded-lg transition-all hover:bg-slate-700 ${action.className || 'text-slate-400 hover:text-white'}`}
                              title={action.label}
                            >
                              {action.icon}
                            </button>
                          ))}
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
              Showing <span className="text-slate-300">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-slate-300">{Math.min(currentPage * pageSize, filteredData.length)}</span> of <span className="text-slate-300">{filteredData.length}</span> entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
