export type ItemCategory = 'fish' | 'drinks' | 'sauces' | 'breads' | 'selling_unit';
export type UnitType = 'kg' | 'piece' | 'liter';

export interface Ingredient {
  itemId: string;
  quantity: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  unit: UnitType;
  currentStock: number;
  minThreshold: number;
  updatedAt: string;
  altUnit?: string;
  altUnitFactor?: number;
  lastCheckExpected?: number;
  lastCheckActual?: number;
  lastCheckVariance?: number;
  lastCheckDate?: string;
  ingredients?: Ingredient[];
}

export interface StockUpdateInput {
  delta: number;
}
