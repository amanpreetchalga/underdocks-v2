import { AlertTriangle, Trash2 } from 'lucide-react';
import type { InventoryItem } from '../types/types';

interface InventoryCardProps {
  item: InventoryItem;
  unitView: 'base' | 'alt';
  onDelete: (id: string) => void;
}

export function InventoryCard({ item, unitView, onDelete }: InventoryCardProps) {
  const isLowStock = item.currentStock <= item.minThreshold;

  const isWeightView = unitView === 'alt';
  const primaryIsWeight = ['kg', 'liter', 'g', 'l'].includes(item.unit.toLowerCase());
  
  let displayUnit: string = item.unit;
  let rawDisplayStock = item.currentStock;
  let displayVariance = item.lastCheckVariance;

  if (isWeightView) {
    if (!primaryIsWeight && item.altUnit && item.altUnitFactor) {
      displayUnit = item.altUnit;
      rawDisplayStock = item.currentStock * item.altUnitFactor;
      if (displayVariance !== undefined) displayVariance = displayVariance * item.altUnitFactor;
    }
  } else {
    if (primaryIsWeight && item.altUnit && item.altUnitFactor) {
      displayUnit = item.altUnit;
      rawDisplayStock = item.currentStock / item.altUnitFactor;
      if (displayVariance !== undefined) displayVariance = displayVariance / item.altUnitFactor;
    }
  }

  const displayStock = (displayUnit === 'kg' || displayUnit === 'liter')
    ? Number(rawDisplayStock.toFixed(3))
    : Math.round(rawDisplayStock);
    
  const formattedVariance = displayVariance !== undefined 
    ? (displayUnit === 'kg' || displayUnit === 'liter' ? Number(displayVariance.toFixed(3)) : Math.round(displayVariance))
    : undefined;



  return (
    <div
      className={`group relative bg-[var(--color-bg-card)] border rounded-xl p-5 transition-all hover:shadow-lg ${
        isLowStock
          ? 'border-red-500/50 shadow-red-500/10'
          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] m-0 leading-tight">
              {item.name}
            </h3>
            {isLowStock && (
              <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-400/10 px-2 py-0.5 rounded-md">
                <AlertTriangle size={12} /> Low Stock
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span className="uppercase text-xs font-mono bg-[var(--color-bg)] px-1.5 py-0.5 rounded">
              {item.id}
            </span>
            <span>•</span>
            <span className="capitalize">{item.category}</span>
          </div>
        </div>
        
        <button
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
              onDelete(item.id);
            }
          }}
          className="text-[var(--color-text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-400/10"
          title="Delete Item"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex items-end justify-between mt-6">
        <div>
          <p className="text-sm text-[var(--color-text-muted)] mb-1">Current Stock</p>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-3xl font-bold font-mono tracking-tight ${
                isLowStock ? 'text-red-400' : 'text-[var(--color-text-main)]'
              }`}
            >
              {displayStock}
            </span>
            <span className="text-sm text-[var(--color-text-muted)] font-medium">
              {displayUnit}
            </span>
          </div>
          {item.lastCheckVariance !== undefined && (
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  item.lastCheckVariance < 0
                    ? 'bg-red-400/10 text-red-400'
                    : item.lastCheckVariance > 0
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : 'bg-gray-500/10 text-gray-400'
                }`}
              >
                {formattedVariance! > 0 ? '+' : ''}
                {formattedVariance} {displayUnit} var.
              </span>
              {item.lastCheckDate && (
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {new Date(item.lastCheckDate).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 h-1 bg-[var(--color-border)] w-full rounded-b-xl overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${isLowStock ? 'bg-red-500' : 'bg-[var(--color-primary)]'}`}
          style={{ width: `${Math.min(100, (item.currentStock / Math.max(1, item.minThreshold * 2)) * 100)}%` }}
        />
      </div>
    </div>
  );
}


