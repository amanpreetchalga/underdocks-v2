import { useState, useMemo, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { CategoryFilter } from './components/CategoryFilter';
import { InventoryCard } from './components/InventoryCard';
import { InventoryTable } from './components/InventoryTable';
import { CreateItemModal } from './components/CreateItemModal';
import { InventoryCheck } from './components/InventoryCheck';
import { ReceiptUploader } from './components/ReceiptUploader';
import { PosUploader } from './components/PosUploader';
import { Settings } from './components/Settings';
import { SalesPage } from './components/SalesPage';
import { LayoutGrid, List } from 'lucide-react';
import { useItems, useCreateItem, useUpdateItem, useDeleteItem, useParseReceipt, useSettings, useBatchUpdateStock, useBatchCheckInventory, useSales, useSaveSale } from './api/inventory';
import type { ItemCategory, PosParsedItem } from './types/types';

const queryClient = new QueryClient();

function InventoryApp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'inventory' | 'check' | 'upload' | 'pos' | 'conversions' | 'sales'>('inventory');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [unitView, setUnitView] = useState<'base' | 'alt'>(() => {
    return (localStorage.getItem('underdocks_unit_view') as 'base' | 'alt') || 'base';
  });
  const [isCheckSubmitting, setIsCheckSubmitting] = useState(false);
  const [createItemInitialData, setCreateItemInitialData] = useState<{ id?: string, name?: string, category?: string } | undefined>();

  useEffect(() => {
    localStorage.setItem('underdocks_unit_view', unitView);
  }, [unitView]);

  const { data: items, isLoading: itemsLoading, error } = useItems();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: sales, isLoading: salesLoading } = useSales();
  const isLoading = itemsLoading || settingsLoading || salesLoading;
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const parseReceipt = useParseReceipt();
  const batchUpdateStock = useBatchUpdateStock();
  const batchCheckInventory = useBatchCheckInventory();
  const saveSale = useSaveSale();

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
        {view === 'check' ? (
          <InventoryCheck 
            items={items || []} 
            isSubmitting={isCheckSubmitting}
            categories={settings?.categories || []}
            onSubmit={async (updates) => {
              setIsCheckSubmitting(true);
              try {
                if (updates.length > 0) {
                  await batchCheckInventory.mutateAsync(updates as any);
                }
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
            categories={settings?.categories || []}
            onParse={(base64) => parseReceipt.mutateAsync(base64)}
            onConfirm={async (parsedItems) => {
              const matchedItems = parsedItems.filter(i => i.itemId);
              if (matchedItems.length === 0) {
                alert('No items were matched to the inventory. Please select an inventory item from the dropdowns.');
                return;
              }
              
              try {
                const batchUpdates: { id: string; delta: number }[] = [];
                matchedItems.forEach(item => {
                  const invItem = items?.find(i => i.id === item.itemId);
                  if (!invItem) return;

                  let delta = item.quantity * item.qtyPerBox;
                  if (invItem && invItem.unit !== item.unit && invItem.altUnit === item.unit && invItem.altUnitFactor) {
                    delta = delta / invItem.altUnitFactor;
                  }

                  batchUpdates.push({
                    id: item.itemId as string,
                    delta
                  });
                });
                
                if (batchUpdates.length > 0) {
                  await batchUpdateStock.mutateAsync(batchUpdates);
                }
                
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
            onCreateNewItem={(defaultName) => {
              setCreateItemInitialData({ name: defaultName });
              setIsModalOpen(true);
            }}
            onConfirm={async (parsedItems: PosParsedItem[], reportDate: string) => {
              setIsCheckSubmitting(true);
              try {
                const batchUpdates: { id: string; delta: number }[] = [];
                parsedItems.forEach(item => {
                  if (!item.itemId) return;
                  
                  const invItem = items?.find(i => i.id === item.itemId);
                  if (!invItem) return;

                  if (invItem.category === 'selling_unit' && invItem.ingredients) {
                    invItem.ingredients.forEach(ing => {
                      const ingredientItem = items?.find(i => i.id === ing.itemId);
                      let ingDelta = -(item.quantity * item.multiplier * ing.quantity);
                      
                      // Convert pieces to kg if the ingredient tracks inventory in kg
                      if (ingredientItem && ingredientItem.unit !== 'piece' && ingredientItem.altUnit?.toLowerCase().includes('piece') && ingredientItem.altUnitFactor) {
                        ingDelta = ingDelta * ingredientItem.altUnitFactor;
                      }

                      batchUpdates.push({
                        id: ing.itemId,
                        delta: ingDelta
                      });
                    });
                    return;
                  }

                  let delta = -item.quantity;
                  
                  if (invItem.unit !== 'piece' && invItem.altUnit?.toLowerCase().includes('piece') && invItem.altUnitFactor) {
                    delta = delta * invItem.altUnitFactor;
                  }
                  
                  delta = delta * item.multiplier;

                  batchUpdates.push({ 
                    id: item.itemId, 
                    delta 
                  });
                });
                
                if (batchUpdates.length > 0) {
                  await batchUpdateStock.mutateAsync(batchUpdates);
                }

                // Save the receipt
                await saveSale.mutateAsync({
                  date: reportDate,
                  items: parsedItems
                });
                
                alert(`Successfully deducted ${parsedItems.length} items from inventory and saved the receipt!`);
                setView('sales');
              } catch (err) {
                console.error("Failed to deduct POS items from inventory", err);
                alert("Failed to update inventory. Please try again.");
              } finally {
                setIsCheckSubmitting(false);
              }
            }}
          />
        ) : view === 'sales' ? (
          <SalesPage 
            sales={sales} 
            isLoading={salesLoading} 
            onUploadClick={() => setView('pos')} 
          />
        ) : view === 'conversions' ? (
          <Settings onEditItem={(item) => {
            setCreateItemInitialData(item as any);
            setIsModalOpen(true);
          }} />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <CategoryFilter 
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                categories={settings?.categories || []}
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
            onDelete={(id) => deleteItem.mutate(id)}
          />
        )}
          </>
        )}
      </main>

      <CreateItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={createItemInitialData as any}
        isSubmitting={createItem.isPending || updateItem.isPending}
        categories={settings?.categories || []}
        onSubmit={(data) => {
          if (data.id) {
            updateItem.mutate({ id: data.id, data }, {
              onSuccess: () => {
                setIsModalOpen(false);
                setCreateItemInitialData(undefined);
              }
            });
          } else {
            createItem.mutate(data as any, {
              onSuccess: () => {
                setIsModalOpen(false);
                setCreateItemInitialData(undefined);
              }
            });
          }
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
