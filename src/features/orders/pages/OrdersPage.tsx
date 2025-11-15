import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Plus, Clock, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listServices, listClients, listCars, updateService } from '@/services/gearbox';
import type { ServiceStatus } from '@/types/api';
import { PageHeader } from '@/components/PageHeader';
import { SearchInput } from '@/components/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';

const statusConfig: Record<
  ServiceStatus,
  { label: string; icon: typeof Clock; className: string; iconClass: string }
> = {
  Pendente: {
    label: 'Pendente',
    icon: AlertCircle,
    className: 'bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))] border-transparent',
    iconClass: 'text-[hsl(var(--warning))]',
  },
  'Em andamento': {
    label: 'Em andamento',
    icon: Clock,
    className: 'bg-[rgba(245,163,0,0.15)] text-[hsl(var(--primary))] border-transparent',
    iconClass: 'text-[hsl(var(--primary))]',
  },
  Concluído: {
    label: 'Concluído',
    icon: CheckCircle2,
    className: 'bg-[hsl(var(--success-light))] text-[hsl(var(--success))] border-transparent',
    iconClass: 'text-[hsl(var(--success))]',
  },
  Cancelado: {
    label: 'Cancelado',
    icon: XCircle,
    className: 'bg-[rgba(239,83,80,0.15)] text-[hsl(var(--destructive))] border-transparent',
    iconClass: 'text-[hsl(var(--destructive))]',
  },
};

const SERVICE_STATUS_OPTIONS: ServiceStatus[] = ['Pendente', 'Em andamento', 'Concluído', 'Cancelado'];
const SERVICE_STATUS_FILTER_OPTIONS: (ServiceStatus | 'todos')[] = ['todos', ...SERVICE_STATUS_OPTIONS];

type StatusDialogPayload = {
  serviceId: string;
  clientName: string;
  currentStatus: ServiceStatus;
  nextStatus: ServiceStatus;
};

const currencyFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Ordens() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'todos'>('todos');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const { token } = useAuth();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogPayload, setStatusDialogPayload] = useState<StatusDialogPayload | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ServiceStatus }) => {
      if (!token) {
        throw new Error('Sessão expirada');
      }
      return updateService(token, id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: 'Status atualizado',
        description: 'O status do serviço foi sincronizado com o banco.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Falha ao atualizar status',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const openStatusDialog = (payload: StatusDialogPayload) => {
    setStatusDialogPayload(payload);
    setStatusDialogOpen(true);
  };

  const closeStatusDialog = () => {
    setStatusDialogOpen(false);
    setStatusDialogPayload(null);
  };

  const confirmStatusChange = () => {
    if (!statusDialogPayload) return;
    updateStatusMutation.mutate({
      id: statusDialogPayload.serviceId,
      status: statusDialogPayload.nextStatus,
    });
    closeStatusDialog();
  };

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
    const fromDate = createdFrom ? new Date(createdFrom) : null;
    const toDate = createdTo ? new Date(createdTo) : null;

    const filtered = services.filter((service) => {
      if (statusFilter !== 'todos' && service.status !== statusFilter) return false;
      if (fromDate || toDate) {
        const createdAt = service.createdAt ? new Date(service.createdAt) : null;
        if (!createdAt) return false;
        if (fromDate && createdAt < fromDate) return false;
        if (toDate && createdAt > toDate) return false;
      }
      if (!term) return true;
      const clientName = clientMap.get(service.clientId)?.toLowerCase() ?? '';
      const car = carMap.get(service.carId);
      const vehicleText = car ? `${car.marca} ${car.modelo} ${car.placa}`.toLowerCase() : '';
      return (
        service.id.toLowerCase().includes(term) ||
        clientName.includes(term) ||
        vehicleText.includes(term) ||
        (service.description ?? '').toLowerCase().includes(term)
      );
    });

    return filtered
      .slice()
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }, [services, searchTerm, clientMap, carMap, statusFilter, createdFrom, createdTo]);

  const requestStatusChange = (
    serviceId: string,
    clientName: string,
    currentStatus: ServiceStatus,
    nextStatus: ServiceStatus
  ) => {
    if (statusDialogOpen || currentStatus === nextStatus) return;
    openStatusDialog({ serviceId, clientName, currentStatus, nextStatus });
  };

  return (
    <div className="page-container bg-gradient-hero rounded-2xl border border-border shadow-lg p-6 md:p-8">
      <PageHeader
        title="Ordens de Serviço"
        subtitle="Resultados carregados da Gear Box API"
        actions={
          <Button className="gap-2 bg-gradient-accent hover:opacity-90" disabled>
            <Plus className="w-4 h-4" />
            Registro em breve
          </Button>
        }
      />

      <div className="mb-6">
        <SearchInput
          placeholder="Buscar por cliente, placa ou código da OS..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1 text-xs">
          <p className="text-muted-foreground uppercase tracking-wide">Status</p>
          <Select
            value={statusFilter}
            onValueChange={(value: typeof statusFilter) => setStatusFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_STATUS_FILTER_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === 'todos' ? 'Todos' : status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 text-xs">
          <p className="text-muted-foreground uppercase tracking-wide">Cadastro a partir</p>
          <Input type="date" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} />
        </div>
        <div className="space-y-1 text-xs">
          <p className="text-muted-foreground uppercase tracking-wide">Cadastro até</p>
          <Input type="date" value={createdTo} onChange={(event) => setCreatedTo(event.target.value)} />
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
                const statusMutationId = updateStatusMutation.variables?.id;
                const isUpdatingStatus = statusMutationId === service.id && updateStatusMutation.isPending;
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
                          <Badge
                            className={cn(
                              'gap-1 text-xs font-semibold border border-transparent',
                              config.className
                            )}
                          >
                            <StatusIcon className={cn('w-3 h-3', config.iconClass)} />
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
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Atualizar status</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={service.status}
                            onValueChange={(value) =>
                              requestStatusChange(service.id, clientName, service.status, value as ServiceStatus)
                            }
                            disabled={isUpdatingStatus || statusDialogOpen}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione status" />
                            </SelectTrigger>
                            <SelectContent>
                              {SERVICE_STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isUpdatingStatus && (
                            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                          )}
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
      <AlertDialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeStatusDialog();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
            <AlertDialogDescription>
              {statusDialogPayload ? (
                <>
                  A ordem <span className="font-semibold">{statusDialogPayload.serviceId}</span> do cliente{' '}
                  <span className="font-semibold">{statusDialogPayload.clientName}</span> será atualizada de{' '}
                  <span className="font-semibold">{statusDialogPayload.currentStatus}</span> para{' '}
                  <span className="font-semibold">{statusDialogPayload.nextStatus}</span>. Deseja continuar?
                </>
              ) : (
                'Deseja alterar o status desta ordem de serviço?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              className="bg-emerald-500 hover:bg-emerald-500/90"
            >
              Confirmar alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
