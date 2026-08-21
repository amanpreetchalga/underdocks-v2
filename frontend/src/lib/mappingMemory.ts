const MAPPING_KEY = 'underdocks_item_mapping';

export const saveMapping = (vendorItemName: string, inventoryItemId: string) => {
  try {
    const data = localStorage.getItem(MAPPING_KEY);
    const mappings = data ? JSON.parse(data) : {};
    mappings[vendorItemName] = inventoryItemId;
    localStorage.setItem(MAPPING_KEY, JSON.stringify(mappings));
  } catch (e) {
    console.error('Failed to save mapping', e);
  }
};

export const getMapping = (vendorItemName: string): string | null => {
  try {
    const data = localStorage.getItem(MAPPING_KEY);
    if (!data) return null;
    const mappings = JSON.parse(data);
    return mappings[vendorItemName] || null;
  } catch (e) {
    console.error('Failed to read mapping', e);
    return null;
  }
};
