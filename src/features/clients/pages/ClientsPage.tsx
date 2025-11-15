import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, Loader2, Car, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { SearchInput } from '@/components/SearchInput';
import { EmptyState } from '@/components/EmptyState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  listClients,
  listCars,
  createClient,
  updateClient,
  deleteClient,
  createCar,
} from '@/services/gearbox';
import type { Client, Car as CarType } from '@/types/api';
import { ClientFormDialog } from '@/features/clients/components/ClientFormDialog';
import { ClientCarDialog } from '@/features/clients/components/ClientCarDialog';

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const { token, isOwner } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const clientsQuery = useQuery({
    queryKey: ['clients', token, page],
    queryFn: () => listClients(token!, { page, perPage: 9 }),
    enabled: Boolean(token),
    keepPreviousData: true,
  });

  const carsQuery = useQuery({
    queryKey: ['cars', token, 'clients-page'],
    queryFn: () => listCars(token!, { page: 1, perPage: 200 }),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });

  const createClientMutation = useMutation({
    mutationFn: (payload: { nome: string; telefone: string; email?: string }) => createClient(token!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nome: string; telefone: string; email?: string } }) =>
      updateClient(token!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id: string) => deleteClient(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Cliente removido',
        description: 'O cadastro foi excluído com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Não foi possível remover o cliente',
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    },
  });

  const createCarMutation = useMutation({
    mutationFn: (payload: { clientId: string; placa: string; marca: string; modelo: string; ano: number }) =>
      createCar(token!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
    },
  });

  const clients = useMemo(() => clientsQuery.data?.data ?? [], [clientsQuery.data]);
  const cars = useMemo(() => carsQuery.data?.data ?? [], [carsQuery.data]);

  const carsByClient = useMemo(() => groupCarsByClient(cars), [cars]);

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => {
      const matchesBase =
        client.nome.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.telefone.toLowerCase().includes(term);
      if (matchesBase) return true;
      const clientCars = carsByClient.get(client.id) ?? [];
      return clientCars.some((car) => `${car.marca} ${car.modelo} ${car.placa}`.toLowerCase().includes(term));
    });
  }, [clients, searchTerm, carsByClient]);

  const isLoading = clientsQuery.isLoading || carsQuery.isLoading;
  const isError = clientsQuery.isError || carsQuery.isError;

  const handleCreateClient = (values: { nome: string; telefone: string; email?: string }) =>
    createClientMutation.mutateAsync(values);

  const handleEditClient = (id: string, values: { nome: string; telefone: string; email?: string }) =>
    updateClientMutation.mutateAsync({ id, data: values });

  const handleDeleteClient = (id: string) => deleteClientMutation.mutateAsync(id);

  const handleAddCar = (values: { clientId: string; placa: string; marca: string; modelo: string; ano: number }) =>
    createCarMutation.mutateAsync(values);

  return (
    <div className="page-container bg-gradient-hero rounded-2xl border border-border shadow-lg p-6 md:p-8">
      <PageHeader
        eyebrow="Relacionamento"
        title="Clientes"
        subtitle="Cadastre clientes, edite dados e associe veículos direto deste painel."
        actions={
          <ClientFormDialog
            onSubmit={handleCreateClient}
            renderTrigger={({ open, disabled }) => (
              <Button className="bg-gradient-accent hover:opacity-90" onClick={open} disabled={disabled}>
                Registrar novo cliente
              </Button>
            )}
          />
        }
      />

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <SearchInput
          placeholder="Buscar por cliente, e-mail, telefone ou veículo..."
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(1);
          }}
          wrapperClassName="max-w-xl"
        />
        <p className="text-xs text-muted-foreground">{clientsQuery.data?.meta?.total ?? 0} clientes ativos</p>
      </div>

      {isLoading ? (
        <div className="mt-10 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando clientes...
        </div>
      ) : isError ? (
        <p className="mt-10 text-destructive">
          {clientsQuery.error instanceof Error
            ? clientsQuery.error.message
            : carsQuery.error instanceof Error
            ? carsQuery.error.message
            : 'Erro ao carregar clientes'}
        </p>
      ) : filteredClients.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Cadastre um novo cliente ou ajuste o termo de busca."
          />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {filteredClients.map((client) => {
              const clientCars = carsByClient.get(client.id) ?? [];
              const createdBy = client.createdByUser?.nome ?? '—';
              const updatedBy = client.updatedByUser?.nome ?? '—';
              const createdAt = client.createdAt
                ? new Date(client.createdAt).toLocaleDateString('pt-BR')
                : '—';
              const updatedAt = client.updatedAt
                ? new Date(client.updatedAt).toLocaleDateString('pt-BR')
                : '—';
              const deleting = deleteClientMutation.variables === client.id && deleteClientMutation.isPending;

              return (
                <Card key={client.id} className="border-border shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="space-y-5 p-6">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
                      <h3 className="text-xl font-semibold text-foreground">{client.nome}</h3>
                      <p className="text-xs text-muted-foreground">ID: {client.id}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">E-mail</p>
                          <p className="text-sm text-foreground">{client.email ?? 'Não informado'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Telefone</p>
                          <p className="text-sm text-foreground">{client.telefone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Veículos vinculados</p>
                          <p className="text-sm font-semibold text-foreground">{clientCars.length || 'Nenhum'}</p>
                        </div>
                        <ClientCarDialog
                          clientId={client.id}
                          clientName={client.nome}
                          onSubmit={handleAddCar}
                          renderTrigger={({ open, disabled }) => (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-sky-400/60 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20"
                              onClick={open}
                              disabled={disabled || createCarMutation.isPending}
                            >
                              <Car className="mr-1 h-3.5 w-3.5" />
                              Adicionar carro
                            </Button>
                          )}
                        />
                      </div>
                      {clientCars.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {clientCars.map((car) => (
                            <Badge key={car.id} variant="outline" className="text-xs">
                              {car.placa} · {car.marca} {car.modelo}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Nenhum veículo cadastrado para este cliente.
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2 rounded-lg border border-border/60 bg-background/30 p-4 text-sm text-muted-foreground">
                      <p>
                        Cadastrado por <span className="font-semibold text-foreground">{createdBy}</span> em {createdAt}
                      </p>
                      <p>
                        Atualizado por <span className="font-semibold text-foreground">{updatedBy}</span> em {updatedAt}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <ClientFormDialog
                        mode="edit"
                        initialValues={{
                          nome: client.nome,
                          telefone: client.telefone,
                          email: client.email ?? '',
                        }}
                        onSubmit={(values) => handleEditClient(client.id, values)}
                        renderTrigger={({ open, disabled }) => (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-400/60 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                            onClick={open}
                            disabled={disabled}
                          >
                            Editar
                          </Button>
                        )}
                      />
                      {isOwner && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-rose-400/60 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                              disabled={deleting}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              {deleting ? 'Excluindo...' : 'Excluir'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover cliente</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação remove {client.nome} e todos os veículos vinculados. Deseja continuar?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteClient(client.id)}
                                className="bg-rose-500 hover:bg-rose-500/90"
                              >
                                Confirmar exclusão
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {clientsQuery.data?.meta && (
            <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Página {clientsQuery.data.meta.currentPage} de {clientsQuery.data.meta.lastPage}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1 || clientsQuery.isFetching}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    page === clientsQuery.data.meta.lastPage || clientsQuery.isFetching
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
  );
}

function groupCarsByClient(cars: CarType[]) {
  const map = new Map<string, CarType[]>();
  cars.forEach((car) => {
    const existing = map.get(car.clientId);
    if (existing) {
      existing.push(car);
    } else {
      map.set(car.clientId, [car]);
    }
  });
  return map;
}
