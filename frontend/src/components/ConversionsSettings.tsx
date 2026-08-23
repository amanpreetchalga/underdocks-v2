import { useState } from 'react';
import { useItems, useUpdateItem } from '../api/inventory';
import { Settings, Save, AlertCircle, RotateCcw } from 'lucide-react';
import type { InventoryItem } from '../types/types';

export function ConversionsSettings() {
  const { data: items, isLoading, error } = useItems();
  const updateItem = useUpdateItem();
  
  // Local state for the "example box weight" for each item ID
  const [exampleWeights, setExampleWeights] = useState<Record<string, number>>({});
  
  // Local state for tracking edited factors/units before saving
  const [edits, setEdits] = useState<Record<string, { unit: string; altUnitFactor: number | null }>>({});

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p>Loading items...</p>
      </div>
    );
  }

  if (error || !items) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center text-red-400 mt-8">
        <p className="font-semibold mb-1">Failed to load items</p>
      </div>
    );
  }

  const handleEditChange = (id: string, field: 'unit' | 'altUnitFactor', value: string | number | null) => {
    setEdits(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const initEdit = (item: InventoryItem) => {
    if (!edits[item.id]) {
      setEdits(prev => ({
        ...prev,
        [item.id]: {
          unit: item.unit,
          altUnitFactor: item.altUnitFactor || null
        }
      }));
    }
  };

  const handleSave = async (id: string) => {
    const edit = edits[id];
    if (!edit) return;
    
    try {
      await updateItem.mutateAsync({
        id,
        data: {
          unit: edit.unit as 'kg' | 'piece' | 'liter',
          altUnitFactor: edit.altUnitFactor === null ? undefined : edit.altUnitFactor
        }
      });
      // Clear edit state to show saved value
      const newEdits = { ...edits };
      delete newEdits[id];
      setEdits(newEdits);
    } catch (err) {
      alert('Failed to update item settings.');
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <h2 className="text-xl font-bold text-[var(--color-text-main)] flex items-center gap-2">
            <Settings className="text-[var(--color-primary)]" /> Unit Conversions & Settings
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
          Manage how the system translates receipt weights into base units for each item. 
          Use the "Example 1 Box" calculator to test out your conversion factor and ensure it's mathematically correct.
        </p>

        <div className="grid gap-4">
          {items.map(item => {
            const isEditing = !!edits[item.id];
            const currentUnit = isEditing ? edits[item.id].unit : item.unit;
            const currentAltUnit = item.altUnit || 'kg';
            const currentFactor = isEditing ? edits[item.id].altUnitFactor : (item.altUnitFactor || null);
            
            const primaryIsWeight = ['kg', 'liter', 'g', 'l'].includes(currentUnit.toLowerCase());
            const weightUnitStr = primaryIsWeight ? currentUnit : currentAltUnit;
            const piecesUnitStr = primaryIsWeight ? currentAltUnit : currentUnit;
            
            const inputPieces = exampleWeights[item.id] ?? 100;
            const computedWeightOut = currentFactor ? (inputPieces * currentFactor) : 0;
            
            return (
              <div key={item.id} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-5 flex flex-col md:flex-row gap-6 hover:border-[var(--color-primary)]/30 transition-colors">
                
                {/* Info & Inputs */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-[var(--color-text-main)]">{item.name}</h3>
                    <p className="text-xs text-[var(--color-text-muted)] font-mono">{item.id} • Base Unit: {item.unit}</p>
                  </div>

                  <div className="flex flex-wrap gap-4 items-end">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Base Unit</label>
                      <select
                        value={currentUnit}
                        onFocus={() => initEdit(item)}
                        onChange={(e) => handleEditChange(item.id, 'unit', e.target.value)}
                        className="w-32 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                      >
                        <option value="piece">Piece</option>
                        <option value="kg">kg</option>
                        <option value="liter">Liter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Weight of 1 piece</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={currentFactor === null ? '' : currentFactor}
                        onFocus={() => initEdit(item)}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          handleEditChange(item.id, 'altUnitFactor', val);
                        }}
                        placeholder="e.g. 0.025"
                        className="w-40 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] font-mono"
                      />
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => handleSave(item.id)}
                        disabled={updateItem.isPending}
                        className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition-colors h-[34px]"
                      >
                        <Save size={16} /> Save
                      </button>
                    )}
                  </div>
                </div>

                {/* Example Calculator */}
                <div className="w-full md:w-72 bg-[var(--color-bg-card)] rounded-lg p-4 border border-[var(--color-border)]/50 shadow-inner">
                  <div className="text-sm font-semibold text-[var(--color-text-main)] mb-3 border-b border-[var(--color-border)] pb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-[var(--color-text-muted)]" /> Example 1 Box
                  </div>
                  
                  {!currentFactor || !currentAltUnit ? (
                    <p className="text-xs text-[var(--color-text-muted)] italic py-2">Set a weight unit and factor to see an example.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[var(--color-text-muted)] font-medium">If 1 box has:</span>
                        <div className="flex items-center bg-[var(--color-bg)] border border-[var(--color-border)] rounded overflow-hidden">
                          <input 
                            type="number" 
                            value={inputPieces}
                            onChange={(e) => setExampleWeights(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                            className="w-16 bg-transparent px-2 py-1 text-sm text-[var(--color-text-main)] outline-none text-right font-mono focus:bg-[var(--color-bg-card)]"
                          />
                          <span className="px-2 py-1 text-xs font-bold text-[var(--color-text-muted)] bg-[var(--color-bg-card)] border-l border-[var(--color-border)] truncate max-w-[80px]">
                            {piecesUnitStr || 'Pieces'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between bg-[var(--color-primary)]/10 px-3 py-2.5 rounded border border-[var(--color-primary)]/20">
                        <span className="text-xs font-medium text-[var(--color-text-main)]">Translates to:</span>
                        <div className="text-right">
                          <span className="font-bold text-[var(--color-primary)] font-mono text-lg leading-none">{computedWeightOut.toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
                          <span className="text-xs font-bold text-[var(--color-primary)]/80 ml-1">{weightUnitStr || 'kg'}</span>
                        </div>
                      </div>
                      </div>
                    </div>
                  )}
                </div>
                
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
