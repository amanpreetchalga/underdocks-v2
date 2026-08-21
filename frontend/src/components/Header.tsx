import { Search, Plus, Anchor, Settings } from 'lucide-react';

interface HeaderProps {
  onAddClick: () => void;
  onCheckClick: () => void;
  onUploadClick: () => void;
  onConversionsClick: () => void;
  onBackClick: () => void;
  view: 'inventory' | 'check' | 'upload' | 'conversions';
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function Header({ onAddClick, onCheckClick, onUploadClick, onConversionsClick, onBackClick, view, searchQuery, onSearchChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur-md bg-[var(--color-bg)]/80 border-b border-[var(--color-border)] py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <div className="bg-[var(--color-primary)] p-2 rounded-lg text-white">
          <Anchor size={24} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight m-0 text-[var(--color-text-main)]">
          Underdocks <span className="text-[var(--color-primary)] font-light">Inventory</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={18} />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all w-full md:w-64"
          />
        </div>
        {view === 'check' || view === 'upload' || view === 'conversions' ? (
           <button
            onClick={onBackClick}
            className="flex items-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] text-[var(--color-text-main)] px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <span>Back to Inventory</span>
          </button>
        ) : (
          <>
            <button
              onClick={onUploadClick}
              className="flex items-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] text-[var(--color-text-main)] px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <span className="hidden sm:inline">Upload Receipt</span>
            </button>
            <button
              onClick={onCheckClick}
              className="flex items-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] text-[var(--color-text-main)] px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <span className="hidden sm:inline">Inventory Check</span>
            </button>
            <button
              onClick={onConversionsClick}
              className="flex items-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] text-[var(--color-text-main)] px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Settings size={18} />
              <span className="hidden sm:inline">Settings</span>
            </button>
            
            <button
              onClick={onAddClick}
              className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-[var(--color-primary)]/20"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Item</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
