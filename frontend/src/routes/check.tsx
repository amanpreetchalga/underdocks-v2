import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { InventoryCheck } from '../components/InventoryCheck';
import { useItems, useSettings, useBatchCheckInventory } from '../api/inventory';

export const Route = createFileRoute('/check')({
  component: CheckComponent,
});

function CheckComponent() {
  const navigate = useNavigate({ from: '/check' });
  const [isCheckSubmitting, setIsCheckSubmitting] = useState(false);
  
  const { data: items } = useItems();
  const { data: settings } = useSettings();
  const batchCheckInventory = useBatchCheckInventory();

  return (
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
          navigate({ to: '/' });
        } catch (err) {
          console.error("Failed to apply inventory check updates", err);
          alert("Some updates failed. Please check the network.");
        } finally {
          setIsCheckSubmitting(false);
        }
      }} 
    />
  );
}
