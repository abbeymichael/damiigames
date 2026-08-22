"use client";

import React from "react";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

export interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  mobileCardRender?: (row: T) => React.ReactNode;
}

export function AdminTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No records found.",
  mobileCardRender,
}: AdminTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-[#06261f]/50 rounded-2xl border border-[#114232]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#114232] bg-[#06261f]/80 backdrop-blur-sm">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#081c15] text-[#d6a735] uppercase font-semibold text-[10px] tracking-wider border-b border-[#114232]">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-4 py-3.5 ${col.className || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#114232]/50">
            {data.map((row, rowIdx) => (
              <tr
                key={`${keyExtractor(row)}-${rowIdx}`}
                className="hover:bg-[#081c15]/60 transition-colors"
              >
                {columns.map((col, idx) => (
                  <td key={idx} className={`px-4 py-3 ${col.className || ""}`}>
                    {col.cell
                      ? col.cell(row)
                      : col.accessorKey
                      ? String(row[col.accessorKey] ?? "")
                      : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Responsive Cards View */}
      <div className="block md:hidden space-y-3">
        {data.map((row, rowIdx) => (
          <div
            key={`${keyExtractor(row)}-${rowIdx}`}
            className="p-4 rounded-2xl border border-[#114232] bg-[#06261f] space-y-2 shadow-md"
          >
            {mobileCardRender ? (
              mobileCardRender(row)
            ) : (
              <div className="space-y-1.5 text-xs text-slate-200">
                {columns.map((col, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-[#114232]/30 last:border-0">
                    <span className="text-[10px] uppercase font-medium text-[#d6a735]">
                      {col.header}
                    </span>
                    <div>
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                        ? String(row[col.accessorKey] ?? "")
                        : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminTable;
