import { createFileRoute } from '@tanstack/react-router';
import { Settings } from '../components/Settings';
import { useAppContext } from '../AppContext';

export const Route = createFileRoute('/conversions')({
  component: ConversionsComponent,
});

function ConversionsComponent() {
  const { setCreateItemInitialData, setIsModalOpen } = useAppContext();

  return (
    <Settings 
      onEditItem={(item) => {
        setCreateItemInitialData(item as any);
        setIsModalOpen(true);
      }} 
    />
  );
}
