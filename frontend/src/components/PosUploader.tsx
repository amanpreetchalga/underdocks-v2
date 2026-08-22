import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { UploadCloud, FileText, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Papa from 'papaparse';
import type { InventoryItem } from '../types/types';

interface PosUploaderProps {
  inventoryItems: InventoryItem[] | undefined;
  onConfirm: (items: PosParsedItem[]) => Promise<void>;
  isSubmitting: boolean;
  onCreateNewItem?: (defaultName: string) => void;
}

export interface PosParsedItem {
  id: string;
  originalName: string;
  quantity: number;
  priceStr: string;
  isValuable: boolean;
  itemId?: string; // matched inventory ID
  multiplier: number;
}

export function PosUploader({ inventoryItems, onConfirm, isSubmitting, onCreateNewItem }: PosUploaderProps) {
  const [parsedItems, setParsedItems] = useState<PosParsedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [reportDate, setReportDate] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Load saved preferences
  const [valuableMemory, setValuableMemory] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('underdocks_pos_valuable') || '{}'); } catch { return {}; }
  });
  const [matchMemory, setMatchMemory] = useState<Record<string, { id: string, multiplier: number }>>(() => {
    try { 
      const raw = JSON.parse(localStorage.getItem('underdocks_pos_matches') || '{}'); 
      const upgraded: Record<string, { id: string, multiplier: number }> = {};
      for (const [key, value] of Object.entries(raw)) {
        if (typeof value === 'string') {
          upgraded[key] = { id: value as string, multiplier: 1 };
        } else if (value && typeof value === 'object' && 'id' in (value as any)) {
          upgraded[key] = value as { id: string, multiplier: number };
        }
      }
      return upgraded;
    } catch { return {}; }
  });

  // Auto-match newly created inventory items if their name perfectly matches
  useEffect(() => {
    if (inventoryItems && parsedItems) {
      let changed = false;
      const newItems = parsedItems.map(item => {
        if (!item.itemId && item.isValuable) {
          const match = inventoryItems.find(i => i.name === item.originalName);
          if (match) {
            changed = true;
            return { ...item, itemId: match.id };
          }
        }
        return item;
      });
      if (changed) setParsedItems(newItems);
    }
  }, [inventoryItems]); // Only re-run when inventoryItems changes from a background refetch

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const lines = results.data as string[][];
          let headerIndex = -1;
          let dateStr = 'Unknown Date';

          // Find the header row and date
          for (let i = 0; i < Math.min(lines.length, 20); i++) {
            const firstCell = lines[i][0] || '';
            if (firstCell.startsWith('Datum')) {
              dateStr = lines[i][1] || lines[i][0].split(';')[1] || 'Unknown Date';
            }
            // Sometimes papaparse parses semicolon delimited as one string if we don't specify delimiter
            // but papaparse usually auto-detects. Let's handle both array of strings and single string
            if (lines[i].includes('Name') && lines[i].includes('Anzahl') || firstCell.includes('Name;PLU;Anzahl')) {
              headerIndex = i;
              break;
            }
          }

          if (headerIndex === -1) {
            setError('Could not find the "Name", "PLU", "Anzahl" table header in the CSV.');
            return;
          }

          setReportDate(dateStr);

          // We will re-parse using explicit semicolon if it didn't split properly
          Papa.parse(file, {
            skipEmptyLines: true,
            delimiter: ';',
            complete: (res) => {
              const rows = res.data as string[][];
              let actualHeaderIdx = -1;
              for (let i = 0; i < Math.min(rows.length, 20); i++) {
                if (rows[i][0] === 'Name' && rows[i][2] === 'Anzahl') {
                  actualHeaderIdx = i;
                  break;
                }
              }

              if (actualHeaderIdx === -1) {
                setError('Could not correctly parse the semicolon delimited table.');
                return;
              }

              const extracted: PosParsedItem[] = [];
              for (let i = actualHeaderIdx + 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 4) continue;
                if (row[0] === 'Total') continue;

                const originalName = row[0].trim();
                const anzahlStr = row[2] || '0';
                const quantity = parseInt(anzahlStr.replace(/[^0-9-]/g, ''), 10) || 0;
                const priceStr = row[3] || '0,00';

                // Skip completely zero rows if they are just artifacts
                if (originalName === '') continue;

                // Load from memory
                const isValuable = valuableMemory[originalName] !== undefined ? valuableMemory[originalName] : priceStr !== '0,00';
                const memoryMatch = matchMemory[originalName];
                const itemId = memoryMatch?.id || '';
                const multiplier = memoryMatch?.multiplier || 1;

                extracted.push({
                  id: `pos-${i}-${Math.random().toString(36).substr(2, 9)}`,
                  originalName,
                  quantity,
                  priceStr,
                  isValuable,
                  itemId,
                  multiplier
                });
              }

              setParsedItems(extracted);
              setError(null);
            }
          });
        } catch (err) {
          setError('Failed to process the CSV file.');
        }
      },
      error: (error: any) => {
        setError(`Failed to parse CSV: ${error.message}`);
      }
    });
  }, [valuableMemory, matchMemory]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  const handleItemChange = (index: number, field: keyof PosParsedItem, value: any) => {
    setParsedItems(prev => {
      if (!prev) return null;
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const handleConfirm = async () => {
    if (!parsedItems) return;
    
    const valuableItems = parsedItems.filter(i => i.isValuable);
    if (valuableItems.length === 0) {
      alert('You have not selected any valuable items to deduct.');
      return;
    }

    const unmapped = valuableItems.filter(i => !i.itemId);
    if (unmapped.length > 0) {
      alert(`Please map all valuable items to an inventory item. (${unmapped.length} unmapped)`);
      return;
    }

    // Save preferences to memory
    const newValMap = { ...valuableMemory };
    const newMatchMap = { ...matchMemory };
    
    parsedItems.forEach(item => {
      newValMap[item.originalName] = item.isValuable;
      if (item.itemId) {
        newMatchMap[item.originalName] = { id: item.itemId, multiplier: item.multiplier };
      }
    });

    localStorage.setItem('underdocks_pos_valuable', JSON.stringify(newValMap));
    localStorage.setItem('underdocks_pos_matches', JSON.stringify(newMatchMap));
    setValuableMemory(newValMap);
    setMatchMemory(newMatchMap);

    await onConfirm(valuableItems);
  };

  // Group and sort items
  const displayItems = useMemo(() => {
    if (!parsedItems) return { visible: [], hidden: [] };

    // Update parsed items by re-sorting them (we need to keep indices stable for handleItemChange though)
    // Actually, mapping over sorted array means indices change. We should use `originalName` as key and find index.
    
    const visible = parsedItems.filter(i => i.priceStr !== '0,00' || i.isValuable);
    const hidden = parsedItems.filter(i => i.priceStr === '0,00' && !i.isValuable);

    // Sort visible: valuable first, then alphabetical
    visible.sort((a, b) => {
      if (a.isValuable && !b.isValuable) return -1;
      if (!a.isValuable && b.isValuable) return 1;
      return a.originalName.localeCompare(b.originalName);
    });

    return { visible, hidden };
  }, [parsedItems]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-2">Import POS Sales</h2>
        <p className="text-[var(--color-text-muted)]">Upload a CSV receipt from your POS system to automatically deduct sold items from your inventory.</p>
      </div>

      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer mb-8
          ${isDragActive 
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.02]' 
            : 'border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-bg-card)]/80'}
          ${parsedItems ? 'hidden' : 'block'}
        `}
      >
        <input
          type="file"
          accept=".csv"
          className="hidden"
          id="csv-upload"
          onChange={handleFileInput}
        />
        <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
          <div className={`p-4 rounded-full mb-4 transition-colors ${isDragActive ? 'bg-[var(--color-primary)]/20' : 'bg-[var(--color-bg)]'}`}>
            <UploadCloud size={40} className={isDragActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'} />
          </div>
          <p className="text-lg font-semibold text-[var(--color-text-main)] mb-2">
            Drag & drop your POS CSV here
          </p>
          <p className="text-[var(--color-text-muted)] text-sm mb-6">
            or click to browse from your computer
          </p>
          <div className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-full font-medium hover:bg-[var(--color-primary-hover)] transition-colors">
            Select CSV File
          </div>
        </label>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center h-48 bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center text-red-500">
          <AlertCircle size={40} className="mb-4" />
          <p className="font-bold text-lg mb-2">Parsing Error</p>
          <p>{error}</p>
          <button 
            onClick={() => { setError(null); setParsedItems(null); }}
            className="mt-4 px-4 py-2 bg-[var(--color-bg)] text-[var(--color-text-main)] rounded-lg text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      ) : parsedItems ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-sm flex flex-col">
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 rounded-t-2xl flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-[var(--color-text-main)]">Review POS Sales</p>
              {reportDate && <p className="text-xs text-[var(--color-text-muted)]">Report Date: {reportDate}</p>}
            </div>
            <button 
              onClick={() => { setParsedItems(null); setError(null); }}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              Upload Different CSV
            </button>
          </div>
          
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {displayItems.visible.map((item) => {
              // Find actual index in parsedItems to correctly update state
              const actualIdx = parsedItems.findIndex(p => p.id === item.id);
              
              return (
                <div key={item.id} className={`flex flex-wrap md:flex-nowrap items-center gap-3 bg-[var(--color-bg)] p-3 rounded-xl border transition-colors ${item.isValuable ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}`}>
                  <div className="flex items-center gap-3 w-48 shrink-0">
                    <input 
                      type="checkbox"
                      checked={item.isValuable}
                      onChange={(e) => handleItemChange(actualIdx, 'isValuable', e.target.checked)}
                      className="w-5 h-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                    />
                    <div className="truncate">
                      <p className="text-sm font-bold text-[var(--color-text-main)] truncate" title={item.originalName}>{item.originalName}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">Preis: {item.priceStr}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-[150px]">
                    <select
                      value={item.itemId || ''}
                      onChange={(e) => {
                        if (e.target.value === 'new' && onCreateNewItem) {
                          onCreateNewItem(item.originalName);
                          handleItemChange(actualIdx, 'itemId', '');
                        } else {
                          handleItemChange(actualIdx, 'itemId', e.target.value);
                        }
                      }}
                      disabled={!item.isValuable}
                      className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none disabled:opacity-50"
                    >
                      <option value="">-- Ignore (Don't subtract) --</option>
                      {inventoryItems?.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} ({inv.unit})
                        </option>
                      ))}
                      <option value="new">➕ Create New Item...</option>
                    </select>
                  </div>
                  
                  <div className="w-24 shrink-0">
                    <label className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block mb-1">Qty per Sale</label>
                    <input 
                      type="number"
                      value={item.multiplier}
                      onChange={(e) => handleItemChange(actualIdx, 'multiplier', parseFloat(e.target.value) || 1)}
                      disabled={!item.isValuable}
                      className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none disabled:opacity-50"
                      min="0.001"
                      step="0.1"
                    />
                  </div>
                  
                  <div className="w-24 shrink-0 text-right pr-2">
                    <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block mb-1">Total Sold</span>
                    <span className="font-mono text-sm font-bold text-red-500">
                      -{Math.round(item.quantity * item.multiplier * 100) / 100}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {displayItems.hidden.length > 0 && (
              <div className="pt-4 border-t border-[var(--color-border)] mt-4">
                <button 
                  onClick={() => setShowHidden(!showHidden)}
                  className="flex items-center justify-center w-full py-2 gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors mx-auto"
                >
                  {showHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showHidden ? 'Hide' : 'Show'} {displayItems.hidden.length} hidden items (Preis 0,00)
                </button>
                
                {showHidden && (
                  <div className="mt-4 space-y-3 opacity-70">
                    {displayItems.hidden.map((item) => {
                      const actualIdx = parsedItems.findIndex(p => p.id === item.id);
                      return (
                        <div key={item.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-border)]">
                          <div className="flex items-center gap-3 w-48 shrink-0">
                            <input 
                              type="checkbox"
                              checked={item.isValuable}
                              onChange={(e) => handleItemChange(actualIdx, 'isValuable', e.target.checked)}
                              className="w-5 h-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                            />
                            <div className="truncate">
                              <p className="text-sm font-bold text-[var(--color-text-main)] truncate" title={item.originalName}>{item.originalName}</p>
                              <p className="text-[10px] text-[var(--color-text-muted)]">Preis: {item.priceStr}</p>
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-[150px]">
                            <select
                              value={item.itemId || ''}
                              onChange={(e) => {
                                if (e.target.value === 'new' && onCreateNewItem) {
                                  onCreateNewItem(item.originalName);
                                  handleItemChange(actualIdx, 'itemId', '');
                                } else {
                                  handleItemChange(actualIdx, 'itemId', e.target.value);
                                }
                              }}
                              disabled={!item.isValuable}
                              className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none disabled:opacity-50"
                            >
                              <option value="">-- Ignore --</option>
                              {inventoryItems?.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.name}
                                </option>
                              ))}
                              <option value="new">➕ Create New Item...</option>
                            </select>
                          </div>
                          
                          <div className="w-24 shrink-0">
                            <label className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block mb-1">Qty per Sale</label>
                            <input 
                              type="number"
                              value={item.multiplier}
                              onChange={(e) => handleItemChange(actualIdx, 'multiplier', parseFloat(e.target.value) || 1)}
                              disabled={!item.isValuable}
                              className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none disabled:opacity-50"
                              min="0.001"
                              step="0.1"
                            />
                          </div>

                          <div className="w-24 shrink-0 text-right pr-2 flex flex-col justify-end">
                            <span className="font-mono text-sm font-bold text-[var(--color-text-muted)]">
                              -{Math.round(item.quantity * item.multiplier * 100) / 100}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg)]/50 rounded-b-2xl">
            <button 
              onClick={handleConfirm}
              disabled={isSubmitting || displayItems.visible.filter(i => i.isValuable).length === 0}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={20} />
              )}
              {isSubmitting ? 'Subtracting...' : `Subtract ${parsedItems.filter(i => i.isValuable).length} Items from Inventory`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
