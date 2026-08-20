import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';


const itemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['fish', 'drinks', 'sauces', 'breads']),
  unit: z.enum(['kg', 'piece', 'liter']),
  currentStock: z.number().min(0, 'Must be 0 or more'),
  minThreshold: z.number().min(0, 'Must be 0 or more'),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ItemFormValues) => void;
  isSubmitting: boolean;
}

export function CreateItemModal({ isOpen, onClose, onSubmit, isSubmitting }: CreateItemModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      category: 'fish',
      unit: 'kg',
      currentStock: 0,
      minThreshold: 10,
    },
  });

  if (!isOpen) return null;

  const handleFormSubmit = (data: ItemFormValues) => {
    onSubmit(data);
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl w-full max-w-md shadow-2xl shadow-black/50 overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-bold text-[var(--color-text-main)] m-0">Add New Item</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-border)] p-1.5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Name</label>
            <input
              {...register('name')}
              placeholder="e.g. Black Tiger Prawns"
              className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Category</label>
              <select
                {...register('category')}
                className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] appearance-none"
              >
                <option value="fish">🐟 Fish</option>
                <option value="drinks">🥤 Drinks</option>
                <option value="sauces">🥣 Sauces</option>
                <option value="breads">🥖 Breads</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Unit</label>
              <select
                {...register('unit')}
                className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] appearance-none"
              >
                <option value="kg">kg</option>
                <option value="piece">piece</option>
                <option value="liter">liter</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Initial Stock</label>
              <input
                type="number"
                {...register('currentStock', { valueAsNumber: true })}
                className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text-main)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              {errors.currentStock && <p className="text-red-400 text-xs mt-1">{errors.currentStock.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Min Threshold</label>
              <input
                type="number"
                {...register('minThreshold', { valueAsNumber: true })}
                className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text-main)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              {errors.minThreshold && <p className="text-red-400 text-xs mt-1">{errors.minThreshold.message}</p>}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium text-[var(--color-text-main)] hover:bg-[var(--color-border)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
