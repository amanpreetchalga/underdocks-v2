import { useState } from 'react';
import { UploadCloud, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import type { SalesReceipt } from '../types/types';

interface SalesPageProps {
  sales: SalesReceipt[] | undefined;
  isLoading: boolean;
  onUploadClick?: () => void;
  hideUploadButton?: boolean;
  onDeleteSale?: (id: string) => void;
}

export function SalesPage({ sales, isLoading, onUploadClick, hideUploadButton, onDeleteSale }: SalesPageProps) {
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedReceipts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-[var(--color-text-main)] mb-2">Sales History</h2>
          <p className="text-[var(--color-text-muted)]">
            View imported POS sales receipts.
          </p>
        </div>
        {!hideUploadButton && onUploadClick && (
          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm shadow-[var(--color-primary)]/20"
          >
            <UploadCloud size={18} /> Upload Sales Receipt
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      ) : !sales || sales.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--color-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
            <UploadCloud size={32} className="text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-2">No Sales Receipts</h3>
          <p className="text-[var(--color-text-muted)] mb-6 max-w-sm mx-auto">
            You haven't uploaded any sales receipts yet. Click the button above to import your first POS report.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sales.map((receipt) => {
            const isExpanded = expandedReceipts.has(receipt.id);
            const totalItems = receipt.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div key={receipt.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
                <div 
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-[var(--color-bg)]/50 transition-colors"
                  onClick={() => toggleExpand(receipt.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full flex items-center justify-center">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--color-text-main)]">{receipt.date}</h3>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        Imported on {new Date(receipt.createdAt).toLocaleDateString()} at {new Date(receipt.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-bold text-[var(--color-text-main)]">{totalItems}</div>
                      <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Items Sold</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this sale receipt? This will not revert your inventory stock.')) {
                            onDeleteSale?.(receipt.id);
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Sale"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                      <div className="text-[var(--color-text-muted)] p-2">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-[var(--color-bg)] border-t border-[var(--color-border)] p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {receipt.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-[var(--color-bg-card)] p-3 rounded-lg border border-[var(--color-border)]">
                          <span className="font-medium text-[var(--color-text-main)] truncate pr-4">{item.originalName}</span>
                          <span className="font-bold text-[var(--color-text-main)] whitespace-nowrap">x {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
