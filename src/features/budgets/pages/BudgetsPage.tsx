import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  listBudgets,
  listClients,
  listCars,
  listUsers,
  createBudget,
  updateBudget,
  acceptBudget,
  rejectBudget,
} from "@/services/gearbox";
import type { ApiUser, Budget, BudgetStatus, Car, Client } from "@/types/api";
import { BudgetFormDialog } from "@/features/budgets/components/BudgetFormDialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useTranslation } from "react-i18next";

const EMPTY_CLIENTS: Client[] = [];
const EMPTY_CARS: Car[] = [];
const EMPTY_USERS: ApiUser[] = [];
const EMPTY_BUDGETS: Budget[] = [];

const statusConfig = (
  t: (key: string) => string
): Record<
  BudgetStatus,
  { label: string; description: string; badgeClass: string }
> => ({
  aberto: {
    label: t("budgets.status.aberto"),
    description: t("budgets.status.aberto"),
    badgeClass:
      "bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-200 border border-sky-200 dark:border-sky-400/40",
  },
  aceito: {
    label: t("budgets.status.aceito"),
    description: t("budgets.status.aceito"),
    badgeClass:
      "bg-[hsl(var(--success-light))] text-[hsl(var(--success))] border border-emerald-400/30",
  },
  recusado: {
    label: t("budgets.status.recusado"),
    description: t("budgets.status.recusado"),
    badgeClass:
      "bg-destructive-light text-destructive border border-destructive/30",
  },
  cancelado: {
    label: t("budgets.status.cancelado"),
    description: t("budgets.status.cancelado"),
    badgeClass: "bg-muted text-muted-foreground border border-border",
  },
});

const currencyFormat = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const BUDGET_STATUS_OPTIONS: (BudgetStatus | "todos")[] = [
  "todos",
  "aberto",
  "aceito",
  "recusado",
  "cancelado",
];

export default function BudgetsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BudgetStatus | "todos">(
    "todos"
  );
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const { token, user, isOwner } = useAuth();
  const isMechanic = user?.role === "mecanico";
  const [budgetAssignments, setBudgetAssignments] = useState<
    Record<string, string>
  >({});
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [budgetToApprove, setBudgetToApprove] = useState<Budget | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const budgetsQuery = useQuery({
    queryKey: ["budgets", token, page],
    queryFn: () => listBudgets(token!, { page, perPage: 10 }),
    enabled: Boolean(token),
    keepPreviousData: true,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", token, "budget-map"],
    queryFn: () => listClients(token!, { page: 1, perPage: 100 }),
    enabled: Boolean(token),
  });

  const carsQuery = useQuery({
    queryKey: ["cars", token, "budget-map"],
    queryFn: () => listCars(token!, { page: 1, perPage: 100 }),
    enabled: Boolean(token),
  });

  const mechanicsQuery = useQuery({
    queryKey: ["users", token, "budget-mechanics"],
    queryFn: () => listUsers(token!, { page: 1, perPage: 100 }),
    enabled: Boolean(token) && isOwner,
  });

  const createBudgetMutation = useMutation({
    mutationFn: (payload: {
      clientId: string;
      carId: string;
      description: string;
      amount: number;
    }) => createBudget(token!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  const editBudgetMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        clientId: string;
        carId: string;
        description: string;
        amount: number;
      };
    }) => updateBudget(token!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  const approveBudgetMutation = useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      acceptBudget(token!, id, { assignedToId }),
    onSuccess: ({ service }) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({
        title: t("budgets.toasts.approveTitle"),
        description: t("budgets.toasts.approveDescription", { id: service.id }),
        action: (
          <ToastAction
            altText={t("orders.table.actions")}
            onClick={() => navigate("/ordens")}
          >
            {t("navigation.orders")}
          </ToastAction>
        ),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("budgets.toasts.approveError"),
        description:
          error instanceof Error
            ? error.message
            : t("budgets.toasts.defaultError"),
        variant: "destructive",
      });
    },
  });

  const denyBudgetMutation = useMutation({
    mutationFn: (id: string) => rejectBudget(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({
        title: t("budgets.toasts.rejectTitle"),
        description: t("budgets.toasts.rejectDescription"),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("budgets.toasts.rejectError"),
        description:
          error instanceof Error
            ? error.message
            : t("budgets.toasts.defaultError"),
        variant: "destructive",
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

  const statusConfigMap = useMemo(() => statusConfig(t), [t]);

  const activeMechanics = useMemo(
    () =>
      safeMechanics.filter(
        (mechanic) => mechanic.tipo === "mecanico" && mechanic.ativo
      ),
    [safeMechanics]
  );

  const activeMechanicIds = useMemo(
    () => new Set(activeMechanics.map((mechanic) => mechanic.id)),
    [activeMechanics]
  );

  const getAssignedMechanicId = (budget: Budget): string | undefined => {
    const saved = budgetAssignments[budget.id];
    if (saved) return saved;
    if (budget.userId && activeMechanicIds.has(budget.userId))
      return budget.userId;
    return activeMechanics[0]?.id;
  };

  const clientMap = useMemo(() => {
    const entries = safeClients.map(
      (client) => [client.id, client.nome] as const
    );
    return new Map(entries);
  }, [safeClients]);

  const carMap = useMemo(() => {
    const entries = safeCars.map((car) => [car.id, car] as const);
    return new Map(entries);
  }, [safeCars]);

  const mechanicMap = useMemo(() => {
    const entries = safeMechanics.map(
      (mechanic) => [mechanic.id, mechanic.nome] as const
    );
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
      if (statusFilter !== "todos" && budget.status !== statusFilter)
        return false;
      if (fromDate || toDate) {
        const createdAt = budget.createdAt ? new Date(budget.createdAt) : null;
        if (!createdAt) return false;
        if (fromDate && createdAt < fromDate) return false;
        if (toDate && createdAt > toDate) return false;
      }
      if (!term) return true;
      const clientName = clientMap.get(budget.clientId)?.toLowerCase() ?? "";
      const car = carMap.get(budget.carId);
      const vehicleText = car
        ? `${car.marca} ${car.modelo} ${car.placa}`.toLowerCase()
        : "";
      const description = budget.description.toLowerCase();
      return (
        budget.id.toLowerCase().includes(term) ||
        clientName.includes(term) ||
        vehicleText.includes(term) ||
        description.includes(term)
      );
    });

    return filtered.slice().sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [
    budgets,
    searchTerm,
    clientMap,
    carMap,
    statusFilter,
    createdFrom,
    createdTo,
  ]);

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

  const handleEditBudget = async (
    id: string,
    values: {
      clientId: string;
      carId: string;
      description: string;
      amount: number;
    }
  ) => {
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
        title: t("common.roles.mechanic"),
        description: t("budgets.messages.noPermission"),
        variant: "destructive",
      });
      return;
    }

    try {
      await approveBudgetMutation.mutateAsync({
        id: budgetToApprove.id,
        assignedToId,
      });
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
      await approveBudgetMutation.mutateAsync({
        id: budget.id,
        assignedToId: user.id,
      });
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
          {t("charts.placeholder.loading")}
        </div>
      );
    }

    if (budgetsQuery.isError) {
      return (
        <p className="text-destructive py-6">
          {budgetsQuery.error instanceof Error
            ? budgetsQuery.error.message
            : t("emptyState.error")}
        </p>
      );
    }

    if (filteredBudgets.length === 0) {
      return (
        <EmptyState
          title={t("budgets.table.empty")}
          description={t("budgets.subtitle")}
        />
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredBudgets.map((budget) => {
            const car = carMap.get(budget.carId);
            const clientName =
              clientMap.get(budget.clientId) ?? "Cliente não localizado";
            const responsibleName =
              budget.user?.nome ??
              (budget.userId
                ? mechanicMap.get(budget.userId) ?? budget.userId.slice(0, 8)
                : "—");
            const config =
              statusConfigMap[budget.status] ?? statusConfigMap.aberto;
            const createdAt = budget.createdAt
              ? dateFormat.format(new Date(budget.createdAt))
              : "—";
            const formattedAmount = currencyFormat.format(
              Number(budget.amount) || 0
            );
            const approving =
              approveBudgetMutation.variables?.id === budget.id &&
              approveBudgetMutation.isPending;
            const denying =
              denyBudgetMutation.variables === budget.id &&
              denyBudgetMutation.isPending;
            const canEditBudget = isOwner || budget.userId === user?.id;
            const lastUpdatedName = budget.updatedBy?.nome ?? "—";
            const assignedMechanicId = getAssignedMechanicId(budget);
            const assignedMechanicLabel =
              assignedMechanicId && assignedMechanicId.length
                ? mechanicMap.get(assignedMechanicId) ??
                  assignedMechanicId.slice(0, 8)
                : "—";
            const hasActiveMechanics = activeMechanics.length > 0;
            const canManageBudget =
              isOwner || (isMechanic && budget.userId === user?.id);
            const isOpenForApproval = budget.status === "aberto";
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
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Orçamento
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {budget.id}
                      </p>
                      <Badge
                        className={cn(
                          "mt-2 px-3 py-1 text-xs font-semibold",
                          config.badgeClass
                        )}
                      >
                        {config.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {config.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {t("budgets.table.amount")}
                      </p>
                      <p className="text-2xl font-semibold text-foreground">
                        {formattedAmount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {createdAt}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("budgets.table.client")}
                      </p>
                      <p className="font-medium text-foreground">
                        {clientName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("orders.table.actions")}
                      </p>
                      <p className="font-medium text-foreground">
                        {responsibleName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("budgets.table.vehicle")}
                      </p>
                      <p className="font-medium text-foreground">
                        {car
                          ? `${car.marca} ${car.modelo}`
                          : t("common.empty.noData")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {car?.placa ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("budgets.table.createdAt")}
                      </p>
                      <p className="font-medium text-foreground">{createdAt}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("orders.table.order")}
                    </p>
                    <p className="text-sm text-foreground">
                      {budget.description ?? t("common.empty.noData")}
                    </p>
                  </div>

                  <div className="grid gap-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("orders.table.status")}
                      </p>
                      <p className="font-medium text-foreground">
                        {lastUpdatedName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("budgets.table.createdAt")}
                      </p>
                      <p className="font-medium text-foreground">
                        {budget.updatedAt
                          ? dateFormat.format(new Date(budget.updatedAt))
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
                    <p className="text-xs text-muted-foreground">
                      status:{" "}
                      <span className="font-medium text-foreground">
                        {config.label}
                      </span>
                    </p>
                    {isOwner && (
                      <p className="text-xs text-muted-foreground">
                        {t("common.roles.mechanic")}:{" "}
                        <span className="font-medium text-foreground">
                          {assignedMechanicLabel}
                        </span>
                      </p>
                    )}
                    {isOwner && !hasActiveMechanics && (
                      <p className="text-xs text-destructive">
                        {t("budgets.toasts.approveError")}
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
                          onSubmit={(values) =>
                            handleEditBudget(budget.id, values)
                          }
                          renderTrigger={({ open, disabled }) => (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-warning/30 bg-warning-light text-warning hover:bg-warning-light/80"
                              onClick={open}
                              disabled={disabled}
                            >
                              {t("common.actions.edit")}
                            </Button>
                          )}
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {t("budgets.messages.noPermission")}
                        </p>
                      )}
                      {canManageBudget && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-success/30 bg-success-light text-success hover:bg-success-light/80"
                            disabled={approveDisabled}
                            onClick={() => handleApproveBudget(budget)}
                          >
                            {approving
                              ? t("budgets.toasts.approveTitle")
                              : t("common.actions.confirm")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/30 bg-destructive-light text-destructive hover:bg-destructive-light/80"
                            disabled={budget.status !== "aberto" || denying}
                            onClick={() => handleDenyBudget(budget.id)}
                          >
                            {denying
                              ? t("budgets.toasts.rejectTitle")
                              : t("common.actions.delete")}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {budgetsQuery.data?.meta && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              {t("budgets.pagination.page")}{" "}
              {budgetsQuery.data.meta.currentPage} /{" "}
              {budgetsQuery.data.meta.lastPage}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || budgetsQuery.isFetching}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                {t("budgets.pagination.prev")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  page === budgetsQuery.data.meta.lastPage ||
                  budgetsQuery.isFetching
                }
                onClick={() => setPage((prev) => prev + 1)}
              >
                {t("budgets.pagination.next")}
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  const dialogAssignedMechanicId = budgetToApprove
    ? getAssignedMechanicId(budgetToApprove)
    : undefined;
  const dialogApproving =
    budgetToApprove &&
    approveBudgetMutation.variables?.id === budgetToApprove.id &&
    approveBudgetMutation.isPending;
  const dialogApproveDisabled =
    !budgetToApprove ||
    budgetToApprove.status !== "aberto" ||
    dialogApproving ||
    !dialogAssignedMechanicId ||
    activeMechanics.length === 0;

  return (
    <>
      <div className="page-container bg-gradient-hero rounded-2xl border border-border shadow-lg p-6 md:p-8">
        <PageHeader
          eyebrow={t("owner.header.eyebrow")}
          title={t("budgets.title")}
          subtitle={t("budgets.subtitle")}
          actions={
            <BudgetFormDialog
              clients={safeClients}
              cars={safeCars}
              onSubmit={handleCreateBudget}
              renderTrigger={({ open, disabled }) => (
                <Button
                  className="gap-2 bg-gradient-accent hover:opacity-90"
                  onClick={open}
                  disabled={createDisabled || disabled}
                >
                  <Plus className="w-4 h-4" />
                  {t("common.actions.createBudget")}
                </Button>
              )}
            />
          }
        />

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <SearchInput
            placeholder={t("budgets.search")}
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            wrapperClassName="max-w-xl"
          />
          <p className="text-xs text-muted-foreground">
            {t("owner.header.subtitle")}
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground uppercase tracking-wide">
              {t("budgets.filters.status")}
            </p>
            <Select
              value={statusFilter}
              onValueChange={(value: typeof statusFilter) =>
                setStatusFilter(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("budgets.filters.all")} />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "todos"
                      ? t("budgets.filters.all")
                      : statusConfigMap[option as BudgetStatus].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground uppercase tracking-wide">
              {t("budgets.filters.dateFrom")}
            </p>
            <Input
              type="date"
              value={createdFrom}
              onChange={(event) => setCreatedFrom(event.target.value)}
            />
          </div>
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground uppercase tracking-wide">
              {t("budgets.filters.dateTo")}
            </p>
            <Input
              type="date"
              value={createdTo}
              onChange={(event) => setCreatedTo(event.target.value)}
            />
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
            <DialogTitle>{t("common.actions.confirm")}</DialogTitle>
            <DialogDescription>{t("owner.header.subtitle")}</DialogDescription>
          </DialogHeader>
          {budgetToApprove && (
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">
                {t("budgets.table.code")}
              </p>
              <p className="font-medium text-foreground">
                {budgetToApprove.id}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("budgets.table.client")}:{" "}
                {clientMap.get(budgetToApprove.clientId) ?? "—"}
              </p>
            </div>
          )}
          <div className="space-y-1 text-xs mt-4">
            <p className="text-muted-foreground uppercase tracking-wide">
              {t("common.roles.mechanic")}
            </p>
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
                <SelectValue placeholder={t("common.roles.mechanic")} />
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
                {t("budgets.toasts.approveError")}
              </p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeApprovalDialog}>
              {t("common.actions.cancel")}
            </Button>
            <Button
              disabled={dialogApproveDisabled}
              onClick={handleConfirmApproval}
            >
              {dialogApproving
                ? t("common.actions.loggingIn")
                : t("common.actions.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
