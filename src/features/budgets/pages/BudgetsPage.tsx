/*
 * Gear Box – Sistema de Gestão para Oficinas Mecânicas
 * Copyright (C) 2025 Gear Box
 *
 * Este arquivo é parte do Gear Box.
 * O Gear Box é software livre: você pode redistribuí-lo e/ou modificá-lo
 * sob os termos da GNU Affero General Public License, versão 3,
 * conforme publicada pela Free Software Foundation.
 *
 * Este programa é distribuído na esperança de que seja útil,
 * mas SEM QUALQUER GARANTIA; sem mesmo a garantia implícita de
 * COMERCIABILIDADE ou ADEQUAÇÃO A UM DETERMINADO FIM.
 * Consulte a GNU AGPLv3 para mais detalhes.
 *
 * Você deve ter recebido uma cópia da GNU AGPLv3 junto com este programa.
 * Caso contrário, veja <https://www.gnu.org/licenses/>.
 */

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  listUsers,
  createBudget,
  updateBudget,
  acceptBudget,
  rejectBudget,
} from "@/services/gearbox";
import type { ApiUser, Budget, BudgetStatus, Car, Client } from "@/types/api";
import { ApiError } from "@/lib/api";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { useBudgets } from "@/hooks/useBudgets";
import { useClients } from "@/hooks/useClients";
import { useCars } from "@/hooks/useCars";
import { gearboxKeys } from "@/lib/queryKeys";

const EMPTY_CLIENTS: Client[] = [];
const EMPTY_CARS: Car[] = [];
const EMPTY_USERS: ApiUser[] = [];
const EMPTY_BUDGETS: Budget[] = [];

const extractApiErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    const payload = error.payload as
      | { error?: string; message?: string; errors?: Array<{ message?: string }> }
      | undefined;
    if (payload?.errors && payload.errors.length > 0) {
      const message = payload.errors[0]?.message;
      if (message) return message;
    }
    if (typeof payload?.error === "string") return payload.error;
    if (typeof payload?.message === "string") return payload.message;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return null;
};

const normalizeErrorMessage = (
  message: string | null,
  fallback: string,
) => {
  if (!message) return fallback;
  if (/\b(select|update|delete|insert)\b/i.test(message)) return fallback;
  return message;
};

const statusConfig = (
  t: (key: string) => string,
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
];

const BudgetDescription = ({ description }: { description: string }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const shouldTruncate = description && description.length > 150;

  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
        Descrição
      </p>
      <div className="bg-muted/30 p-3 rounded-md border border-border/50">
        <p
          className={cn(
            "text-sm text-foreground whitespace-pre-wrap break-words",
            shouldTruncate && "line-clamp-3",
          )}
        >
          {description || t("common.empty.noData")}
        </p>
        {shouldTruncate && (
          <>
            <Button
              variant="link"
              className="h-auto p-0 text-xs mt-1 text-primary font-semibold"
              onClick={() => setIsOpen(true)}
            >
              Ver mais
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Descrição do Orçamento</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {description}
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={() => setIsOpen(false)}>Fechar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
};

export default function BudgetsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BudgetStatus | "todos">(
    "todos",
  );
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const { token, user, isOwner } = useAuth();
  const [budgetAssignments, setBudgetAssignments] = useState<
    Record<string, string>
  >({});
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [budgetToApprove, setBudgetToApprove] = useState<Budget | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    action: "edit" | "approve" | "cancel";
    proceed: () => Promise<void> | void;
    resolve?: () => void;
    reject?: (error?: unknown) => void;
  } | null>(null);
  const confirmDialogActionRef = useRef<"confirm" | "cancel" | null>(null);
  const confirmDialogSettledRef = useRef(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const normalizedSearch = searchTerm.trim();
  const [optimisticStatuses, setOptimisticStatuses] = useState<
    Record<string, BudgetStatus | undefined>
  >({});
  const [lastApprovedService, setLastApprovedService] = useState<{
    budgetId: string;
    serviceId: string;
  } | null>(null);

  const setOptimisticStatus = useCallback(
    (budgetId: string, status?: BudgetStatus) => {
      if (!budgetId) return;
      setOptimisticStatuses((current) => {
        const next = { ...current };
        if (status) {
          next[budgetId] = status;
        } else {
          delete next[budgetId];
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (budgetsQuery.data) {
      setOptimisticStatuses({});
    }
  }, [budgetsQuery.data]);

  const budgetsQuery = useBudgets({
    page,
    perPage: 10,
    search: normalizedSearch || undefined,
    filters: {
      startDate: createdFrom || null,
      endDate: createdTo || null,
    },
  });
  const clientsQuery = useClients({ page: 1, perPage: 200 });
  const carsQuery = useCars({ page: 1, perPage: 200 });

  const mechanicsQuery = useQuery({
    queryKey: gearboxKeys.users.list({ page: 1, perPage: 100 }),
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
      queryClient.invalidateQueries({ queryKey: gearboxKeys.budgets.all });
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
      queryClient.invalidateQueries({ queryKey: gearboxKeys.budgets.all });
    },
  });

  const approveBudgetMutation = useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      acceptBudget(token!, id, { assignedToId, confirm: true }),
    onSuccess: ({ service }, variables) => {
      queryClient.invalidateQueries({ queryKey: gearboxKeys.budgets.all });
      queryClient.invalidateQueries({ queryKey: gearboxKeys.services.all });
      if (variables?.id) {
        setOptimisticStatus(variables.id, "aceito");
      }
      setLastApprovedService({
        budgetId: service.budgetId ?? "",
        serviceId: service.id,
      });
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
    onError: (error: unknown, variables) => {
      if (variables?.id) {
        setOptimisticStatus(variables.id, undefined);
      }
      const description = normalizeErrorMessage(
        extractApiErrorMessage(error),
        t("budgets.toasts.defaultError"),
      );
      toast({
        title: t("budgets.toasts.approveError"),
        description,
        variant: "destructive",
      });
    },
  });

  const denyBudgetMutation = useMutation({
    mutationFn: (id: string) => rejectBudget(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gearboxKeys.budgets.all });
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

  const clients = clientsQuery.data?.list;
  const cars = carsQuery.data?.list;
  const mechanics = mechanicsQuery.data?.data;
  const budgets = budgetsQuery.data?.list;

  const safeClients = clients ?? EMPTY_CLIENTS;
  const safeCars = cars ?? EMPTY_CARS;
  const safeMechanics = mechanics ?? EMPTY_USERS;

  const statusConfigMap = useMemo(() => statusConfig(t), [t]);

  const activeMechanics = useMemo(
    () =>
      safeMechanics.filter(
        (mechanic) => mechanic.tipo === "mecanico" && mechanic.ativo,
      ),
    [safeMechanics],
  );

  const activeMechanicIds = useMemo(
    () => new Set(activeMechanics.map((mechanic) => mechanic.id)),
    [activeMechanics],
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
      (client) => [client.id, client.nome] as const,
    );
    return new Map(entries);
  }, [safeClients]);

  const carMap = useMemo(() => {
    const entries = safeCars.map((car) => [car.id, car] as const);
    return new Map(entries);
  }, [safeCars]);

  const mechanicMap = useMemo(() => {
    const entries = safeMechanics.map(
      (mechanic) => [mechanic.id, mechanic.nome] as const,
    );
    const map = new Map(entries);
    if (user) {
      map.set(user.id, user.name);
    }
    return map;
  }, [safeMechanics, user]);

  const isBudgetOwnedByUser = useCallback(
    (budget: Budget) => {
      if (isOwner) return true;
      const mechanicId = user?.id;
      if (!mechanicId) return false;
      return (
        budget.userId === mechanicId ||
        budget.user?.id === mechanicId ||
        budget.updatedBy?.id === mechanicId ||
        budget.createdById === mechanicId ||
        budget.createdBy?.id === mechanicId
      );
    },
    [isOwner, user?.id],
  );

  const filteredBudgets = useMemo(() => {
    const budgetList = budgetsQuery.data
      ? isOwner
        ? (budgets ?? EMPTY_BUDGETS)
        : (budgets ?? EMPTY_BUDGETS).filter(isBudgetOwnedByUser)
      : EMPTY_BUDGETS;
    const term = searchTerm.trim().toLowerCase();
    const fromDate = createdFrom ? new Date(createdFrom) : null;
    const toDate = createdTo ? new Date(createdTo) : null;

    const filtered = budgetList.filter((budget) => {
      const currentStatus =
        optimisticStatuses[budget.id] ?? budget.status;
      if (statusFilter !== "todos" && currentStatus !== statusFilter)
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
    budgetsQuery.data,
    isOwner,
    isBudgetOwnedByUser,
    searchTerm,
    clientMap,
    carMap,
    statusFilter,
    createdFrom,
    createdTo,
    optimisticStatuses,
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
    prazoEstimadoDias?: number | null;
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
      prazoEstimadoDias?: number | null;
    },
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
      setOptimisticStatus(budgetToApprove.id, "aceito");
      await approveBudgetMutation.mutateAsync({
        id: budgetToApprove.id,
        assignedToId,
      });
      closeApprovalDialog();
    } catch (error) {
      setOptimisticStatus(budgetToApprove.id, undefined);
      if (error instanceof ApiError || error instanceof Error) {
        const description = normalizeErrorMessage(
          extractApiErrorMessage(error),
          t("budgets.toasts.defaultError"),
        );
        toast({
          title: t("budgets.toasts.approveError"),
          description,
          variant: "destructive",
        });
      }
    }
  };

  const handleApproveBudget = async (budget: Budget) => {
    if (isOwner) {
      openApprovalDialog(budget);
      return;
    }
    if (!user || !isBudgetOwnedByUser(budget)) {
      toast({
        title: t("budgets.toasts.approveError"),
        description: t("budgets.messages.noPermission"),
        variant: "destructive",
      });
      return;
    }
    try {
      setOptimisticStatus(budget.id, "aceito");
      await approveBudgetMutation.mutateAsync({
        id: budget.id,
        assignedToId: user.id,
      });
    } catch (error) {
      setOptimisticStatus(budget.id, undefined);
      if (error instanceof ApiError || error instanceof Error) {
        const description = normalizeErrorMessage(
          extractApiErrorMessage(error),
          t("budgets.toasts.defaultError"),
        );
        toast({
          title: t("budgets.toasts.approveError"),
          description,
          variant: "destructive",
        });
      }
    }
  };

  const handleDenyBudget = async (id: string) => {
    const budget = budgets?.find((item) => item.id === id);
    if (!isOwner && (!budget || !isBudgetOwnedByUser(budget))) {
      toast({
        title: t("budgets.toasts.rejectError"),
        description: t("budgets.messages.noPermission"),
        variant: "destructive",
      });
      return;
    }
    try {
      await denyBudgetMutation.mutateAsync(id);
    } catch {
      /* toast is handled by mutation */
    }
  };

  const renderBudgetCards = () => {
    if (budgetsQuery.isLoading) {
      return (
        <div
          className="flex items-center gap-3 text-muted-foreground py-10"
          role="status"
          aria-live="polite"
        >
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
            const effectiveStatus =
              optimisticStatuses[budget.id] ?? budget.status;
            const car = carMap.get(budget.carId);
            const clientName =
              clientMap.get(budget.clientId) ?? "Cliente não localizado";
            const responsibleName =
              budget.user?.nome ??
              (budget.userId
                ? (mechanicMap.get(budget.userId) ?? budget.userId.slice(0, 8))
                : "—");
            const config =
              statusConfigMap[effectiveStatus] ?? statusConfigMap.aberto;
            const createdAt = budget.createdAt
              ? dateFormat.format(new Date(budget.createdAt))
              : "—";
            const formattedAmount = currencyFormat.format(
              Number(budget.amount) || 0,
            );
            const approving =
              approveBudgetMutation.variables?.id === budget.id &&
              approveBudgetMutation.isPending;
            const denying =
              denyBudgetMutation.variables === budget.id &&
              denyBudgetMutation.isPending;
            const isBudgetOwner = isBudgetOwnedByUser(budget);
            const canEditBudget = isBudgetOwner;
            const lastUpdatedName = budget.updatedBy?.nome ?? "—";
            const assignedMechanicId = getAssignedMechanicId(budget);
            const assignedMechanicLabel =
              assignedMechanicId && assignedMechanicId.length
                ? (mechanicMap.get(assignedMechanicId) ??
                  assignedMechanicId.slice(0, 8))
                : "—";
            const hasActiveMechanics = activeMechanics.length > 0;
            const canManageBudget = isBudgetOwner;
            const isOpenForApproval = effectiveStatus === "aberto";
            const approveDisabled =
              !isOpenForApproval ||
              approving ||
              (isOwner && !hasActiveMechanics) ||
              (!isOwner && !isBudgetOwner);
            const isAssignedToAnother =
              !isOwner && user && budget.userId && budget.userId !== user.id;
            const estimatedDays =
              budget.prazoEstimadoDias !== undefined &&
              budget.prazoEstimadoDias !== null &&
              Number.isFinite(budget.prazoEstimadoDias)
                ? budget.prazoEstimadoDias
                : null;

            return (
              <Card
                key={budget.id}
                className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
              >
                <CardContent className="space-y-4 p-4 md:space-y-5 md:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {clientName}
                      </p>
                      <div className="mt-1">
                        <p className="text-sm font-medium text-foreground">
                          {car
                            ? `${car.marca} ${car.modelo}`
                            : t("common.empty.noData")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {car?.placa ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-xl md:text-2xl font-bold text-foreground">
                        {formattedAmount}
                      </p>
                      <Badge
                        className={cn(
                          "mt-1 w-fit px-3 py-1 text-xs font-semibold",
                          config.badgeClass,
                        )}
                      >
                        {config.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4 text-sm sm:grid-cols-4 border-y border-border/40 py-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Orçamento
                      </p>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <p
                            className="font-medium text-foreground truncate"
                            aria-label={budget.id}
                          >
                            #{budget.id.slice(0, 8)}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="top">#{budget.id}</TooltipContent>
                      </Tooltip>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {t("budgets.table.createdAt")}
                      </p>
                      <p className="font-medium text-foreground">{createdAt}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {t("budgets.fields.estimatedDays")}
                      </p>
                      <p className="font-medium text-foreground">
                        {estimatedDays ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Responsável
                      </p>
                      <p className="font-medium text-foreground">
                        {responsibleName}
                      </p>
                    </div>
                  </div>

                  <BudgetDescription description={budget.description} />

                  <div className="flex flex-col gap-4 pt-2">
                    {isOwner && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{t("common.roles.mechanic")}:</span>
                        <span className="font-medium text-foreground">
                          {assignedMechanicLabel}
                        </span>
                        {!hasActiveMechanics && (
                          <span className="text-destructive ml-2">
                            ({t("budgets.toasts.approveError")})
                          </span>
                        )}
                      </div>
                    )}
                    {isAssignedToAnother && (
                      <p className="text-xs text-warning">
                        {t("budgets.messages.assignedToOther", {
                          defaultValue: "Atribuído para outro mecânico",
                        })}
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
                            prazoEstimadoDias:
                              budget.prazoEstimadoDias ?? undefined,
                          }}
                          onSubmit={(values) =>
                            requestConfirm("edit", () =>
                              handleEditBudget(budget.id, values),
                            )
                          }
                          renderTrigger={({ open, disabled }) => (
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-warning/30 bg-warning-light text-warning hover:bg-warning-light/80"
                                  onClick={open}
                                  disabled={disabled}
                                  aria-label={t("common.actions.edit", {
                                    defaultValue: "Editar orçamento",
                                  })}
                                >
                                  {t("common.actions.edit")}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {t("common.actions.edit", {
                                  defaultValue: "Editar orçamento",
                                })}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {isAssignedToAnother
                            ? t("budgets.messages.assignedEditBlocked", {
                                defaultValue:
                                  "Este orçamento foi delegado a outro mecânico pelo administrador.",
                              })
                            : t("budgets.messages.noPermission")}
                        </p>
                      )}
                      {canManageBudget && (
                        <>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-success/30 bg-success-light text-success hover:bg-success-light/80"
                                disabled={approveDisabled}
                                onClick={() =>
                                  requestConfirm("approve", () =>
                                    handleApproveBudget(budget),
                                  )
                                }
                                aria-label={t("common.actions.confirm", {
                                  defaultValue: "Confirmar orçamento",
                                })}
                              >
                                {approving
                                  ? t("budgets.toasts.approveTitle")
                                  : t("common.actions.confirm")}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {t("common.actions.confirm", {
                                defaultValue: "Confirmar orçamento",
                              })}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive/30 bg-destructive-light text-destructive hover:bg-destructive-light/80"
                                disabled={budget.status !== "aberto" || denying}
                                onClick={() =>
                                  requestConfirm("cancel", () =>
                                    handleDenyBudget(budget.id),
                                  )
                                }
                                aria-label={t("budgets.status.cancelar", {
                                  defaultValue: "Cancelar orçamento",
                                })}
                              >
                                {denying
                                  ? t("budgets.toasts.rejectTitle")
                                  : t("budgets.status.cancelar", {
                                      defaultValue: "Cancelar",
                                    })}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {t("budgets.status.cancelar", {
                                defaultValue: "Cancelar orçamento",
                              })}
                            </TooltipContent>
                          </Tooltip>
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
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1 || budgetsQuery.isFetching}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    aria-label={t("budgets.pagination.prev", {
                      defaultValue: "Página anterior",
                    })}
                  >
                    {t("budgets.pagination.prev")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t("budgets.pagination.prev", {
                    defaultValue: "Página anterior",
                  })}
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      page === budgetsQuery.data.meta.lastPage ||
                      budgetsQuery.isFetching
                    }
                    onClick={() => setPage((prev) => prev + 1)}
                    aria-label={t("budgets.pagination.next", {
                      defaultValue: "Próxima página",
                    })}
                  >
                    {t("budgets.pagination.next")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t("budgets.pagination.next", {
                    defaultValue: "Próxima página",
                  })}
                </TooltipContent>
              </Tooltip>
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

  const confirmDialogTitle: Record<"edit" | "approve" | "cancel", string> = {
    edit: t("common.actions.edit"),
    approve: t("common.actions.confirm"),
    cancel: t("budgets.status.cancelar", { defaultValue: "Cancelar" }),
  };

  const confirmDialogMessage: Record<"edit" | "approve" | "cancel", string> = {
    edit: t("budgets.messages.confirmEdit"),
    approve: t("budgets.messages.confirmApprove"),
    cancel: t("budgets.messages.confirmCancel"),
  };

  const requestConfirm = (
    action: "edit" | "approve" | "cancel",
    proceed: () => Promise<void> | void,
  ) =>
    new Promise<void>((resolve, reject) => {
      confirmDialogActionRef.current = null;
      confirmDialogSettledRef.current = false;
      setConfirmDialog({ action, proceed, resolve, reject });
    });

  return (
    <>
      {lastApprovedService && (
        <div className="page-container">
          <Alert className="mb-4 border-green-200 bg-green-50 text-green-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            <AlertTitle>{t("budgets.alerts.serviceCreatedTitle")}</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <span>
                {t("budgets.alerts.serviceCreatedDescription", {
                  serviceId: lastApprovedService.serviceId,
                })}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate("/ordens")}
                >
                  {t("navigation.orders")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLastApprovedService(null)}
                >
                  {t("common.actions.close")}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      <div className="page-container space-y-8">
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
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      className="gap-2 bg-gradient-accent hover:opacity-90"
                      onClick={open}
                      disabled={createDisabled || disabled}
                      aria-label={t("common.actions.createBudget", {
                        defaultValue: "Criar orçamento",
                      })}
                    >
                      <Plus className="w-4 h-4" />
                      {t("common.actions.createBudget")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t("common.actions.createBudget", {
                      defaultValue: "Criar orçamento",
                    })}
                  </TooltipContent>
                </Tooltip>
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
              onValueChange={(value: typeof statusFilter) => {
                setStatusFilter(value);
                setPage(1);
              }}
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
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Input
                  type="date"
                  value={createdFrom}
                  aria-label={t("budgets.filters.dateFrom")}
                  onChange={(event) => setCreatedFrom(event.target.value)}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                {t("budgets.filters.dateFrom")}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground uppercase tracking-wide">
              {t("budgets.filters.dateTo")}
            </p>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Input
                  type="date"
                  value={createdTo}
                  aria-label={t("budgets.filters.dateTo")}
                  onChange={(event) => setCreatedTo(event.target.value)}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                {t("budgets.filters.dateTo")}
              </TooltipContent>
            </Tooltip>
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

      <AlertDialog
        open={Boolean(confirmDialog)}
        onOpenChange={(open) => {
          if (open) {
            confirmDialogActionRef.current = null;
            confirmDialogSettledRef.current = false;
            return;
          }
          if (!confirmDialog || confirmDialogSettledRef.current) return;

          if (confirmDialogActionRef.current === "confirm") return;
          if (confirmDialogActionRef.current === "cancel") return;

          confirmDialog?.reject?.(new Error("cancelled"));
          confirmDialogSettledRef.current = true;
          setConfirmDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog
                ? confirmDialogTitle[confirmDialog.action]
                : t("common.actions.confirm")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog ? confirmDialogMessage[confirmDialog.action] : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (!confirmDialog) return;
                confirmDialogActionRef.current = "cancel";
                confirmDialogSettledRef.current = true;
                confirmDialog.reject?.(new Error("cancelled"));
                setConfirmDialog(null);
                confirmDialogActionRef.current = null;
              }}
            >
              {t("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDialog) return;
                confirmDialogActionRef.current = "confirm";
                try {
                  await confirmDialog.proceed();
                  confirmDialog.resolve?.();
                  confirmDialogSettledRef.current = true;
                } catch (error) {
                  confirmDialog.reject?.(error);
                  confirmDialogActionRef.current = null;
                  confirmDialogSettledRef.current = true;
                  return;
                }
                setConfirmDialog(null);
                confirmDialogActionRef.current = null;
              }}
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
