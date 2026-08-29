export type ItemCategory = string;

export interface CategoryOption {
  value: string;
  label: string;
}

export interface AppSettings {
  categories: CategoryOption[];
}

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
  grossWeightPerBox?: number;
  netWeightPerBox?: number;
}

export interface StockUpdateInput {
  delta: number;
}

export interface PosParsedItem {
  id: string;
  originalName: string;
  quantity: number;
  priceStr: string;
  isValuable?: boolean;
  itemId?: string;
  multiplier: number;
}

export interface SalesReceipt {
  id: string;
  date: string;
  items: PosParsedItem[];
  createdAt: string;
}
