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

import { useCallback, useMemo, useState } from "react";
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
import { Loader2, FileDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { KpiCards } from "./components/KpiCards";
import { MechanicsComparisonChart } from "./components/MechanicsComparisonChart";
import { BudgetStatusChart } from "./components/BudgetStatusChart";
import { generateExecutiveReport } from "./components/GenerateExecutiveReport";
import { CreateUserModal } from "./components/CreateUserModal";
import { UsersTable } from "./components/UsersTable";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

const PER_PAGE = 200;
const PERIOD_OPTIONS = [
  { value: "last7Days", label: "Últimos 7 dias" },
  { value: "currentMonth", label: "Mês atual" },
  { value: "previousMonth", label: "Mês anterior" },
  { value: "year", label: "Ano" },
  { value: "last5Years", label: "Últimos 5 anos" },
  { value: "allTime", label: "Sempre" },
];

export default function DashboardOwner() {
  const { user, token, logout } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState("currentMonth");
  const [selectedMechanicId, setSelectedMechanicId] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { toast } = useToast();
  const isOwner = user?.role === "dono";
  const { t } = useTranslation();

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
        (person) => person.tipo === "mecanico" && person.ativo !== false,
      ),
    [allUsers],
  );
  const budgets = budgetsQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];
  const mechanicsCount = mechanics.length;

  const earliestRecordDate = useMemo(() => {
    const dateValues = [...budgets, ...services]
      .map((item) => {
        const value = item?.createdAt ?? item?.created_at;
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      })
      .filter(Boolean);
    if (!dateValues.length) return null;
    return new Date(
      Math.min.apply(
        null,
        dateValues.map((date) => date.getTime()),
      ),
    );
  }, [budgets, services]);

  const periodRange = useMemo(
    () => getPeriodRange(selectedPeriod, earliestRecordDate),
    [selectedPeriod, earliestRecordDate],
  );
  const previousPeriodRange = useMemo(
    () => getPreviousPeriodRange(selectedPeriod, earliestRecordDate),
    [selectedPeriod, earliestRecordDate],
  );

  const budgetsInPeriod = useMemo(
    () => filterByPeriod(budgets, (item) => item.createdAt, periodRange),
    [budgets, periodRange],
  );

  const servicesInPeriod = useMemo(
    () => filterByPeriod(services, (item) => item.createdAt, periodRange),
    [services, periodRange],
  );
  const budgetsPreviousPeriod = useMemo(
    () =>
      filterByPeriod(budgets, (item) => item.createdAt, previousPeriodRange),
    [budgets, previousPeriodRange],
  );

  const metrics = useMemo(() => {
    const totalBudgets = budgetsInPeriod.length;
    const accepted = budgetsInPeriod.filter(
      (budget) => budget.status === "aceito",
    ).length;
    const acceptanceRate = totalBudgets
      ? ((accepted / totalBudgets) * 100).toFixed(1)
      : "0";
    const concludedServices = servicesInPeriod.filter(
      (service) => service.status === "Concluído",
    ).length;
    return [
      { label: t("owner.kpis.mechanics"), value: mechanicsCount },
      { label: t("owner.kpis.budgets"), value: totalBudgets },
      { label: t("owner.kpis.acceptance"), value: `${acceptanceRate}%` },
      { label: t("owner.kpis.services"), value: concludedServices },
    ];
  }, [mechanics, budgetsInPeriod, servicesInPeriod, t]);

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
        (budget) => budget.status === "aceito",
      ).length;
      const budgetsCancelled = mechanicBudgets.filter(
        (budget) =>
          budget.status === "cancelado" || budget.status === "recusado",
      ).length;
      const budgetsOpen = mechanicBudgets.filter(
        (budget) => budget.status === "aberto",
      ).length;
      const budgetsTotal = mechanicBudgets.length;
      const servicesCompleted = mechanicServices.filter(
        (service) => service.status === "Concluído",
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
    [mechanicRows],
  );

  const periodLabel = PERIOD_OPTIONS.find(
    (option) => option.value === selectedPeriod,
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
      },
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
      (budget) => budget.status === "aceito",
    ).length;
    const acceptanceRate = totalBudgets
      ? ((totalAccepted / totalBudgets) * 100).toFixed(1)
      : "0";
    const totalServices = servicesInPeriod.filter(
      (service) => service.status === "Concluído",
    ).length;
    const bestConversionLabel = bestMechanic
      ? `${bestMechanic.nome ?? bestMechanic.name} (${
          bestMechanic.acceptRate
        }% ${t("owner.kpis.generalAcceptance")})`
      : "—";
    const averageTicket = calculateTicketAverage(budgetsInPeriod);

    return [
      { label: t("owner.kpis.periodBudgets"), value: totalBudgets },
      { label: t("owner.kpis.generalAcceptance"), value: `${acceptanceRate}%` },
      { label: t("owner.kpis.services"), value: totalServices },
      { label: t("owner.kpis.bestConversion"), value: bestConversionLabel },
      ...(averageTicket
        ? [
            {
              label: t("owner.kpis.averageTicket"),
              value: formatCurrency(averageTicket),
            },
          ]
        : []),
    ];
  }, [bestMechanic, budgetsInPeriod, servicesInPeriod, t]);

  const statusData = useMemo(() => {
    const descriptors = [
      { key: "aberto", label: t("common.status.open") },
      { key: "aceito", label: t("common.status.accepted") },
      { key: "cancelado", label: t("common.status.cancelled") },
      { key: "concluido", label: t("common.status.completed") },
    ];

    const buildTotals = (items) =>
      items.reduce(
        (acc, budget) => {
          const normalized = normalizeBudgetStatus(budget.status);
          if (normalized in acc) {
            acc[normalized] += 1;
          }
          return acc;
        },
        { aberto: 0, aceito: 0, cancelado: 0, concluido: 0 },
      );

    const currentTotals = buildTotals(budgetsInPeriod);
    const previousTotals = buildTotals(budgetsPreviousPeriod);

    const currentTotalBudgets = budgetsInPeriod.length || 0;
    const previousTotalBudgets = budgetsPreviousPeriod.length || 0;

    const toPercent = (value, total) =>
      total ? Number(((value / total) * 100).toFixed(1)) : 0;

    return descriptors.map((descriptor) => {
      const value = currentTotals[descriptor.key];
      const prevValue = previousTotals[descriptor.key];
      const percent = toPercent(value, currentTotalBudgets);
      const prevPercent =
        previousTotalBudgets > 0
          ? toPercent(prevValue, previousTotalBudgets)
          : null;
      const change =
        prevPercent === null
          ? null
          : Number((percent - prevPercent).toFixed(1));

      return {
        key: descriptor.key,
        label: descriptor.label,
        value,
        percent,
        change,
      };
    });
  }, [budgetsInPeriod, budgetsPreviousPeriod, t]);

  const statusKpis = useMemo(() => {
    const totals = statusData.reduce(
      (acc, item) => {
        if (item.key === "aceito") acc.accepted = item.value;
        if (item.key === "cancelado") acc.cancelled = item.value;
        if (item.key === "concluido") acc.completed = item.value;
        return acc;
      },
      { accepted: 0, cancelled: 0, completed: 0 },
    );

    const totalBudgets = budgetsInPeriod.length || 0;
    const acceptanceRate = totalBudgets
      ? ((totals.accepted / totalBudgets) * 100).toFixed(1)
      : "0";
    const cancellationRate = totalBudgets
      ? ((totals.cancelled / totalBudgets) * 100).toFixed(1)
      : "0";

    return [
      { label: t("owner.kpis.periodBudgets"), value: totalBudgets },
      { label: t("owner.kpis.generalAcceptance"), value: `${acceptanceRate}%` },
      {
        label: t("owner.kpis.generalCancellation"),
        value: `${cancellationRate}%`,
      },
      { label: t("owner.kpis.completedBudgets"), value: totals.completed },
    ];
  }, [budgetsInPeriod.length, statusData, t]);

  const handleExportPdf = useCallback(async () => {
    const totalBudgets = budgetsInPeriod.length;
    const totalAccepted = budgetsInPeriod.filter(
      (budget) => budget.status === "aceito",
    ).length;
    const concludedServices = servicesInPeriod.filter(
      (service) => service.status === "Concluído",
    ).length;
    const averageTicketValue = calculateTicketAverage(budgetsInPeriod);

    const generalAcceptanceLabel = t("owner.kpis.generalAcceptance");
    const summaryCards = [
      {
        label: t("owner.report.cards.mechanics"),
        value: String(mechanicsCount),
      },
      {
        label: t("owner.report.cards.budgets"),
        value: String(totalBudgets),
      },
      {
        label: t("owner.report.cards.accepted"),
        value: String(totalAccepted),
      },
      {
        label: t("owner.report.cards.services"),
        value: String(concludedServices),
      },
      {
        label: t("owner.report.cards.ticketAverage"),
        value: averageTicketValue ? formatCurrency(averageTicketValue) : "—",
      },
    ];

    const comparisonCards = [
      {
        label: t("owner.report.comparison.budgets"),
        value: String(totalBudgets),
      },
      {
        label: t("owner.report.comparison.acceptance"),
        value:
          statusKpis.find((item) => item.label === generalAcceptanceLabel)
            ?.value ??
          `${
            totalBudgets
              ? ((totalAccepted / totalBudgets) * 100).toFixed(1)
              : "0"
          }%`,
      },
      {
        label: t("owner.report.comparison.services"),
        value: String(concludedServices),
      },
      {
        label: t("owner.report.comparison.ticketAverage"),
        value: averageTicketValue ? formatCurrency(averageTicketValue) : "—",
      },
    ];

    const reportTexts = {
      reportTitle: t("owner.report.title"),
      periodLabel: t("owner.report.periodLabel"),
      generatedAt: t("owner.report.generatedAt"),
      summaryTitle: t("owner.report.sections.summary"),
      comparisonTitle: t("owner.report.sections.comparison"),
      comparisonSubtitle: t("owner.report.sections.comparisonSubtitle"),
      mechanicsTitle: t("owner.report.sections.mechanics"),
      mechanicsTableHeaders: {
        mechanic: t("owner.report.mechanicsTable.mechanic"),
        budgets: t("owner.report.mechanicsTable.budgets"),
        accepted: t("owner.report.mechanicsTable.accepted"),
        services: t("owner.report.mechanicsTable.services"),
        ticket: t("owner.report.mechanicsTable.ticket"),
        acceptance: t("owner.report.mechanicsTable.acceptance"),
        cancellation: t("owner.report.mechanicsTable.cancellation"),
      },
    };

    setIsExportingPdf(true);
    try {
      await generateExecutiveReport({
        filename: `gearbox-relatorio-${selectedPeriod}-${Date.now()}.pdf`,
        periodLabel:
          periodLabel ??
          t("owner.report.periodFallback", { value: selectedPeriod }),
        emissionDate: new Date(),
        summaryCards,
        comparisonCards,
        radarData: comparisonData,
        statusData,
        mechanicRows,
        texts: reportTexts,
      });
      toast({
        title: t("owner.report.successTitle"),
        description: t("owner.report.successMessage"),
      });
    } catch (error) {
      toast({
        title: t("owner.report.errorTitle"),
        description:
          error instanceof Error
            ? error.message
            : t("owner.report.errorMessage"),
        variant: "destructive",
      });
    } finally {
      setIsExportingPdf(false);
    }
  }, [
    budgetsInPeriod,
    comparisonData,
    mechanicRows,
    mechanicsCount,
    periodLabel,
    selectedPeriod,
    servicesInPeriod,
    t,
    toast,
  ]);

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
      (a, b) => new Date(a.period) - new Date(b.period),
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
        transferToUserId ? { transferToUserId } : undefined,
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
      <div className="page-container">
        <EmptyState
          title={t("common.actions.viewDetails", {
            defaultValue: "Acesso restrito",
          })}
          description={t("owner.header.subtitle")}
        />
      </div>
    );
  }

  const isLoading =
    usersQuery.isLoading || budgetsQuery.isLoading || servicesQuery.isLoading;
  const hasError =
    usersQuery.isError || budgetsQuery.isError || servicesQuery.isError;

  return (
    <div className="page-container space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          eyebrow={t("owner.header.eyebrow")}
          title={t("owner.header.title")}
          subtitle={t("owner.header.subtitle")}
          align="start"
          className="gap-2"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={isExportingPdf || isLoading}
            className="gap-2"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("owner.actions.exportingPdf")}
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                {t("owner.actions.exportPdf")}
              </>
            )}
          </Button>
          <CreateUserModal onSubmit={handleCreateUser} />
        </div>
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
            <BudgetStatusChart
              data={statusData}
              kpis={statusKpis}
              loading={isLoading}
              period={{
                value: selectedPeriod,
                label: periodLabel,
                options: PERIOD_OPTIONS,
                onChange: setSelectedPeriod,
              }}
            />
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
    "0",
  )}/${date.getFullYear()}`;
}

function getPeriodRange(value, earliestDate = null) {
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
    case "last5Years": {
      const start = new Date(now);
      start.setFullYear(now.getFullYear() - 5);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case "allTime": {
      const start = earliestDate ? startOfDay(earliestDate) : null;
      const end = endOfDay(now);
      return start ? { start, end } : { start: null, end: null };
    }
    default:
      return { start: null, end: null };
  }
}

function getPreviousPeriodRange(value, earliestDate = null) {
  const current = getPeriodRange(value, earliestDate);
  if (!current.start || !current.end) return { start: null, end: null };

  const diff = current.end.getTime() - current.start.getTime();
  const start = new Date(current.start.getTime() - (diff + 1));
  const end = new Date(current.end.getTime() - (diff + 1));
  return { start, end };
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

function normalizeBudgetStatus(status) {
  if (!status) return "aberto";
  const normalized = status
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized === "recusado") return "cancelado";
  return normalized;
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
      user.email?.toLowerCase().includes(normalized),
  );
}

// Atualizações neste arquivo: novos períodos (5 anos/Sempre) com base na primeira data registrada e exportação em PDF usando template dedicado (jsPDF/autoTable) com dados do painel executivo.
