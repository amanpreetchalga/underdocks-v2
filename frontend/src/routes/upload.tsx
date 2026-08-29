import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ReceiptUploader } from '../components/ReceiptUploader';
import { useItems, useSettings, useParseReceipt, useBatchUpdateStock } from '../api/inventory';

export const Route = createFileRoute('/upload')({
  component: UploadComponent,
});

function UploadComponent() {
  const navigate = useNavigate({ from: '/upload' });
  
  const { data: items } = useItems();
  const { data: settings } = useSettings();
  const parseReceipt = useParseReceipt();
  const batchUpdateStock = useBatchUpdateStock();

  return (
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
            if (invItem && invItem.netWeightPerBox) {
              delta = item.quantity * invItem.netWeightPerBox;
            } else if (invItem && invItem.unit !== item.unit && invItem.altUnit === item.unit && invItem.altUnitFactor) {
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
          navigate({ to: '/' });
        } catch (err) {
          console.error("Failed to add receipt items to inventory", err);
          alert("Failed to update inventory. Please try again.");
        }
      }}
    />
  );
}
