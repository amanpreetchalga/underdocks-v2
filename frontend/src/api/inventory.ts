import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InventoryItem, AppSettings, SalesReceipt } from '../types/types';

const API_URL = import.meta.env.VITE_API_URL || '/api'; // Default SAM local endpoint via Vite proxy

export const useSettings = () => {
  return useQuery<AppSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AppSettings) => {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
};

export const useItems = () => {
  return useQuery<InventoryItem[]>({
    queryKey: ['items'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/items`);
      if (!response.ok) throw new Error('Failed to fetch items');
      const data = await response.json();
      return data.sort((a: InventoryItem, b: InventoryItem) => a.name.localeCompare(b.name));
    },
  });
};

export const useBatchUpdateStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; delta: number }[]) => {
      const response = await fetch(`${API_URL}/items/batch-update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to batch update stock');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

export const useBatchCheckInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (checks: { id: string; actual: number }[]) => {
      const response = await fetch(`${API_URL}/items/batch-check`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checks),
      });
      if (!response.ok) throw new Error('Failed to batch check inventory');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

export const useSales = () => {
  return useQuery<SalesReceipt[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/sales`);
      if (!response.ok) throw new Error('Failed to fetch sales receipts');
      return response.json();
    },
  });
};

export const useSaveSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sale: Omit<SalesReceipt, 'id' | 'createdAt'>) => {
      const response = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale),
      });
      if (!response.ok) throw new Error('Failed to save sale receipt');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

export const useCreateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newItem: Omit<InventoryItem, 'id' | 'updatedAt'>) => {
      const response = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to create item');
      }
      return response.json();
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ['items'] });
      const previousItems = queryClient.getQueryData<InventoryItem[]>(['items']);

      if (previousItems) {
        queryClient.setQueryData<InventoryItem[]>(['items'], [
          ...previousItems,
          {
            ...newItem,
            id: `temp-${Date.now()}`,
            updatedAt: new Date().toISOString(),
          } as InventoryItem,
        ]);
      }
      return { previousItems };
    },
    onError: (_, __, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['items'], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

export function useUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      const response = await fetch(`${API_URL}/items/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      });
      if (!response.ok) throw new Error('Failed to update stock');
      return response.json();
    },
    // We will wait for the stock update to complete before invalidating
    // to ensure the DB reflects the final state, though we are optimistic below.
    onMutate: async ({ id, delta }) => {
      await queryClient.cancelQueries({ queryKey: ['items'] });
      const previousItems = queryClient.getQueryData<InventoryItem[]>(['items']);

      if (previousItems) {
        queryClient.setQueryData<InventoryItem[]>(['items'], old => {
          if (!old) return old;
          return old.map(item =>
            item.id === id ? { ...item, currentStock: Math.max(0, item.currentStock + delta) } : item
          );
        });
      }
      return { previousItems };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['items'], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    }
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<InventoryItem, 'id' | 'currentStock' | 'lastCheckVariance' | 'lastCheckDate'>> & { resetVariance?: boolean } }) => {
      const response = await fetch(`${API_URL}/items/${id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update item details');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/items/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete item');
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['items'] });
      const previousItems = queryClient.getQueryData<InventoryItem[]>(['items']);

      if (previousItems) {
        queryClient.setQueryData<InventoryItem[]>(
          ['items'],
          previousItems.filter(item => item.id !== id)
        );
      }
      return { previousItems };
    },
    onError: (_, __, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['items'], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

export const useCheckInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actual }: { id: string; actual: number }) => {
      const response = await fetch(`${API_URL}/items/${id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual }),
      });
      if (!response.ok) throw new Error('Failed to submit inventory check');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};


export const useParseReceipt = () => {
  return useMutation({
    mutationFn: async (base64Image: string) => {
      const response = await fetch(`${API_URL}/receipts/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to parse receipt');
      }
      return response.json();
    },
  });
};
