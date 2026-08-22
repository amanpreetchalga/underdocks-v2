import { useState, useMemo, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { CategoryFilter } from './components/CategoryFilter';
import { InventoryCard } from './components/InventoryCard';
import { InventoryTable } from './components/InventoryTable';
import { CreateItemModal } from './components/CreateItemModal';
import { InventoryCheck } from './components/InventoryCheck';
import { ReceiptUploader } from './components/ReceiptUploader';
import { PosUploader, type PosParsedItem } from './components/PosUploader';
import { ConversionsSettings } from './components/ConversionsSettings';
import { LayoutGrid, List } from 'lucide-react';
import { useItems, useCreateItem, useUpdateStock, useDeleteItem, useCheckInventory, useParseReceipt } from './api/inventory';
import type { ItemCategory } from './types/types';

const queryClient = new QueryClient();

function InventoryApp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'inventory' | 'check' | 'upload' | 'pos' | 'conversions'>('inventory');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [unitView, setUnitView] = useState<'base' | 'alt'>(() => {
    return (localStorage.getItem('underdocks_unit_view') as 'base' | 'alt') || 'base';
  });
  const [isCheckSubmitting, setIsCheckSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem('underdocks_unit_view', unitView);
  }, [unitView]);

  const { data: items, isLoading, error } = useItems();
  const createItem = useCreateItem();
  const updateStock = useUpdateStock();
  const deleteItem = useDeleteItem();
  const checkInventory = useCheckInventory();
  const parseReceipt = useParseReceipt();

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (item.id || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  return (
    <>
      <Header 
        onAddClick={() => setIsModalOpen(true)} 
        onCheckClick={() => setView('check')}
        onUploadClick={() => setView('upload')}
        onPosClick={() => setView('pos')}
        onConversionsClick={() => setView('conversions')}
        onBackClick={() => setView('inventory')}
        view={view}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <main className="max-w-7xl mx-auto w-full px-6 py-8">
        {view === 'check' && items ? (
          <InventoryCheck 
            items={items} 
            isSubmitting={isCheckSubmitting}
            onSubmit={async (updates) => {
              setIsCheckSubmitting(true);
              try {
                // updates here currently have { id, delta } from previous implementation
                // We should change InventoryCheck.tsx to emit { id, actual } instead of delta.
                // Wait, InventoryCheck emits updates: { id, delta } 
                // Let's assume we map delta back to actual inside InventoryCheck or App.tsx. 
                // Actually, I'll update InventoryCheck as well next. For now, we will pass actual from InventoryCheck.
                await Promise.all(updates.map(update => checkInventory.mutateAsync(update as any)));
                setView('inventory');
              } catch (err) {
                console.error("Failed to apply inventory check updates", err);
                alert("Some updates failed. Please check the network.");
              } finally {
                setIsCheckSubmitting(false);
              }
            }} 
          />
        ) : view === 'upload' ? (
          <ReceiptUploader
            isParsing={parseReceipt.isPending}
            onParse={(base64) => parseReceipt.mutateAsync(base64)}
            onConfirm={async (parsedItems) => {
              const matchedItems = parsedItems.filter(i => i.itemId);
              if (matchedItems.length === 0) {
                alert('No items were matched to the inventory. Please select an inventory item from the dropdowns.');
                return;
              }
              
              try {
                await Promise.all(matchedItems.map(item => {
                  const invItem = items?.find(i => i.id === item.itemId);
                  let delta = item.quantity * item.qtyPerBox;
                  
                  // if receipt unit (item.unit) is kg, but base unit is piece, we must divide by altUnitFactor (kg per piece)
                  if (invItem && invItem.unit !== item.unit && invItem.altUnit === item.unit && invItem.altUnitFactor) {
                    delta = delta / invItem.altUnitFactor;
                  }

                  return updateStock.mutateAsync({ 
                    id: item.itemId as string, 
                    delta 
                  });
                }));
                alert(`Successfully added ${matchedItems.length} items to inventory!`);
                setView('inventory');
              } catch (err) {
                console.error("Failed to add receipt items to inventory", err);
                alert("Failed to update inventory. Please try again.");
              }
            }}
          />
        ) : view === 'pos' ? (
          <PosUploader
            inventoryItems={items}
            isSubmitting={isCheckSubmitting}
            onConfirm={async (parsedItems: PosParsedItem[]) => {
              setIsCheckSubmitting(true);
              try {
                await Promise.all(parsedItems.map(item => {
                  if (!item.itemId) return Promise.resolve();
                  
                  const invItem = items?.find(i => i.id === item.itemId);
                  let delta = -item.quantity; // Negative delta for sales
                  
                  // if pos sold in pieces, but inventory base is kg
                  // e.g., POS sold 2 tacos, inventory is in kg. We need altUnitFactor?
                  // POS usually sells in pieces. So if invItem.unit is 'kg' and it has altUnitFactor,
                  // we multiply delta by altUnitFactor. 1 piece sold * 0.05 kg/piece = 0.05 kg subtracted.
                  if (invItem && invItem.unit !== 'piece' && invItem.altUnit === 'piece' && invItem.altUnitFactor) {
                    delta = delta * invItem.altUnitFactor;
                  }

                  return updateStock.mutateAsync({ 
                    id: item.itemId, 
                    delta 
                  });
                }));
                alert(`Successfully deducted ${parsedItems.length} items from inventory!`);
                setView('inventory');
              } catch (err) {
                console.error("Failed to deduct POS items from inventory", err);
                alert("Failed to update inventory. Please try again.");
              } finally {
                setIsCheckSubmitting(false);
              }
            }}
          />
        ) : view === 'conversions' ? (
          <ConversionsSettings />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <CategoryFilter 
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
              <div className="flex items-center gap-4 self-start sm:self-auto">
                <div className="flex items-center bg-[var(--color-bg-card)] border border-[var(--color-border)] p-1 rounded-lg">
                  <button
                    onClick={() => setUnitView('base')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      unitView === 'base'
                        ? 'bg-[var(--color-bg)] text-[var(--color-primary)] shadow-sm'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg)]/50'
                    }`}
                  >
                    Base Units
                  </button>
                  <button
                    onClick={() => setUnitView('alt')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      unitView === 'alt'
                        ? 'bg-[var(--color-bg)] text-[var(--color-primary)] shadow-sm'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg)]/50'
                    }`}
                  >
                    Weight
                  </button>
                </div>
                
                <div className="flex items-center gap-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] p-1 rounded-lg">
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${
                    layoutMode === 'grid' 
                      ? 'bg-[var(--color-bg)] text-[var(--color-primary)] shadow-sm' 
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg)]/50'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setLayoutMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${
                    layoutMode === 'list' 
                      ? 'bg-[var(--color-bg)] text-[var(--color-primary)] shadow-sm' 
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg)]/50'
                  }`}
                  title="List View"
                >
                  <List size={18} />
                </button>
                </div>
              </div>
            </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
            <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
            <p>Loading inventory...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center text-red-400 mt-8">
            <p className="font-semibold mb-1">Failed to load inventory</p>
            <p className="text-sm opacity-80">Please check if the backend is running.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-[var(--color-text-muted)]">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-[var(--color-text-main)] mb-2">No items found</h3>
            <p>Try adjusting your search or add a new item to the inventory.</p>
          </div>
        ) : layoutMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <InventoryCard 
                key={item.id} 
                item={item} 
                unitView={unitView}
                onDelete={(id) => deleteItem.mutate(id)}
              />
            ))}
          </div>
        ) : (
          <InventoryTable
            items={filteredItems}
            unitView={unitView}
            onUpdateStock={(id, delta) => updateStock.mutate({ id, delta })}
            onDelete={(id) => deleteItem.mutate(id)}
          />
        )}
          </>
        )}
      </main>

      <CreateItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isSubmitting={createItem.isPending}
        onSubmit={(data) => {
          createItem.mutate(data, {
            onSuccess: () => setIsModalOpen(false),
          });
        }}
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <InventoryApp />
    </QueryClientProvider>
  );
}

export default App;
