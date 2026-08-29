import { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import { useItems, useCreateItem } from '../api/inventory';
import { saveMapping, getMapping } from '../lib/mappingMemory';
import { CreateItemModal } from './CreateItemModal';

import type { CategoryOption } from '../types/types';

interface ParsedItem {
  name: string;
  quantity: number;
  qtyPerBox: number;
  unit: string;
  itemId?: string;
}

interface ReceiptUploaderProps {
  onParse: (base64Image: string) => Promise<ParsedItem[]>;
  onConfirm: (items: ParsedItem[]) => void;
  isParsing: boolean;
  categories: CategoryOption[];
}

export function ReceiptUploader({ onParse, onConfirm, isParsing, categories }: ReceiptUploaderProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: inventoryItems } = useItems();
  const createItem = useCreateItem();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Please upload an image file (JPEG, PNG) or a PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImageSrc(base64);
      setError(null);
      setParsedItems(null);

      try {
        const items = await onParse(base64);
        
        // Auto-map based on past memory
        const mappedItems = items.map(item => {
          const rememberedId = getMapping(item.name);
          return rememberedId ? { ...item, itemId: rememberedId } : item;
        });
        
        setParsedItems(mappedItems);
      } catch (err: any) {
        setError(err.message || 'Failed to parse receipt.');
      }
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsDataURL(file);
  };

  const handleItemChange = (index: number, field: keyof ParsedItem, value: string | number) => {
    if (!parsedItems) return;
    
    if (field === 'itemId' && value === 'new') {
      setEditingIndex(index);
      setIsModalOpen(true);
      return;
    }

    const newItems = [...parsedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setParsedItems(newItems);
  };

  const handleConfirm = () => {
    if (parsedItems) {
      // Save mappings for items that have an itemId selected
      parsedItems.forEach(item => {
        if (item.itemId) {
          saveMapping(item.name, item.itemId);
        }
      });
      onConfirm(parsedItems);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto py-8">
      {/* Left Panel: Upload & Preview */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-[var(--color-text-main)] flex items-center gap-2">
          <FileText className="text-[var(--color-primary)]" /> Receipt Image
        </h2>
        
        {!imageSrc ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--color-border)] rounded-2xl h-96 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg)]/50 transition-colors cursor-pointer group"
          >
            <div className="p-4 bg-[var(--color-primary)]/10 rounded-full group-hover:scale-110 transition-transform mb-4">
              <Upload className="text-[var(--color-primary)]" size={32} />
            </div>
            <p className="font-semibold text-[var(--color-text-main)]">Click to upload receipt</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Supports JPG, PNG, PDF</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*,application/pdf" 
              className="hidden" 
            />
          </div>
        ) : (
          <div className="relative border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-bg-card)] h-[600px] flex items-center justify-center p-4">
            {imageSrc.startsWith('data:application/pdf') ? (
              <object data={imageSrc} type="application/pdf" className="w-full h-full rounded-lg">
                <p>Unable to display PDF file. <a href={imageSrc} download="receipt.pdf" className="text-[var(--color-primary)] underline">Download</a> instead.</p>
              </object>
            ) : (
              <img src={imageSrc} alt="Receipt" className="max-h-full max-w-full object-contain rounded-lg" />
            )}
            <button 
              onClick={() => {
                setImageSrc(null);
                setParsedItems(null);
                setError(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-black/70 backdrop-blur-md transition-colors"
            >
              Upload Another
            </button>
          </div>
        )}
      </div>

      {/* Right Panel: Parsed Data */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-[var(--color-text-main)]">Parsed Data</h2>
        
        {isParsing ? (
          <div className="flex flex-col items-center justify-center h-96 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl">
            <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[var(--color-text-muted)] font-medium">Scanning with Azure Document Intelligence...</p>
            <p className="text-sm text-[var(--color-text-muted)] opacity-70 mt-2 text-center px-8">
              Extracting perfectly structured line items, quantities, and prices.
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-96 bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center text-red-500">
            <AlertCircle size={40} className="mb-4" />
            <p className="font-bold text-lg mb-2">Parsing Error</p>
            <p>{error}</p>
          </div>
        ) : parsedItems ? (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-sm flex flex-col h-[600px]">
            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 rounded-t-2xl">
              <p className="text-sm text-[var(--color-text-muted)]">
                Review the parsed items below. You can edit any fields before confirming.
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {parsedItems.length === 0 ? (
                <p className="text-center text-[var(--color-text-muted)] py-10">No items detected.</p>
              ) : (
                parsedItems.map((item, i) => (
                  <div key={i} className="flex flex-wrap md:flex-nowrap gap-3 bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-colors">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] ml-1">Vendor Item Name</label>
                      <input 
                        type="text" 
                        value={item.name} 
                        onChange={(e) => handleItemChange(i, 'name', e.target.value)}
                        className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none mb-2"
                      />
                      <select
                        value={item.itemId || ''}
                        onChange={(e) => handleItemChange(i, 'itemId', e.target.value)}
                        className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none"
                      >
                        <option value="">-- Match to Inventory Item --</option>
                        {inventoryItems?.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} ({inv.unit})
                          </option>
                        ))}
                        <option value="new">➕ Create New Item...</option>
                      </select>
                    </div>
                    <div className="w-20">
                      <label className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] ml-1">Boxes</label>
                      <input 
                        type="number" 
                        value={item.quantity} 
                        onChange={(e) => handleItemChange(i, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none"
                      />
                    </div>
                    <div className="w-20">
                      <label className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] ml-1">Qty/Box</label>
                      <input 
                        type="number" 
                        value={item.qtyPerBox} 
                        onChange={(e) => handleItemChange(i, 'qtyPerBox', parseFloat(e.target.value) || 0)}
                        className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none"
                      />
                    </div>
                    <div className="w-20">
                      <label className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] ml-1">Weight</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={item.quantity * item.qtyPerBox} 
                          disabled
                          className="w-full bg-[var(--color-bg-card)]/50 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] cursor-not-allowed"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)]">{item.unit}</span>
                      </div>
                    </div>
                    {/* Converted Base Unit Display */}
                    <div className="w-24 border-l border-[var(--color-border)] pl-3 flex flex-col justify-end">
                      {(() => {
                        const invItem = inventoryItems?.find(i => i.id === item.itemId);
                        if (!invItem) return null;
                        
                        let finalAmount = item.quantity * item.qtyPerBox;
                        let computedPieces: number | null = null;
                        let isWeightMismatch = false;
                        let expectedGross = 0;
                        if (invItem.grossWeightPerBox && Math.abs(item.qtyPerBox - invItem.grossWeightPerBox) > 0.05) {
                          isWeightMismatch = true;
                          expectedGross = invItem.grossWeightPerBox;
                        }

                        // If the parsed unit matches the alt unit, convert to main unit
                        if (invItem.netWeightPerBox) {
                          finalAmount = item.quantity * invItem.netWeightPerBox;
                        }
                        else if (invItem.unit !== item.unit && invItem.altUnit === item.unit && invItem.altUnitFactor) {
                          finalAmount = finalAmount / invItem.altUnitFactor;
                        } 
                        // If the parsed unit matches the main unit, but an alt unit (Base Unit) is defined, compute pieces
                        else if (invItem.unit === item.unit && invItem.altUnit && invItem.altUnitFactor) {
                          computedPieces = finalAmount / invItem.altUnitFactor;
                        }
                        
                        return (
                          <div className="mb-2 text-right">
                            {isWeightMismatch && (
                              <div className="flex items-center justify-end gap-1 text-orange-400 mb-1" title={`Expected gross weight per box: ${expectedGross}kg`}>
                                <AlertCircle size={12} />
                                <span className="text-[9px] font-bold">Weight Mismatch</span>
                              </div>
                            )}
                            <span className="text-[10px] uppercase font-bold text-[var(--color-primary)] block">
                              Will Add {invItem.netWeightPerBox ? '(Net)' : ''}
                            </span>
                            <span className="font-bold text-[var(--color-text-main)] text-sm">
                              +{Math.round(finalAmount * 100) / 100} {invItem.unit}
                            </span>
                            {computedPieces !== null && !invItem.netWeightPerBox && (
                              <span className="block text-xs text-[var(--color-text-muted)]">
                                ≈ {Math.round(computedPieces)} {invItem.altUnit}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg)]/50 rounded-b-2xl">
              <button 
                onClick={handleConfirm}
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[var(--color-primary)]/20"
              >
                <Check size={20} /> Convert to Inventory Stock
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-bg)]/20">
            <p className="text-[var(--color-text-muted)]">Upload a receipt to see parsed data here.</p>
          </div>
        )}
      </div>

      {editingIndex !== null && parsedItems && (
        <CreateItemModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingIndex(null);
          }}
          isSubmitting={createItem.isPending}
          categories={categories}
          initialData={{ name: parsedItems[editingIndex].name }}
          onSubmit={(data) => {
            createItem.mutate(data as any, {
              onSuccess: (createdItem) => {
                const newItems = [...parsedItems];
                newItems[editingIndex].itemId = createdItem.id;
                setParsedItems(newItems);
                setIsModalOpen(false);
                setEditingIndex(null);
              },
            });
          }}
        />
      )}
    </div>
  );
}
