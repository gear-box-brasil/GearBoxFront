import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Clock, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { listServices, listClients, listCars } from '@/services/gearbox';
import type { ServiceStatus } from '@/types/api';

const statusConfig: Record<
  ServiceStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Clock }
> = {
  Pendente: { label: 'Pendente', variant: 'secondary', icon: AlertCircle },
  'Em andamento': { label: 'Em andamento', variant: 'default', icon: Clock },
  Concluído: { label: 'Concluído', variant: 'outline', icon: CheckCircle2 },
  Cancelado: { label: 'Cancelado', variant: 'destructive', icon: XCircle },
};

const currencyFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Ordens() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const { token } = useAuth();

  const servicesQuery = useQuery({
    queryKey: ['services', token, page],
    queryFn: () => listServices(token!, { page, perPage: 10 }),
    enabled: Boolean(token),
  });

  const clientsQuery = useQuery({
    queryKey: ['clients', token, 'map'],
    queryFn: () => listClients(token!, { page: 1, perPage: 100 }),
    enabled: Boolean(token),
  });

  const carsQuery = useQuery({
    queryKey: ['cars', token, 'map'],
    queryFn: () => listCars(token!, { page: 1, perPage: 100 }),
    enabled: Boolean(token),
  });

  const clientMap = useMemo(() => {
    const entries = clientsQuery.data?.data?.map((client) => [client.id, client.nome]) ?? [];
    return new Map(entries);
  }, [clientsQuery.data]);

  const carMap = useMemo(() => {
    const entries = carsQuery.data?.data?.map((car) => [car.id, car]) ?? [];
    return new Map(entries);
  }, [carsQuery.data]);

  const services = servicesQuery.data?.data ?? [];
  const filteredServices = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return services.filter((service) => {
      const clientName = clientMap.get(service.clientId)?.toLowerCase() ?? '';
      const car = carMap.get(service.carId);
      const vehicleText = car ? `${car.marca} ${car.modelo} ${car.placa}`.toLowerCase() : '';
      return (
        service.id.toLowerCase().includes(term) ||
        clientName.includes(term) ||
        vehicleText.includes(term)
      );
    });
  }, [services, searchTerm, clientMap, carMap]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Ordens de Serviço</h1>
            <p className="text-muted-foreground">Resultados carregados da Gear Box API</p>
          </div>
          <Button className="gap-2 bg-gradient-accent hover:opacity-90" disabled>
            <Plus className="w-4 h-4" />
            Registro em breve
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por cliente, placa ou código da OS..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {servicesQuery.isLoading ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando ordens...
          </div>
        ) : servicesQuery.isError ? (
          <p className="text-destructive">
            {servicesQuery.error instanceof Error
              ? servicesQuery.error.message
              : 'Erro ao buscar ordens'}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredServices.map((service) => {
                const config = statusConfig[service.status];
                const StatusIcon = config.icon;
                const clientName = clientMap.get(service.clientId) ?? 'Cliente não encontrado';
                const car = carMap.get(service.carId);
                const total = currencyFormat.format(Number(service.totalValue) || 0);
                return (
                  <Card key={service.id} className="border-border shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-foreground mb-1">{service.id}</h3>
                          <Badge variant={config.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{total}</p>
                          <p className="text-xs text-muted-foreground">
                            {service.createdAt
                              ? new Date(service.createdAt).toLocaleDateString('pt-BR')
                              : '—'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Cliente</p>
                          <p className="text-sm font-medium text-foreground">{clientName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Veículo</p>
                          <p className="text-sm font-medium text-foreground">
                            {car ? `${car.marca} ${car.modelo} · ${car.placa}` : 'Não localizado'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Descrição</p>
                          <p className="text-sm text-foreground">
                            {service.description ?? 'Sem descrição informada'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {servicesQuery.data?.meta && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Página {servicesQuery.data.meta.currentPage} de {servicesQuery.data.meta.lastPage}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1 || servicesQuery.isFetching}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      page === servicesQuery.data.meta.lastPage || servicesQuery.isFetching
                    }
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
