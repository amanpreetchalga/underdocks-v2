import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo, useEffect } from 'react';
import { CategoryFilter } from '../components/CategoryFilter';
import { InventoryCard } from '../components/InventoryCard';
import { InventoryTable } from '../components/InventoryTable';
import { LayoutGrid, List } from 'lucide-react';
import { useItems, useSettings, useDeleteItem } from '../api/inventory';
import type { ItemCategory } from '../types/types';
import { useAppContext } from '../AppContext';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent() {
  const { searchQuery } = useAppContext();
  
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [unitView, setUnitView] = useState<'base' | 'alt'>(() => {
    return (localStorage.getItem('underdocks_unit_view') as 'base' | 'alt') || 'base';
  });

  useEffect(() => {
    localStorage.setItem('underdocks_unit_view', unitView);
  }, [unitView]);

  const { data: items, isLoading: itemsLoading, error } = useItems();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const isLoading = itemsLoading || settingsLoading;
  
  const deleteItem = useDeleteItem();

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
  );
}
