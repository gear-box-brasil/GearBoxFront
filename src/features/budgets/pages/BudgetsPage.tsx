import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { SearchInput } from '@/components/SearchInput';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  listBudgets,
  listClients,
  listCars,
  listUsers,
  createBudget,
  updateBudget,
  acceptBudget,
  rejectBudget,
} from '@/services/gearbox';
import type { ApiUser, Budget, BudgetStatus, Car, Client } from '@/types/api';
import { BudgetFormDialog } from '@/features/budgets/components/BudgetFormDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

const EMPTY_CLIENTS: Client[] = [];
const EMPTY_CARS: Car[] = [];
const EMPTY_USERS: ApiUser[] = [];
const EMPTY_BUDGETS: Budget[] = [];

const statusConfig: Record<BudgetStatus, { label: string; description: string; badgeClass: string }> = {
  aberto: {
    label: 'Aberto',
    description: 'Aguardando aprovação',
    badgeClass: 'bg-sky-500/10 text-sky-200 border border-sky-400/40',
  },
  aceito: {
    label: 'Aceito',
    description: 'Convertido em serviço',
    badgeClass: 'bg-[hsl(var(--success-light))] text-[hsl(var(--success))] border border-emerald-400/30',
  },
  recusado: {
    label: 'Negado',
    description: 'Recusado pelo cliente',
    badgeClass: 'bg-rose-500/10 text-rose-200 border border-rose-400/40',
  },
  cancelado: {
    label: 'Cancelado',
    description: 'Cancelado ou expirado',
    badgeClass: 'bg-slate-600/20 text-slate-200 border border-slate-500/30',
  },
};

const currencyFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const BUDGET_STATUS_OPTIONS: (BudgetStatus | 'todos')[] = ['todos', 'aberto', 'aceito', 'recusado', 'cancelado'];

export default function BudgetsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BudgetStatus | 'todos'>('todos');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const { token, user, isOwner } = useAuth();
  const isMechanic = user?.role === 'mecanico';
  const [budgetAssignments, setBudgetAssignments] = useState<Record<string, string>>({});
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [budgetToApprove, setBudgetToApprove] = useState<Budget | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const budgetsQuery = useQuery({
    queryKey: ['budgets', token, page],
    queryFn: () => listBudgets(token!, { page, perPage: 10 }),
    enabled: Boolean(token),
    keepPreviousData: true,
  });

  const clientsQuery = useQuery({
    queryKey: ['clients', token, 'budget-map'],
    queryFn: () => listClients(token!, { page: 1, perPage: 100 }),
    enabled: Boolean(token),
  });

  const carsQuery = useQuery({
    queryKey: ['cars', token, 'budget-map'],
    queryFn: () => listCars(token!, { page: 1, perPage: 100 }),
    enabled: Boolean(token),
  });

  const mechanicsQuery = useQuery({
    queryKey: ['users', token, 'budget-mechanics'],
    queryFn: () => listUsers(token!, { page: 1, perPage: 100 }),
    enabled: Boolean(token) && isOwner,
  });

  const createBudgetMutation = useMutation({
    mutationFn: (payload: { clientId: string; carId: string; description: string; amount: number }) =>
      createBudget(token!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const editBudgetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { clientId: string; carId: string; description: string; amount: number } }) =>
      updateBudget(token!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const approveBudgetMutation = useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      acceptBudget(token!, id, { assignedToId }),
    onSuccess: ({ service }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: 'Orçamento aprovado',
        description: `Serviço ${service.id} criado automaticamente.`,
        action: (
          <ToastAction altText="Ver serviço" onClick={() => navigate('/ordens')}>
            Ver serviço
          </ToastAction>
        ),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Não foi possível aprovar o orçamento',
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    },
  });

  const denyBudgetMutation = useMutation({
    mutationFn: (id: string) => rejectBudget(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Orçamento negado',
        description: 'O status foi atualizado para negado.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Não foi possível negar o orçamento',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const clients = clientsQuery.data?.data;
  const cars = carsQuery.data?.data;
  const mechanics = mechanicsQuery.data?.data;
  const budgets = budgetsQuery.data?.data;

  const safeClients = clients ?? EMPTY_CLIENTS;
  const safeCars = cars ?? EMPTY_CARS;
  const safeMechanics = mechanics ?? EMPTY_USERS;

  const activeMechanics = useMemo(
    () => safeMechanics.filter((mechanic) => mechanic.tipo === 'mecanico' && mechanic.ativo),
    [safeMechanics]
  );

  const activeMechanicIds = useMemo(
    () => new Set(activeMechanics.map((mechanic) => mechanic.id)),
    [activeMechanics]
  );

  const getAssignedMechanicId = (budget: Budget): string | undefined => {
    const saved = budgetAssignments[budget.id];
    if (saved) return saved;
    if (budget.userId && activeMechanicIds.has(budget.userId)) return budget.userId;
    return activeMechanics[0]?.id;
  };

  const clientMap = useMemo(() => {
    const entries = safeClients.map((client) => [client.id, client.nome] as const);
    return new Map(entries);
  }, [safeClients]);

  const carMap = useMemo(() => {
    const entries = safeCars.map((car) => [car.id, car] as const);
    return new Map(entries);
  }, [safeCars]);

  const mechanicMap = useMemo(() => {
    const entries = safeMechanics.map((mechanic) => [mechanic.id, mechanic.nome] as const);
    const map = new Map(entries);
    if (user) {
      map.set(user.id, user.name);
    }
    return map;
  }, [safeMechanics, user]);

  const filteredBudgets = useMemo(() => {
    const budgetList = budgets ?? EMPTY_BUDGETS;
    const term = searchTerm.trim().toLowerCase();
    const fromDate = createdFrom ? new Date(createdFrom) : null;
    const toDate = createdTo ? new Date(createdTo) : null;

    const filtered = budgetList.filter((budget) => {
      if (statusFilter !== 'todos' && budget.status !== statusFilter) return false;
      if (fromDate || toDate) {
        const createdAt = budget.createdAt ? new Date(budget.createdAt) : null;
        if (!createdAt) return false;
        if (fromDate && createdAt < fromDate) return false;
        if (toDate && createdAt > toDate) return false;
      }
      if (!term) return true;
      const clientName = clientMap.get(budget.clientId)?.toLowerCase() ?? '';
      const car = carMap.get(budget.carId);
      const vehicleText = car ? `${car.marca} ${car.modelo} ${car.placa}`.toLowerCase() : '';
      const description = budget.description.toLowerCase();
      return (
        budget.id.toLowerCase().includes(term) ||
        clientName.includes(term) ||
        vehicleText.includes(term) ||
        description.includes(term)
      );
    });

    return filtered
      .slice()
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }, [budgets, searchTerm, clientMap, carMap, statusFilter, createdFrom, createdTo]);

  const createDisabled =
    createBudgetMutation.isPending ||
    clientsQuery.isLoading ||
    carsQuery.isLoading ||
    clientsQuery.isError ||
    carsQuery.isError ||
    safeClients.length === 0 ||
    safeCars.length === 0;

  const handleCreateBudget = async (values: {
    clientId: string;
    carId: string;
    description: string;
    amount: number;
  }) => {
    await createBudgetMutation.mutateAsync(values);
  };

  const handleEditBudget = async (id: string, values: {
    clientId: string;
    carId: string;
    description: string;
    amount: number;
  }) => {
    await editBudgetMutation.mutateAsync({ id, data: values });
  };

  const handleSelectMechanic = (budgetId: string, mechanicId: string) => {
    setBudgetAssignments((prev) => ({
      ...prev,
      [budgetId]: mechanicId,
    }));
  };

  const openApprovalDialog = (budget: Budget) => {
    const assigned = getAssignedMechanicId(budget);
    if (assigned) {
      handleSelectMechanic(budget.id, assigned);
    }
    setBudgetToApprove(budget);
    setApprovalDialogOpen(true);
  };

  const closeApprovalDialog = () => {
    setApprovalDialogOpen(false);
    setBudgetToApprove(null);
  };

  const handleConfirmApproval = async () => {
    if (!budgetToApprove) return;

    const assignedToId = getAssignedMechanicId(budgetToApprove);
    if (!assignedToId) {
      toast({
        title: 'Selecione um mecânico ativo',
        description: 'Cadastre ou ative um mecânico antes de aprovar este orçamento.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await approveBudgetMutation.mutateAsync({ id: budgetToApprove.id, assignedToId });
      closeApprovalDialog();
    } catch {
      /* toast is handled by mutation */
    }
  };

  const handleApproveBudget = async (budget: Budget) => {
    if (isOwner) {
      openApprovalDialog(budget);
      return;
    }
    if (!user) return;

    try {
      await approveBudgetMutation.mutateAsync({ id: budget.id, assignedToId: user.id });
    } catch {
      /* toast is handled by mutation */
    }
  };

  const handleDenyBudget = async (id: string) => {
    try {
      await denyBudgetMutation.mutateAsync(id);
    } catch {
      /* toast is handled by mutation */
    }
  };

  const renderBudgetCards = () => {
    if (budgetsQuery.isLoading) {
      return (
        <div className="flex items-center gap-3 text-muted-foreground py-10">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando orçamentos...
        </div>
      );
    }

    if (budgetsQuery.isError) {
      return (
        <p className="text-destructive py-6">
          {budgetsQuery.error instanceof Error
            ? budgetsQuery.error.message
            : 'Erro ao buscar orçamentos'}
        </p>
      );
    }

    if (filteredBudgets.length === 0) {
      return (
        <EmptyState
          title="Nenhum orçamento encontrado"
          description="Cadastre um orçamento ou ajuste os filtros para visualizar registros."
        />
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredBudgets.map((budget) => {
            const car = carMap.get(budget.carId);
            const clientName = clientMap.get(budget.clientId) ?? 'Cliente não localizado';
            const responsibleName =
              budget.user?.nome ??
              (budget.userId
                ? mechanicMap.get(budget.userId) ?? budget.userId.slice(0, 8)
                : '—');
            const config = statusConfig[budget.status];
            const createdAt = budget.createdAt ? dateFormat.format(new Date(budget.createdAt)) : '—';
            const formattedAmount = currencyFormat.format(Number(budget.amount) || 0);
            const approving =
              approveBudgetMutation.variables?.id === budget.id && approveBudgetMutation.isPending;
            const denying = denyBudgetMutation.variables === budget.id && denyBudgetMutation.isPending;
            const canEditBudget = isOwner || budget.userId === user?.id;
            const lastUpdatedName = budget.updatedBy?.nome ?? '—';
            const assignedMechanicId = getAssignedMechanicId(budget);
            const assignedMechanicLabel =
              assignedMechanicId && assignedMechanicId.length
                ? mechanicMap.get(assignedMechanicId) ?? assignedMechanicId.slice(0, 8)
                : '—';
            const hasActiveMechanics = activeMechanics.length > 0;
            const canManageBudget = isOwner || (isMechanic && budget.userId === user?.id);
            const isOpenForApproval = budget.status === 'aberto';
            const approveDisabled =
              !isOpenForApproval ||
              approving ||
              (isOwner && !hasActiveMechanics);

            return (
              <Card
                key={budget.id}
                className="border-border bg-card/80 shadow-md transition hover:shadow-lg"
              >
                <CardContent className="space-y-5 p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Orçamento</p>
                      <p className="text-lg font-semibold text-foreground">{budget.id}</p>
                      <Badge className={cn('mt-2 px-3 py-1 text-xs font-semibold', config.badgeClass)}>
                        {config.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Valor estimado</p>
                      <p className="text-2xl font-semibold text-foreground">{formattedAmount}</p>
                      <p className="text-xs text-muted-foreground mt-1">{createdAt}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-medium text-foreground">{clientName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Responsável pela criação</p>
                      <p className="font-medium text-foreground">{responsibleName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Veículo</p>
                      <p className="font-medium text-foreground">
                        {car ? `${car.marca} ${car.modelo}` : 'Não localizado'}
                      </p>
                      <p className="text-xs text-muted-foreground">{car?.placa ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Criado em</p>
                      <p className="font-medium text-foreground">{createdAt}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Descrição</p>
                    <p className="text-sm text-foreground">{budget.description}</p>
                  </div>

                  <div className="grid gap-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Última atualização feita por</p>
                      <p className="font-medium text-foreground">{lastUpdatedName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Atualizado em</p>
                      <p className="font-medium text-foreground">
                        {budget.updatedAt ? dateFormat.format(new Date(budget.updatedAt)) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
                    <p className="text-xs text-muted-foreground">
                      status: <span className="font-medium text-foreground">{config.label}</span>
                    </p>
                    {isOwner && (
                      <p className="text-xs text-muted-foreground">
                        Mecânico sugerido:{' '}
                        <span className="font-medium text-foreground">{assignedMechanicLabel}</span>
                      </p>
                    )}
                    {isOwner && !hasActiveMechanics && (
                      <p className="text-xs text-destructive">
                        Cadastre um mecânico ativo para aprovar este orçamento.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {canEditBudget ? (
                        <BudgetFormDialog
                          mode="edit"
                          clients={safeClients}
                          cars={safeCars}
                          initialValues={{
                            clientId: budget.clientId,
                            carId: budget.carId,
                            description: budget.description,
                            amount: Number(budget.amount),
                          }}
                          onSubmit={(values) => handleEditBudget(budget.id, values)}
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
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Você não tem permissão para editar este orçamento. Somente o responsável ou o perfil administrador podem alterar este registro.
                        </p>
                      )}
                      {canManageBudget && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                            disabled={approveDisabled}
                            onClick={() => handleApproveBudget(budget)}
                          >
                            {approving ? 'Aprovando...' : 'Aprovar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                            disabled={budget.status !== 'aberto' || denying}
                            onClick={() => handleDenyBudget(budget.id)}
                          >
                            {denying ? 'Negando...' : 'Negar'}
                          </Button>
                        </>
                      )}
                    </div>
                    {!isOwner && canEditBudget && (
                      <p className="text-xs text-muted-foreground">
                        Você pode editar este orçamento porque é o responsável por ele.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {budgetsQuery.data?.meta && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Página {budgetsQuery.data.meta.currentPage} de {budgetsQuery.data.meta.lastPage}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || budgetsQuery.isFetching}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  page === budgetsQuery.data.meta.lastPage || budgetsQuery.isFetching
                }
                onClick={() => setPage((prev) => prev + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  const dialogAssignedMechanicId = budgetToApprove ? getAssignedMechanicId(budgetToApprove) : undefined;
  const dialogApproving =
    budgetToApprove &&
    approveBudgetMutation.variables?.id === budgetToApprove.id &&
    approveBudgetMutation.isPending;
  const dialogApproveDisabled =
    !budgetToApprove ||
    budgetToApprove.status !== 'aberto' ||
    dialogApproving ||
    !dialogAssignedMechanicId ||
    activeMechanics.length === 0;

  return (
    <>
      <div className="page-container bg-gradient-hero rounded-2xl border border-border shadow-lg p-6 md:p-8">
        <PageHeader
          eyebrow="Financeiro"
          title="Orçamentos"
          subtitle="Crie, aprove e acompanhe budgets sem sair do dashboard."
        actions={
          <BudgetFormDialog
            clients={safeClients}
            cars={safeCars}
            onSubmit={handleCreateBudget}
            renderTrigger={({ open, disabled }) => (
              <Button
                className="bg-gradient-accent hover:opacity-90"
                onClick={open}
                disabled={createDisabled || disabled}
              >
                Registrar novo orçamento
              </Button>
            )}
          />
        }
      />

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <SearchInput
          placeholder="Buscar por número, cliente ou veículo..."
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(1);
          }}
          wrapperClassName="max-w-xl"
        />
        <p className="text-xs text-muted-foreground">
          Status em tempo real da API Gear Box
        </p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="space-y-1 text-xs">
          <p className="text-muted-foreground uppercase tracking-wide">Status</p>
          <Select value={statusFilter} onValueChange={(value: typeof statusFilter) => setStatusFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'todos' ? 'Todos' : statusConfig[option as BudgetStatus].label}
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

      <div className="mt-6">{renderBudgetCards()}</div>
      </div>
      <Dialog
        open={approvalDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBudgetToApprove(null);
          }
          setApprovalDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Designar mecânico</DialogTitle>
            <DialogDescription>
              Escolha o profissional responsável por este orçamento antes de confirmar a aprovação.
            </DialogDescription>
          </DialogHeader>
          {budgetToApprove && (
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">Orçamento</p>
              <p className="font-medium text-foreground">{budgetToApprove.id}</p>
              <p className="text-xs text-muted-foreground">
                Cliente: {clientMap.get(budgetToApprove.clientId) ?? '—'}
              </p>
            </div>
          )}
          <div className="space-y-1 text-xs mt-4">
            <p className="text-muted-foreground uppercase tracking-wide">Mecânico responsável</p>
            <Select
              value={dialogAssignedMechanicId}
              onValueChange={(value) => {
                if (budgetToApprove) {
                  handleSelectMechanic(budgetToApprove.id, value);
                }
              }}
              disabled={activeMechanics.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um mecânico" />
              </SelectTrigger>
              <SelectContent>
                {activeMechanics.map((mechanic) => (
                  <SelectItem key={mechanic.id} value={mechanic.id}>
                    {mechanic.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeMechanics.length === 0 && (
              <p className="text-xs text-destructive">
                Cadastre um mecânico ativo antes de concluir a aprovação.
              </p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeApprovalDialog}>
              Cancelar
            </Button>
            <Button disabled={dialogApproveDisabled} onClick={handleConfirmApproval}>
              {dialogApproving ? 'Aprovando...' : 'Confirmar aprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
