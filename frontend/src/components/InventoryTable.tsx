import { useState } from 'react';
import { AlertTriangle, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { InventoryItem } from '../types/types';

interface InventoryTableProps {
  items: InventoryItem[];
  unitView: 'base' | 'alt';
  onDelete: (id: string) => void;
}

type SortKey = keyof InventoryItem | 'variance';

export function InventoryTable({ items, unitView, onDelete }: InventoryTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  const sortedItems = [...items].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aValue: any = a[sortConfig.key as keyof InventoryItem];
    let bValue: any = b[sortConfig.key as keyof InventoryItem];

    if (sortConfig.key === 'variance') {
      aValue = a.lastCheckVariance ?? 0;
      bValue = b.lastCheckVariance ?? 0;
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="text-[var(--color-text-muted)] opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-[var(--color-primary)]" /> : <ArrowDown size={14} className="text-[var(--color-primary)]" />;
  };

  return (
    <div className="overflow-x-auto bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 text-[var(--color-text-muted)] text-sm uppercase tracking-wider">
            <th className="px-6 py-4 cursor-pointer hover:bg-[var(--color-bg)] transition-colors font-semibold" onClick={() => requestSort('name')}>
              <div className="flex items-center gap-2">Name {getSortIcon('name')}</div>
            </th>
            <th className="px-6 py-4 cursor-pointer hover:bg-[var(--color-bg)] transition-colors font-semibold" onClick={() => requestSort('category')}>
              <div className="flex items-center gap-2">Category {getSortIcon('category')}</div>
            </th>
            <th className="px-6 py-4 cursor-pointer hover:bg-[var(--color-bg)] transition-colors font-semibold" onClick={() => requestSort('currentStock')}>
              <div className="flex items-center gap-2">Stock {getSortIcon('currentStock')}</div>
            </th>
            <th className="px-6 py-4 cursor-pointer hover:bg-[var(--color-bg)] transition-colors font-semibold" onClick={() => requestSort('variance')}>
              <div className="flex items-center gap-2">Last Variance {getSortIcon('variance')}</div>
            </th>
            <th className="px-6 py-4 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {sortedItems.map((item) => {
            const isLowStock = item.category !== 'selling_unit' && item.currentStock <= item.minThreshold;

            const isWeightView = unitView === 'alt';
            const primaryIsWeight = ['kg', 'liter', 'g', 'l'].includes(item.unit.toLowerCase());
            
            let displayUnit: string = item.unit;
            let rawDisplayStock = item.currentStock;

            if (isWeightView) {
              if (!primaryIsWeight && item.altUnit && item.altUnitFactor) {
                displayUnit = item.altUnit;
                rawDisplayStock = item.currentStock * item.altUnitFactor;
              }
            } else {
              if (primaryIsWeight && item.altUnit && item.altUnitFactor) {
                displayUnit = item.altUnit;
                rawDisplayStock = item.currentStock / item.altUnitFactor;
              }
            }
            
            const displayStock = (displayUnit === 'kg' || displayUnit === 'liter')
              ? Number(rawDisplayStock.toFixed(3))
              : Math.round(rawDisplayStock);

            const displayCategory = item.category === 'selling_unit' ? 'Selling Unit' : item.category;

            return (
              <tr key={item.id} className="hover:bg-[var(--color-bg)]/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--color-text-main)]">{item.name}</span>
                    {isLowStock && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        <AlertTriangle size={10} /> Low
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
                    {item.id}
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <span className="capitalize text-sm text-[var(--color-text-muted)]">{displayCategory}</span>
                </td>

                <td className="px-6 py-4">
                  {item.category === 'selling_unit' ? (
                    <span className="text-sm font-medium text-[var(--color-text-muted)] italic">Recipe</span>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-bold font-mono tracking-tight ${isLowStock ? 'text-red-400' : 'text-[var(--color-text-main)]'}`}>
                          {displayStock}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] font-medium">
                          {displayUnit}
                        </span>
                      </div>
                      <div className="w-24 h-1 bg-[var(--color-border)] rounded-full overflow-hidden mt-1.5">
                        <div 
                          className={`h-full transition-all duration-500 ${isLowStock ? 'bg-red-500' : 'bg-[var(--color-primary)]'}`}
                          style={{ width: `${Math.min(100, (item.currentStock / Math.max(1, item.minThreshold * 2)) * 100)}%` }}
                        />
                      </div>
                    </>
                  )}
                </td>

                <td className="px-6 py-4">
                  {item.lastCheckVariance !== undefined ? (
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`inline-flex w-fit text-xs font-medium px-2 py-0.5 rounded-md ${
                          item.lastCheckVariance < 0
                            ? 'bg-red-400/10 text-red-400'
                            : item.lastCheckVariance > 0
                            ? 'bg-emerald-400/10 text-emerald-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
                        {item.lastCheckVariance > 0 ? '+' : ''}
                        {item.lastCheckVariance} var.
                      </span>
                      {item.lastCheckDate && (
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {new Date(item.lastCheckDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--color-text-muted)] opacity-50">-</span>
                  )}
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-4">
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
                          onDelete(item.id);
                        }
                      }}
                      className="text-[var(--color-text-muted)] hover:text-red-400 p-2 rounded-md hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


