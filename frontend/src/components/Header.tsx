import { Search, Plus, ListChecks, UploadCloud, ArrowLeft, Anchor, Settings, TrendingUp } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface HeaderProps {
  onAddClick: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentPath: string;
}

export function Header({ onAddClick, searchQuery, onSearchChange, currentPath }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur-md bg-[var(--color-bg)]/80 border-b border-[var(--color-border)] py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="bg-[var(--color-primary)] p-2 rounded-lg text-white">
            <Anchor size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight m-0 text-[var(--color-text-main)]">
            Underdocks <span className="text-[var(--color-primary)] font-light">Inventory</span>
          </h1>
        </Link>
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
        {currentPath !== '/' ? (
          <Link
            to="/"
            className="flex items-center gap-2 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg)] text-[var(--color-text-main)] border border-[var(--color-border)] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} /> Back to Inventory
          </Link>
        ) : (
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-end sm:justify-start">
            <Link
              to="/upload"
              className="flex items-center gap-2 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg)] text-[var(--color-text-main)] border border-[var(--color-border)] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <UploadCloud size={16} /> <span className="hidden sm:inline">Import Receipt</span>
            </Link>
            <Link
              to="/pos"
              className="flex items-center gap-2 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg)] text-[var(--color-text-main)] border border-[var(--color-border)] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <TrendingUp size={16} /> <span className="hidden sm:inline">Sales</span>
            </Link>
            <Link
              to="/check"
              className="flex items-center gap-2 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <ListChecks size={16} /> <span className="hidden sm:inline">Inventory Check</span>
            </Link>
            <Link
              to="/conversions"
              className="flex items-center gap-2 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg)] text-[var(--color-text-main)] border border-[var(--color-border)] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Settings size={16} /> <span className="hidden sm:inline">Settings</span>
            </Link>
            <button
              onClick={onAddClick}
              className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Add Item</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
