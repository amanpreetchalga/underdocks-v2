export type ItemCategory = 'fish' | 'drinks' | 'sauces' | 'breads';
export type UnitType = 'kg' | 'piece' | 'liter';

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  unit: UnitType;
  currentStock: number;
  minThreshold: number;
  updatedAt: string;
  lastCheckExpected?: number;
  lastCheckActual?: number;
  lastCheckVariance?: number;
  lastCheckDate?: string;
}

export interface StockUpdateInput {
  delta: number;
}
