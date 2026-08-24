import type { CategoryOption } from '../types/types';

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categories: CategoryOption[];
}

export function CategoryFilter({ selectedCategory, onSelectCategory, categories }: CategoryFilterProps) {
  const allCategories = [{ value: 'all', label: 'All Items' }, ...categories];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide px-6 pt-4">
      {allCategories.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onSelectCategory(cat.value)}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedCategory === cat.value
              ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
              : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-border)]'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
