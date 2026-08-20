import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InventoryItem } from '../types/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000'; // Default SAM local endpoint

export const useItems = () => {
  return useQuery<InventoryItem[]>({
    queryKey: ['items'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/items`);
      if (!response.ok) throw new Error('Failed to fetch items');
      return response.json();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

export const useUpdateStock = () => {
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
    onMutate: async ({ id, delta }) => {
      await queryClient.cancelQueries({ queryKey: ['items'] });
      const previousItems = queryClient.getQueryData<InventoryItem[]>(['items']);

      if (previousItems) {
        queryClient.setQueryData<InventoryItem[]>(
          ['items'],
          previousItems.map((item) =>
            item.id === id ? { ...item, currentStock: item.currentStock + delta } : item
          )
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

export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/items/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete item');
    },
    onSuccess: () => {
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
