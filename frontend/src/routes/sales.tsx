import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SalesPage } from '../components/SalesPage';
import { useSales, useDeleteSale } from '../api/inventory';

export const Route = createFileRoute('/sales')({
  component: SalesComponent,
});

function SalesComponent() {
  const navigate = useNavigate({ from: '/sales' });
  const { data: sales, isLoading: salesLoading } = useSales();
  const deleteSale = useDeleteSale();

  return (
    <SalesPage 
      sales={sales} 
      isLoading={salesLoading} 
      onUploadClick={() => navigate({ to: '/pos' })} 
      onDeleteSale={(id) => deleteSale.mutate(id)}
    />
  );
}
