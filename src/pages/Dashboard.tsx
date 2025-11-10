import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Wrench,
  Users,
  Car,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { listServices, listClients, listCars } from '@/services/gearbox';
import { useMemo } from 'react';
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

export default function Dashboard() {
  const { token } = useAuth();

  const servicesQuery = useQuery({
    queryKey: ['services', token, 'dashboard'],
    queryFn: () => listServices(token!, { page: 1, perPage: 5 }),
    enabled: Boolean(token),
  });

  const clientsQuery = useQuery({
    queryKey: ['clients', token, 'dashboard'],
    queryFn: () => listClients(token!, { page: 1, perPage: 1 }),
    enabled: Boolean(token),
  });

  const carsQuery = useQuery({
    queryKey: ['cars', token, 'dashboard'],
    queryFn: () => listCars(token!, { page: 1, perPage: 1 }),
    enabled: Boolean(token),
  });

  const clientsForMapQuery = useQuery({
    queryKey: ['clients', token, 'dashboard-map'],
    queryFn: () => listClients(token!, { page: 1, perPage: 100 }),
    enabled: Boolean(token),
  });

  const carsForMapQuery = useQuery({
    queryKey: ['cars', token, 'dashboard-map'],
    queryFn: () => listCars(token!, { page: 1, perPage: 100 }),
    enabled: Boolean(token),
  });

  const clientMap = useMemo(() => {
    const entries = clientsForMapQuery.data?.data?.map((client) => [client.id, client.nome]) ?? [];
    return new Map(entries);
  }, [clientsForMapQuery.data]);

  const carMap = useMemo(() => {
    const entries = carsForMapQuery.data?.data?.map((car) => [car.id, car]) ?? [];
    return new Map(entries);
  }, [carsForMapQuery.data]);

  const serviceStats = servicesQuery.data;
  const totalRevenue =
    serviceStats?.data?.reduce((acc, service) => {
      const value = Number(service.totalValue);
      return acc + (Number.isNaN(value) ? 0 : value);
    }, 0) ?? 0;

  const openOrders =
    serviceStats?.data?.filter(
      (service) => service.status === 'Pendente' || service.status === 'Em andamento'
    ).length ?? 0;

  const stats = [
    {
      title: 'Ordens registradas',
      value: serviceStats?.meta.total?.toString() ?? '—',
      change: `${openOrders} em andamento`,
      icon: Wrench,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Clientes',
      value: clientsQuery.data?.meta.total?.toString() ?? '—',
      change: 'Total cadastrados',
      icon: Users,
      color: 'text-accent',
      bgColor: 'bg-accent-light',
    },
    {
      title: 'Veículos',
      value: carsQuery.data?.meta.total?.toString() ?? '—',
      change: 'Total cadastrados',
      icon: Car,
      color: 'text-success',
      bgColor: 'bg-success-light',
    },
    {
      title: 'Receita estimada',
      value: currencyFormat.format(totalRevenue),
      change: 'Somatório das ordens listadas',
      icon: TrendingUp,
      color: 'text-warning',
      bgColor: 'bg-warning-light',
    },
  ];

  const loadingDashboard =
    servicesQuery.isLoading || clientsQuery.isLoading || carsQuery.isLoading;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Indicadores consolidados da Gear Box API</p>
        </div>

        {loadingDashboard ? (
          <div className="flex items-center gap-3 text-muted-foreground mb-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Atualizando indicadores...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => (
              <Card key={stat.title} className="border-border shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                      <h3 className="text-3xl font-bold text-foreground mb-2">{stat.value}</h3>
                      <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Ordens de Serviço Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {servicesQuery.isLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando ordens...
              </div>
            ) : servicesQuery.isError ? (
              <p className="text-destructive">
                {servicesQuery.error instanceof Error
                  ? servicesQuery.error.message
                  : 'Erro ao listar ordens'}
              </p>
            ) : (
              <div className="space-y-4">
                {serviceStats?.data?.map((order) => {
                  const StatusIcon = statusConfig[order.status].icon;
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-foreground">{order.id}</span>
                          <Badge variant={statusConfig[order.status].variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[order.status].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground font-medium mb-1">
                          {clientMap.get(order.clientId) ?? 'Cliente não encontrado'}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1">
                          {(() => {
                            const car = carMap.get(order.carId);
                            return car ? `${car.marca} ${car.modelo} · ${car.placa}` : 'Veículo não localizado';
                          })()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.description ?? 'Sem descrição informada'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString('pt-BR')
                            : '—'}
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {currencyFormat.format(Number(order.totalValue) || 0)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
