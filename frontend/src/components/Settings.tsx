import { useState } from 'react';
import { useItems, useUpdateItem, useSettings, useUpdateSettings } from '../api/inventory';
import { Settings as SettingsIcon, RotateCcw, Plus, Trash2, Edit } from 'lucide-react';
import type { InventoryItem } from '../types/types';

interface SettingsProps {
  onEditItem: (item: InventoryItem) => void;
}

export function Settings({ onEditItem }: SettingsProps) {
  const { data: items, isLoading: itemsLoading, error: itemsError } = useItems();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const updateItem = useUpdateItem();
  const updateSettings = useUpdateSettings();
  
  const [newCatValue, setNewCatValue] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');

  const isLoading = itemsLoading || settingsLoading;
  const error = itemsError;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p>Loading settings...</p>
      </div>
    );
  }

  if (error || !items || !settings) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center text-red-400 mt-8">
        <p className="font-semibold mb-1">Failed to load data</p>
      </div>
    );
  }

  const handleResetAllVariances = async () => {
    if (!confirm('Are you sure you want to reset all variances to zero? This will remove all variance tracking from the dashboard.')) return;
    
    try {
      const itemsWithVariance = items.filter(item => item.lastCheckVariance !== undefined);
      if (itemsWithVariance.length === 0) {
        alert('No variances to reset.');
        return;
      }
      await Promise.all(itemsWithVariance.map(item => 
        updateItem.mutateAsync({
          id: item.id,
          data: { resetVariance: true }
        })
      ));
      alert('All variances have been reset successfully!');
    } catch (err) {
      alert('Failed to reset some variances.');
    }
  };

  const handleAddCategory = () => {
    if (!newCatValue || !newCatLabel) return;
    const newCategories = [...settings.categories, { value: newCatValue.toLowerCase().replace(/\s+/g, '_'), label: newCatLabel }];
    updateSettings.mutate({ categories: newCategories });
    setNewCatValue('');
    setNewCatLabel('');
  };

  const handleRemoveCategory = (catValue: string) => {
    if (!confirm(`Are you sure you want to remove the category "${catValue}"? Items using this category might not display correctly.`)) return;
    const newCategories = settings.categories.filter(c => c.value !== catValue);
    updateSettings.mutate({ categories: newCategories });
  };

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <h2 className="text-xl font-bold text-[var(--color-text-main)] flex items-center gap-2">
            <SettingsIcon className="text-[var(--color-primary)]" /> System Settings
          </h2>
          <button
            onClick={handleResetAllVariances}
            disabled={updateItem.isPending}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RotateCcw size={16} /> Reset All Variances
          </button>
        </div>
        <p className="text-[var(--color-text-muted)] text-sm mb-6 max-w-3xl">
          Manage your system configurations, item categories, and quickly edit items.
        </p>

        {/* Categories Section */}
        <div className="mb-8">
          <h3 className="font-bold text-lg text-[var(--color-text-main)] mb-3">Item Categories</h3>
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {settings.categories.map(cat => (
                <div key={cat.value} className="flex items-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] px-3 py-1.5 rounded-full text-sm">
                  <span className="font-medium text-[var(--color-text-main)]">{cat.label}</span>
                  <button onClick={() => handleRemoveCategory(cat.value)} className="text-[var(--color-text-muted)] hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2 items-end max-w-md">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Display Label</label>
                <input
                  type="text"
                  value={newCatLabel}
                  onChange={e => {
                    setNewCatLabel(e.target.value);
                    if (!newCatValue) setNewCatValue(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                  }}
                  placeholder="e.g. 🥦 Vegetables"
                  className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Internal Value</label>
                <input
                  type="text"
                  value={newCatValue}
                  onChange={e => setNewCatValue(e.target.value)}
                  placeholder="e.g. vegetables"
                  className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>
              <button
                onClick={handleAddCategory}
                disabled={!newCatValue || !newCatLabel || updateSettings.isPending}
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-1.5 rounded-md text-sm font-medium h-[34px] flex items-center gap-2 disabled:opacity-50"
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div>
          <h3 className="font-bold text-lg text-[var(--color-text-main)] mb-3">All Items</h3>
          <div className="grid gap-3">
            {items.map(item => (
              <div key={item.id} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 flex items-center justify-between hover:border-[var(--color-primary)]/30 transition-colors">
                <div>
                  <h4 className="font-bold text-[var(--color-text-main)]">{item.name}</h4>
                  <p className="text-xs text-[var(--color-text-muted)] font-mono">
                    {item.category} • Base Unit: {item.unit}
                    {item.altUnitFactor ? ` • 1 Piece = ${item.altUnitFactor} ${item.unit}` : ''}
                    {item.altUnitFactor && (item.unit === 'kg' || item.unit === 'liter') ? 
                      ` • Current Stock: ${Number(item.currentStock.toFixed(3))} ${item.unit} (~${Math.round(item.currentStock / item.altUnitFactor)} pieces)` 
                      : ` • Current Stock: ${Number(item.currentStock.toFixed(3))} ${item.unit}`}
                  </p>
                </div>
                <button
                  onClick={() => onEditItem(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-bg-card)] hover:bg-[var(--color-primary)]/10 text-[var(--color-text-main)] hover:text-[var(--color-primary)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 rounded-lg text-sm font-medium transition-colors"
                >
                  <Edit size={14} /> Edit
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
