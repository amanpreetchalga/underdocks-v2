import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Header } from '../components/Header';
import { CreateItemModal } from '../components/CreateItemModal';
import { useCreateItem, useUpdateItem, useSettings } from '../api/inventory';
import { AppContext } from '../AppContext';

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createItemInitialData, setCreateItemInitialData] = useState<{ id?: string, name?: string, category?: string } | undefined>();
  
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={{ searchQuery, setCreateItemInitialData, setIsModalOpen }}>
        <Header 
          onAddClick={() => setIsModalOpen(true)} 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentPath={currentPath}
        />
        
        <main className="max-w-7xl mx-auto w-full px-6 py-8">
          <Outlet />
        </main>

        <RootModals 
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          createItemInitialData={createItemInitialData}
          setCreateItemInitialData={setCreateItemInitialData}
        />
      </AppContext.Provider>
    </QueryClientProvider>
  );
}

function RootModals({ isModalOpen, setIsModalOpen, createItemInitialData, setCreateItemInitialData }: any) {
  const { data: settings } = useSettings();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  return (
    <CreateItemModal
      isOpen={isModalOpen}
      onClose={() => {
        setIsModalOpen(false);
        setCreateItemInitialData(undefined);
      }}
      initialData={createItemInitialData as any}
      isSubmitting={createItem.isPending || updateItem.isPending}
      categories={settings?.categories || []}
      onSubmit={(data) => {
        if (data.id) {
          updateItem.mutate({ id: data.id, data: data as any }, {
            onSuccess: () => {
              setIsModalOpen(false);
              setCreateItemInitialData(undefined);
            }
          });
        } else {
          createItem.mutate(data as any, {
            onSuccess: () => {
              setIsModalOpen(false);
              setCreateItemInitialData(undefined);
            }
          });
        }
      }}
    />
  );
}
