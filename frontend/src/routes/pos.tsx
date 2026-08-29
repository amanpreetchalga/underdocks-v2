import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { PosUploader } from '../components/PosUploader';
import { SalesPage } from '../components/SalesPage';
import { useItems, useBatchUpdateStock, useSaveSale, useSales } from '../api/inventory';
import type { PosParsedItem } from '../types/types';
import { useAppContext } from '../AppContext';

export const Route = createFileRoute('/pos')({
  component: PosComponent,
});

function PosComponent() {
  const { setCreateItemInitialData, setIsModalOpen } = useAppContext();
  const [isCheckSubmitting, setIsCheckSubmitting] = useState(false);
  
  const { data: items } = useItems();
  const { data: sales, isLoading: salesLoading } = useSales();
  const batchUpdateStock = useBatchUpdateStock();
  const saveSale = useSaveSale();

  return (
    <div className="flex flex-col gap-12 pb-12">
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
          } catch (err) {
            console.error("Failed to deduct POS items from inventory", err);
            alert("Failed to update inventory. Please try again.");
          } finally {
            setIsCheckSubmitting(false);
          }
        }}
      />
      
      <div className="border-t border-[var(--color-border)] pt-8">
        <SalesPage sales={sales} isLoading={salesLoading} hideUploadButton={true} />
      </div>
    </div>
  );
}
