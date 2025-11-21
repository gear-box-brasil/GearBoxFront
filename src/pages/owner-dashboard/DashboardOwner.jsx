import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  listUsers,
  listBudgets,
  listServices,
  createUser,
  updateUser,
  deleteUser,
} from "@/services/gearbox";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { KpiCards } from "./components/KpiCards";
import { MechanicsComparisonChart } from "./components/MechanicsComparisonChart";
import { BudgetStatusChart } from "./components/BudgetStatusChart";
import { MechanicDetailChart } from "./components/MechanicDetailChart";
import { CreateUserModal } from "./components/CreateUserModal";
import { UsersTable } from "./components/UsersTable";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

const PER_PAGE = 200;
const PERIOD_OPTIONS = [
  { value: "last7Days", label: "Últimos 7 dias" },
  { value: "last30Days", label: "Últimos 30 dias" },
  { value: "currentMonth", label: "Mês atual" },
  { value: "previousMonth", label: "Mês anterior" },
  { value: "year", label: "Ano" },
];

export default function DashboardOwner() {
  const { user, token, logout } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState("last30Days");
  const [selectedMechanicId, setSelectedMechanicId] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [deletingUserId, setDeletingUserId] = useState(null);
  const { toast } = useToast();
  const isOwner = user?.role === "dono";

  const usersQuery = useQuery({
    queryKey: ["users", token],
    queryFn: () => listUsers(token, { page: 1, perPage: PER_PAGE }),
    enabled: Boolean(token && isOwner),
  });

  const budgetsQuery = useQuery({
    queryKey: ["budgets", token, "owner-dashboard"],
    queryFn: () => listBudgets(token, { page: 1, perPage: PER_PAGE }),
    enabled: Boolean(token && isOwner),
  });

  const servicesQuery = useQuery({
    queryKey: ["services", token, "owner-dashboard"],
    queryFn: () => listServices(token, { page: 1, perPage: PER_PAGE }),
    enabled: Boolean(token && isOwner),
  });

  const allUsers = usersQuery.data?.data ?? [];
  const mechanics = useMemo(
    () =>
      allUsers.filter(
        (person) => person.tipo === "mecanico" && person.ativo !== false
      ),
    [allUsers]
  );
  const budgets = budgetsQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];

  const periodRange = useMemo(
    () => getPeriodRange(selectedPeriod),
    [selectedPeriod]
  );

  const budgetsInPeriod = useMemo(
    () => filterByPeriod(budgets, (item) => item.createdAt, periodRange),
    [budgets, periodRange]
  );

  const servicesInPeriod = useMemo(
    () => filterByPeriod(services, (item) => item.createdAt, periodRange),
    [services, periodRange]
  );

  const metrics = useMemo(() => {
    const totalBudgets = budgetsInPeriod.length;
    const accepted = budgetsInPeriod.filter(
      (budget) => budget.status === "aceito"
    ).length;
    const acceptanceRate = totalBudgets
      ? ((accepted / totalBudgets) * 100).toFixed(1)
      : "0";
    const concludedServices = servicesInPeriod.filter(
      (service) => service.status === "Concluído"
    ).length;
    return [
      { label: "Total de Mecânicos", value: mechanics.length },
      { label: "Budgets Gerados", value: totalBudgets },
      { label: "% Médio de Aceites", value: `${acceptanceRate}%` },
      { label: "Serviços Concluídos", value: concludedServices },
    ];
  }, [mechanics, budgetsInPeriod, servicesInPeriod]);

  const mechanicRows = useMemo(() => {
    const servicesByMechanic = servicesInPeriod.reduce((acc, service) => {
      if (!service.userId) return acc;
      acc[service.userId] = acc[service.userId] ?? [];
      acc[service.userId].push(service);
      return acc;
    }, {});

    const budgetsByMechanic = budgetsInPeriod.reduce((acc, budget) => {
      if (!budget.userId) return acc;
      acc[budget.userId] = acc[budget.userId] ?? [];
      acc[budget.userId].push(budget);
      return acc;
    }, {});

    return mechanics.map((mechanic) => {
      const mechanicBudgets = budgetsByMechanic[mechanic.id] ?? [];
      const mechanicServices = servicesByMechanic[mechanic.id] ?? [];
      const budgetsAccepted = mechanicBudgets.filter(
        (budget) => budget.status === "aceito"
      ).length;
      const budgetsCancelled = mechanicBudgets.filter(
        (budget) =>
          budget.status === "cancelado" || budget.status === "recusado"
      ).length;
      const budgetsOpen = mechanicBudgets.filter(
        (budget) => budget.status === "aberto"
      ).length;
      const budgetsTotal = mechanicBudgets.length;
      const servicesCompleted = mechanicServices.filter(
        (service) => service.status === "Concluído"
      ).length;
      const acceptRate = budgetsTotal
        ? Math.round((budgetsAccepted / budgetsTotal) * 100)
        : 0;
      const cancelRate = budgetsTotal
        ? Math.round((budgetsCancelled / budgetsTotal) * 100)
        : 0;
      const ticketAverage = calculateTicketAverage(mechanicBudgets);
      return {
        id: mechanic.id,
        nome: mechanic.nome,
        budgetsTotal,
        budgetsAccepted,
        budgetsCancelled,
        budgetsOpen,
        servicesCompleted,
        acceptRate,
        cancelRate,
        ticketAverage,
      };
    });
  }, [mechanics, budgetsInPeriod, servicesInPeriod]);

  const comparisonData = useMemo(
    () =>
      mechanicRows.map((row) => ({
        id: row.id,
        name: row.nome,
        budgets: row.budgetsTotal,
        services: row.servicesCompleted,
        acceptRate: row.acceptRate,
        cancelRate: row.cancelRate,
        accepted: row.budgetsAccepted,
        cancelled: row.budgetsCancelled,
        ticketAverage: row.ticketAverage,
      })),
    [mechanicRows]
  );

  const periodLabel = PERIOD_OPTIONS.find(
    (option) => option.value === selectedPeriod
  )?.label;

  const mechanicAverageProfile = useMemo(() => {
    if (!mechanicRows.length) return null;
    const totals = mechanicRows.reduce(
      (acc, mechanic) => {
        acc.budgets += mechanic.budgetsTotal;
        acc.services += mechanic.servicesCompleted;
        acc.accepted += mechanic.budgetsAccepted;
        acc.cancelled += mechanic.budgetsCancelled;
        acc.acceptRate += mechanic.acceptRate;
        acc.cancelRate += mechanic.cancelRate;
        if (typeof mechanic.ticketAverage === "number") {
          acc.tickets.push(mechanic.ticketAverage);
        }
        return acc;
      },
      {
        budgets: 0,
        services: 0,
        accepted: 0,
        cancelled: 0,
        acceptRate: 0,
        cancelRate: 0,
        tickets: [],
      }
    );
    const count = mechanicRows.length || 1;
    const ticketAverage =
      totals.tickets.length > 0
        ? totals.tickets.reduce((sum, value) => sum + value, 0) /
          totals.tickets.length
        : null;
    return {
      name: "Média",
      budgets: totals.budgets / count,
      services: totals.services / count,
      accepted: totals.accepted / count,
      cancelled: totals.cancelled / count,
      acceptRate: totals.acceptRate / count,
      cancelRate: totals.cancelRate / count,
      ticketAverage,
    };
  }, [mechanicRows]);

  const bestMechanic = useMemo(() => {
    const best = mechanicRows
      .filter((row) => row.budgetsTotal > 0)
      .reduce((acc, current) => {
        if (!acc || current.acceptRate > acc.acceptRate) return current;
        return acc;
      }, null);

    if (!best) return null;

    return {
      ...best,
      budgets: best.budgetsTotal,
      services: best.servicesCompleted,
    };
  }, [mechanicRows]);

  const performanceKpis = useMemo(() => {
    const totalBudgets = budgetsInPeriod.length;
    const totalAccepted = budgetsInPeriod.filter(
      (budget) => budget.status === "aceito"
    ).length;
    const acceptanceRate = totalBudgets
      ? ((totalAccepted / totalBudgets) * 100).toFixed(1)
      : "0";
    const totalServices = servicesInPeriod.filter(
      (service) => service.status === "Concluído"
    ).length;
    const bestConversionLabel = bestMechanic
      ? `${bestMechanic.nome ?? bestMechanic.name} (${
          bestMechanic.acceptRate
        }% de aceitação)`
      : "—";
    const averageTicket = calculateTicketAverage(budgetsInPeriod);

    return [
      { label: "Budgets no período", value: totalBudgets },
      { label: "Taxa geral de aceitação", value: `${acceptanceRate}%` },
      { label: "Serviços concluídos", value: totalServices },
      { label: "Melhor conversão", value: bestConversionLabel },
      ...(averageTicket
        ? [
            {
              label: "Ticket médio geral",
              value: formatCurrency(averageTicket),
            },
          ]
        : []),
    ];
  }, [bestMechanic, budgetsInPeriod, servicesInPeriod]);

  const statusData = useMemo(() => {
    const totals = {
      aberto: 0,
      aceito: 0,
      cancelado: 0,
      concluido: 0,
    };

    budgetsInPeriod.forEach((budget) => {
      if (!budget.status) return;
      const normalized = budget.status
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (normalized in totals) {
        totals[normalized] += 1;
      }
    });

    const labels = {
      aberto: "Abertos",
      aceito: "Aceitos",
      cancelado: "Cancelados",
      concluido: "Concluídos",
    };

    return Object.entries(totals)
      .map(([key, value]) => ({ label: labels[key], value }))
      .filter((item) => item.value > 0);
  }, [budgetsInPeriod]);

  const selectedMechanic =
    mechanics.find((mechanic) => mechanic.id === selectedMechanicId) ?? null;

  const detailData = useMemo(() => {
    if (!selectedMechanic) return [];
    const map = new Map();

    const addPoint = (key) => {
      if (!map.has(key)) {
        map.set(key, { period: key, created: 0, accepted: 0, services: 0 });
      }
      return map.get(key);
    };

    budgetsInPeriod.forEach((budget) => {
      if (budget.userId !== selectedMechanic.id) return;
      const period = formatPeriod(budget.createdAt);
      const node = addPoint(period);
      node.created += 1;
      if (budget.status === "aceito") node.accepted += 1;
    });

    servicesInPeriod.forEach((service) => {
      if (service.userId !== selectedMechanic.id) return;
      const period = formatPeriod(service.createdAt);
      const node = addPoint(period);
      if (service.status === "Concluído") node.services += 1;
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.period) - new Date(b.period)
    );
  }, [selectedMechanic, budgetsInPeriod, servicesInPeriod]);

  const createUserMutation = useMutation({
    mutationFn: (payload) => createUser(token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }) => updateUser(token, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: ({ id, transferToUserId }) =>
      deleteUser(
        token,
        id,
        transferToUserId ? { transferToUserId } : undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const handleCreateUser = (payload) => createUserMutation.mutateAsync(payload);
  const handleUpdateUser = (id, payload) =>
    updateUserMutation.mutateAsync({ id, payload });
  const handleDeleteUser = async (userToDelete, options = {}) => {
    const isSelfDeletion = userToDelete.id === user?.id;
    if (userToDelete.tipo === "dono" && userToDelete.id !== user?.id) {
      toast({
        title: "Operação restrita",
        description:
          "Você só pode excluir a sua própria conta de administrador.",
        variant: "destructive",
      });
      return;
    }
    try {
      setDeletingUserId(userToDelete.id);
      await deleteUserMutation.mutateAsync({
        id: userToDelete.id,
        transferToUserId: options.transferToUserId,
      });
      if (isSelfDeletion) {
        toast({
          title: "Conta removida",
          description: "Sua sessão será finalizada.",
        });
        await logout();
        return;
      }
      toast({
        title:
          userToDelete.tipo === "mecanico"
            ? "Mecânico desativado"
            : "Usuário removido",
      });
    } catch (error) {
      toast({
        title: "Erro ao remover usuário",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleActivateMechanic = async (mechanic) => {
    try {
      setDeletingUserId(mechanic.id);
      await updateUserMutation.mutateAsync({
        id: mechanic.id,
        payload: { ativo: true },
      });
      toast({ title: "Mecânico reativado" });
    } catch (error) {
      toast({
        title: "Erro ao reativar mecânico",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  if (!isOwner) {
    return (
      <div className="page-container bg-gradient-hero rounded-2xl border border-border shadow-lg p-8">
        <EmptyState
          title="Acesso restrito"
          description="Somente o perfil administrador pode visualizar este painel."
        />
      </div>
    );
  }

  const isLoading =
    usersQuery.isLoading || budgetsQuery.isLoading || servicesQuery.isLoading;
  const hasError =
    usersQuery.isError || budgetsQuery.isError || servicesQuery.isError;

  return (
    <div className="page-container bg-gradient-hero rounded-2xl border border-border shadow-lg p-6 md:p-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          eyebrow="Painel Executivo"
          title="Dashboard do Administrador"
          subtitle="Visão consolidada de budgets, serviços e performance dos mecânicos."
          align="start"
          className="gap-2"
        />
        <CreateUserModal onSubmit={handleCreateUser} />
      </div>

      {isLoading ? (
        <Card className="flex items-center justify-center bg-card/80 p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : hasError ? (
        <EmptyState
          title="Erro ao carregar dados"
          description="Verifique sua conexão e tente novamente."
        />
      ) : (
        <>
          <KpiCards metrics={metrics} />

          <div className="grid grid-cols-1 gap-6">
            <MechanicsComparisonChart
              data={comparisonData}
              loading={isLoading}
              kpis={performanceKpis}
              averageProfile={mechanicAverageProfile}
              topPerformer={bestMechanic}
              selectedId={selectedMechanicId}
              onSelect={setSelectedMechanicId}
              period={{
                value: selectedPeriod,
                label: periodLabel,
                options: PERIOD_OPTIONS,
                onChange: setSelectedPeriod,
              }}
            />
            <BudgetStatusChart data={statusData} loading={isLoading} />
          </div>

          <UsersTable
            users={filterUsers(allUsers, userSearch)}
            search={userSearch}
            onSearchChange={setUserSearch}
            deletingId={deletingUserId}
            renderEdit={(currentUser) =>
              currentUser.tipo === "dono" ? null : (
                <CreateUserModal
                  mode="edit"
                  initialData={{
                    nome: currentUser.nome,
                    email: currentUser.email,
                    tipo: currentUser.tipo,
                  }}
                  onSubmit={(payload) =>
                    handleUpdateUser(currentUser.id, payload)
                  }
                  renderTrigger={({ open }) => (
                    <Button
                      className="bg-gradient-accent hover:opacity-90"
                      onClick={open}
                    >
                      Editar
                    </Button>
                  )}
                />
              )
            }
            onDelete={handleDeleteUser}
            onDeactivateMechanic={(mechanic, payload) =>
              handleDeleteUser(mechanic, payload)
            }
            onActivateMechanic={handleActivateMechanic}
          />
        </>
      )}
    </div>
  );
}

function formatPeriod(dateInput) {
  if (!dateInput) return "Sem data";
  const date = new Date(dateInput);
  return `${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}/${date.getFullYear()}`;
}

function getPeriodRange(value) {
  const now = new Date();
  const startOfDay = (date) => {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  };
  const endOfDay = (date) => {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
  };

  switch (value) {
    case "last7Days": {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case "last30Days": {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case "currentMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case "previousMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    default:
      return { start: null, end: null };
  }
}

function filterByPeriod(items, getDateFn, period) {
  if (!period?.start || !period?.end) return items;
  return items.filter((item) => {
    const dateValue = getDateFn(item);
    const date = dateValue ? new Date(dateValue) : null;
    if (!date || Number.isNaN(date.getTime())) return false;
    return date >= period.start && date <= period.end;
  });
}

function parseAmount(value) {
  if (value === null || value === undefined) return null;
  const sanitized = String(value).replace(/\./g, "").replace(",", ".");
  const numeric = Number.parseFloat(sanitized);
  return Number.isFinite(numeric) ? numeric : null;
}

function calculateTicketAverage(budgets) {
  const acceptedWithAmount = budgets
    .filter((budget) => budget.status === "aceito")
    .map((budget) => parseAmount(budget.amount))
    .filter((amount) => typeof amount === "number");

  if (!acceptedWithAmount.length) return null;

  const total = acceptedWithAmount.reduce((sum, amount) => sum + amount, 0);
  return total / acceptedWithAmount.length;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function filterUsers(users, term) {
  if (!term) return users;
  const normalized = term.toLowerCase();
  return users.filter(
    (user) =>
      user.nome?.toLowerCase().includes(normalized) ||
      user.email?.toLowerCase().includes(normalized)
  );
}
