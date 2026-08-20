import { useState } from 'react';
import type { InventoryItem, ItemCategory } from '../types/types';

interface InventoryCheckProps {
  items: InventoryItem[];
  onSubmit: (updates: { id: string; actual: number }[]) => void;
  isSubmitting: boolean;
}

const CATEGORIES: ItemCategory[] = ['fish', 'drinks', 'sauces', 'breads'];

export function InventoryCheck({ items, onSubmit, isSubmitting }: InventoryCheckProps) {
  // Store the user's actual quantity inputs mapped by item ID
  const [actualQuantities, setActualQuantities] = useState<Record<string, number>>({});

  const handleInputChange = (id: string, value: string) => {
    if (value === '') {
      const newQuantities = { ...actualQuantities };
      delete newQuantities[id];
      setActualQuantities(newQuantities);
      return;
    }
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      setActualQuantities({ ...actualQuantities, [id]: num });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: { id: string; actual: number }[] = [];
    
    for (const [id, actualQty] of Object.entries(actualQuantities)) {
      const item = items.find((i) => i.id === id);
      if (item && item.currentStock !== actualQty) {
        updates.push({ id, actual: actualQty });
      }
    }

    if (updates.length > 0) {
      onSubmit(updates);
    }
  };

  const groupedItems = CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  }));

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[var(--color-text-main)] mb-2">Inventory Check</h2>
        <p className="text-[var(--color-text-muted)]">
          Enter the actual quantities you see in the physical inventory. Leave blank if unchanged.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {groupedItems.map(({ category, items }) => {
          if (items.length === 0) return null;
          return (
            <div key={category} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[var(--color-bg)] px-6 py-4 border-b border-[var(--color-border)]">
                <h3 className="text-lg font-bold capitalize text-[var(--color-text-main)]">{category}</h3>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-bg)]/50 transition-colors">
                    <div>
                      <h4 className="font-medium text-[var(--color-text-main)]">{item.name}</h4>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">Current: {item.currentStock} {item.unit}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[var(--color-text-muted)]">Actual:</span>
                      <input
                        type="number"
                        min="0"
                        placeholder={item.currentStock.toString()}
                        value={actualQuantities[item.id] !== undefined ? actualQuantities[item.id] : ''}
                        onChange={(e) => handleInputChange(item.id, e.target.value)}
                        className="w-24 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-right"
                      />
                      <span className="text-sm text-[var(--color-text-muted)] w-10">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="sticky bottom-0 bg-[var(--color-bg)]/90 backdrop-blur-md py-4 border-t border-[var(--color-border)] flex justify-end px-6 rounded-t-xl mt-8">
          <button
            type="submit"
            disabled={isSubmitting || Object.keys(actualQuantities).length === 0}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-8 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Updating Inventory...' : 'Confirm Inventory Check'}
          </button>
        </div>
      </form>
    </div>
  );
}
