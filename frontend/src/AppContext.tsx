import { createContext, useContext } from 'react';

export interface AppContextType {
  searchQuery: string;
  setCreateItemInitialData: (data: any) => void;
  setIsModalOpen: (isOpen: boolean) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContext.Provider');
  }
  return context;
}
