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

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Wrench,
  Users,
  Car as CarIcon,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Bell,
  CalendarCheck2,
  ListChecks,
  CalendarRange,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type {
  ServiceStatus,
  Service,
  Budget,
  BudgetStatus,
  Car as CarEntity,
} from "@/types/api";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useServices } from "@/hooks/useServices";
import { useClients } from "@/hooks/useClients";
import { useCars } from "@/hooks/useCars";
import { useBudgets } from "@/hooks/useBudgets";
import type { DateRange } from "react-day-picker";
import { useIsMobile } from "@/hooks/use-mobile";

type ExtendedService = Service & {
  dataPrevista?: string | null;
  prazoEstimadoDias?: number | null;
  expectedCompletion?: string | null;
  expectedDate?: string | null;
  forecastDate?: string | null;
  dueDate?: string | null;
  estimatedDelivery?: string | null;
  deliveryDate?: string | null;
  deadline?: string | null;
};

const statusConfig = (
  t: TFunction,
): Record<
  ServiceStatus,
  { label: string; icon: typeof Clock; className: string; iconClass: string }
> => ({
  Pendente: {
    label: t("orders.status.pending"),
    icon: AlertCircle,
    className:
      "bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))] border-transparent",
    iconClass: "text-[hsl(var(--warning))]",
  },
  "Em andamento": {
    label: t("orders.status.inProgress"),
    icon: Clock,
    className:
      "bg-[rgba(245,163,0,0.15)] text-[hsl(var(--primary))] border-transparent",
    iconClass: "text-[hsl(var(--primary))]",
  },
  Concluído: {
    label: t("orders.status.done"),
    icon: CheckCircle2,
    className:
      "bg-[hsl(var(--success-light))] text-[hsl(var(--success))] border-transparent",
    iconClass: "text-[hsl(var(--success))]",
  },
  Cancelado: {
    label: t("orders.status.cancelled"),
    icon: XCircle,
    className:
      "bg-[rgba(239,83,80,0.15)] text-[hsl(var(--destructive))] border-transparent",
    iconClass: "text-[hsl(var(--destructive))]",
  },
});

const currencyFormat = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const DEFAULT_PERIOD_DAYS = 30;

const createDefaultDateRange = (): DateRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (DEFAULT_PERIOD_DAYS - 1));
  return { from: start, to: end };
};

const formatDateForApi = (date?: Date | null) =>
  date ? format(date, "yyyy-MM-dd") : undefined;

const formatDateForLabel = (date?: Date | null) =>
  date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "";

const getDateIfValid = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getServiceForecastDate = (service: ExtendedService) => {
  const candidates: (keyof ExtendedService)[] = [
    "dataPrevista",
    "expectedCompletion",
    "expectedDate",
    "forecastDate",
    "dueDate",
    "estimatedDelivery",
    "deliveryDate",
    "deadline",
  ];
  for (const field of candidates) {
    const value = service[field];
    const parsed = getDateIfValid(typeof value === "string" ? value : null);
    if (parsed) return parsed;
  }
  return null;
};

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const isFinalStatus = (status: ServiceStatus) =>
  status === "Concluído" || status === "Cancelado";

const isServiceOverdue = (service: ExtendedService) => {
  const forecast = getServiceForecastDate(service);
  const today = new Date();
  if (forecast && forecast < today && !isFinalStatus(service.status))
    return true;
  const created = getDateIfValid(service.createdAt);
  if (!forecast && created && !isFinalStatus(service.status)) {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return today.getTime() - created.getTime() > sevenDaysMs;
  }
  return false;
};

const isServiceDueToday = (service: ExtendedService) => {
  const forecast = getServiceForecastDate(service);
  const today = new Date();
  if (forecast)
    return isSameDay(forecast, today) && !isFinalStatus(service.status);
  const created = getDateIfValid(service.createdAt);
  return created
    ? isSameDay(created, today) && service.status !== "Cancelado"
    : false;
};

const isOlderThanDays = (value: string | undefined | null, days: number) => {
  const date = getDateIfValid(value ?? null);
  if (!date) return false;
  const limit = new Date();
  limit.setDate(limit.getDate() - days);
  return date < limit;
};

const normalizePriority = (priority?: string | null) =>
  priority?.toLowerCase().trim() ?? "";
const formatPriority = (priority: string | null | undefined, t: TFunction) => {
  const normalized = normalizePriority(priority);
  if (!normalized) return null;
  const labels: Record<string, string> = {
    alta: t("dashboardGeneral.labels.priorityHigh"),
    high: t("dashboardGeneral.labels.priorityHigh"),
    media: t("dashboardGeneral.labels.priorityMedium"),
    medium: t("dashboardGeneral.labels.priorityMedium"),
    baixa: t("dashboardGeneral.labels.priorityLow"),
    low: t("dashboardGeneral.labels.priorityLow"),
  };
  return labels[normalized] ?? priority;
};

const budgetStatusLabel = (status: BudgetStatus, t: TFunction) => {
  const mapping: Record<BudgetStatus, string> = {
    aberto: t("budgets.status.aberto"),
    aceito: t("budgets.status.aceito"),
    recusado: t("budgets.status.recusado"),
    cancelado: t("budgets.status.cancelado"),
  };
  return mapping[status] ?? status;
};

const RecentOrderItem = ({
  order,
  statusLabels,
  isDelayed,
  dueDate,
  responsibleName,
  car,
  clientName,
  priorityLabel,
  t,
}: {
  order: ExtendedService;
  statusLabels: ReturnType<typeof statusConfig>;
  isDelayed: boolean;
  dueDate: Date | null;
  responsibleName: string;
  car?: CarEntity | null;
  clientName: string;
  priorityLabel: string | null;
  t: TFunction;
}) => {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const StatusIcon = statusLabels[order.status].icon;
  const description = order.description;
  const shouldTruncate = description && description.length > 150;

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg bg-card/40 border border-border/50 hover:bg-card/60 transition-colors">
      <div className="flex-1 space-y-1 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-semibold text-foreground text-xs md:text-sm truncate max-w-[150px]"
            title={order.id}
          >
            {order.id}
          </span>
          <Badge
            className={cn(
              "gap-1 text-xs font-semibold border border-transparent",
              statusLabels[order.status].className,
            )}
          >
            <StatusIcon
              className={cn("w-3 h-3", statusLabels[order.status].iconClass)}
            />
            {statusLabels[order.status].label}
          </Badge>
          {isDelayed && (
            <Badge variant="destructive" className="text-xs">
              {t("dashboardGeneral.recentOrders.overdue")}
            </Badge>
          )}
          {priorityLabel && (
            <Badge variant="secondary" className="text-xs">
              {t("dashboardGeneral.labels.priority")}: {priorityLabel}
            </Badge>
          )}
        </div>
        <p className="text-sm text-foreground font-medium">{clientName}</p>
        <p className="text-xs text-muted-foreground">
          {car
            ? `${car.marca} ${car.modelo} · ${car.placa}`
            : t("dashboardGeneral.recentOrders.unknownVehicle")}
        </p>

        <p
          className={cn(
            "text-sm text-muted-foreground whitespace-pre-wrap break-words",
            shouldTruncate && "line-clamp-2",
          )}
        >
          {description || t("dashboardGeneral.recentOrders.noDescription")}
        </p>
        {shouldTruncate && (
          <>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs mt-1 text-primary font-semibold"
                  onClick={() => setIsDescriptionOpen(true)}
                  aria-label={t("dashboardGeneral.detailModal.open", {
                    defaultValue: "Ver descrição completa",
                  })}
                >
                  Ver mais
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {t("dashboardGeneral.detailModal.open", {
                  defaultValue: "Ver descrição completa",
                })}
              </TooltipContent>
            </Tooltip>
            <Dialog
              open={isDescriptionOpen}
              onOpenChange={setIsDescriptionOpen}
            >
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {t("dashboardGeneral.detailModal.title")}
                  </DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {description}
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => setIsDescriptionOpen(false)}
                    aria-label={t("common.actions.close", {
                      defaultValue: "Fechar",
                    })}
                  >
                    {t("common.actions.close") || "Fechar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
          <span>
            {t("dashboardGeneral.recentOrders.mechanic")}:{" "}
            <span className="font-semibold text-foreground">
              {responsibleName}
            </span>
          </span>
          <span>
            {t("dashboardGeneral.recentOrders.forecast")}:{" "}
            {dueDate
              ? dueDate.toLocaleDateString("pt-BR")
              : t("dashboardGeneral.recentOrders.noForecast")}
          </span>
          <span>
            {t("dashboardGeneral.recentOrders.createdAt")}:{" "}
            {order.createdAt
              ? new Date(order.createdAt).toLocaleDateString("pt-BR")
              : "-"}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0 w-full sm:w-auto border-t border-border/40 pt-2 sm:border-0 sm:pt-0">
        <p className="text-sm font-semibold text-foreground">
          {order.totalValue
            ? currencyFormat.format(Number(order.totalValue))
            : "R$ 0,00"}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("dashboardGeneral.recentOrders.updatedAt")}{" "}
          {order.updatedAt
            ? new Date(order.updatedAt).toLocaleDateString("pt-BR")
            : "-"}
        </p>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user, isOwner } = useAuth();
  const { t } = useTranslation();
  const statusLabels = statusConfig(t);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedService, setSelectedService] =
    useState<ExtendedService | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    createDefaultDateRange(),
  );
  const isMobile = useIsMobile();

  const serviceFilters = useMemo(() => {
    const start = dateRange?.from ?? null;
    const end = dateRange?.to ?? dateRange?.from ?? null;
    if (!start && !end) return undefined;
    return {
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
    };
  }, [dateRange]);

  const hasActivePeriodFilter = Boolean(
    serviceFilters?.startDate || serviceFilters?.endDate,
  );

  const selectedRangeLabel = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return `${formatDateForLabel(dateRange.from)} - ${formatDateForLabel(
        dateRange.to,
      )}`;
    }
    if (dateRange?.from) {
      return formatDateForLabel(dateRange.from);
    }
    return t("dashboardGeneral.periodFilter.placeholder");
  }, [dateRange, t]);

  const handleClearDateRange = () => setDateRange(undefined);

  const servicesQuery = useServices({
    page: 1,
    perPage: 50,
    filters: serviceFilters,
  });
  const budgetsQuery = useBudgets({
    page: 1,
    perPage: 50,
    filters: serviceFilters,
  });
  const { clientMap, isLoading: clientsLoading } = useClients({
    page: 1,
    perPage: 200,
  });
  const { carMap, isLoading: carsLoading } = useCars({ page: 1, perPage: 200 });

  const services = useMemo<ExtendedService[]>(
    () =>
      (
        (servicesQuery.data?.list as ExtendedService[] | undefined) ?? []
      ).slice(),
    [servicesQuery.data?.list],
  );

  const mechanicNameMap = useMemo(() => {
    const map = new Map<string, string>();
    services.forEach((service) => {
      if (service.assignedToId && service.assignedTo?.nome) {
        map.set(service.assignedToId, service.assignedTo.nome);
      }
      if (service.userId && service.user?.nome) {
        map.set(service.userId, service.user.nome);
      }
    });
    return map;
  }, [services]);
  const budgets = useMemo<Budget[]>(
    () => ((budgetsQuery.data?.list as Budget[] | undefined) ?? []).slice(),
    [budgetsQuery.data?.list],
  );

  const visibleServices = useMemo(() => {
    if (isOwner) return services;
    const mechanicId = user?.id;
    if (!mechanicId) return [];
    return services.filter((service) => service.assignedToId === mechanicId);
  }, [isOwner, services, user?.id]);

  const visibleBudgets = useMemo(() => {
    if (isOwner) return budgets;
    const mechanicId = user?.id;
    if (!mechanicId) return [];
    return budgets.filter((budget) => budget.userId === mechanicId);
  }, [budgets, isOwner, user?.id]);

  const recentOrders = useMemo(
    () =>
      [...visibleServices]
        .sort((a, b) => {
          const aDate = getDateIfValid(a.createdAt)?.getTime() ?? 0;
          const bDate = getDateIfValid(b.createdAt)?.getTime() ?? 0;
          return bDate - aDate;
        })
        .slice(0, 5),
    [visibleServices],
  );

  const resolveResponsibleName = useCallback(
    (service: ExtendedService) => {
      if (service.assignedTo?.nome) return service.assignedTo.nome;
      if (service.assignedToId) {
        const mapped = mechanicNameMap.get(service.assignedToId);
        if (mapped) return mapped;
        if (service.userId === service.assignedToId && service.user?.nome)
          return service.user.nome;
        if (service.assignedToId === user?.id && user?.name) return user.name;
        return `#${service.assignedToId.slice(0, 8)}`;
      }
      return t("dashboardGeneral.recentOrders.noResponsible");
    },
    [mechanicNameMap, t, user?.id, user?.name],
  );

  const openOrders =
    visibleServices.filter(
      (service) =>
        service.status === "Pendente" || service.status === "Em andamento",
    ).length ?? 0;

  const totalRevenue =
    visibleServices.reduce((acc, service) => {
      const value = Number(service.totalValue);
      return acc + (Number.isNaN(value) ? 0 : value);
    }, 0) ?? 0;

  const clientIds = new Set(
    visibleServices.map((service) => service.clientId).filter(Boolean),
  );
  const vehicleIds = new Set(
    visibleServices.map((service) => service.carId).filter(Boolean),
  );

  const stats = [
    {
      title: isOwner
        ? t("dashboardGeneral.stats.ordersOwner")
        : t("dashboardGeneral.stats.ordersUser"),
      value: String(visibleServices.length),
      change: t("dashboardGeneral.stats.ordersChange", { count: openOrders }),
      icon: Wrench,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: isOwner
        ? t("dashboardGeneral.stats.clientsOwner")
        : t("dashboardGeneral.stats.clientsUser"),
      value: String(clientIds.size),
      change: t("dashboardGeneral.stats.clientsChange"),
      icon: Users,
      color: "text-accent",
      bgColor: "bg-accent-light",
    },
    {
      title: isOwner
        ? t("dashboardGeneral.stats.vehiclesOwner")
        : t("dashboardGeneral.stats.vehiclesUser"),
      value: String(vehicleIds.size),
      change: t("dashboardGeneral.stats.vehiclesChange"),
      icon: CarIcon,
      color: "text-success",
      bgColor: "bg-success-light",
    },
    {
      title: isOwner
        ? t("dashboardGeneral.stats.revenueOwner")
        : t("dashboardGeneral.stats.revenueUser"),
      value: currencyFormat.format(totalRevenue),
      change: t("dashboardGeneral.stats.revenueChange"),
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning-light",
    },
  ];

  const overdueServices = visibleServices.filter(isServiceOverdue);
  const tasksDueToday = visibleServices.filter(isServiceDueToday);
  const deliveriesToday = visibleServices.filter((service) => {
    if (!isFinalStatus(service.status)) return false;
    const updatedAt = getDateIfValid(service.updatedAt);
    return updatedAt ? isSameDay(updatedAt, new Date()) : false;
  });
  const pendingServices = visibleServices.filter(
    (service) => service.status === "Pendente",
  );
  const pendingBudgets = visibleBudgets.filter(
    (budget) => budget.status === "aberto",
  );
  const slowBudgets = visibleBudgets.filter(
    (budget) =>
      budget.status === "aberto" && isOlderThanDays(budget.createdAt, 5),
  );
  const problemOrders = visibleServices.filter(
    (service) => service.status === "Cancelado",
  );

  const alertItems = isOwner
    ? [
        {
          key: "overdue",
          label: t("dashboardGeneral.alerts.overdueShop"),
          value: overdueServices.length,
        },
        {
          key: "slowBudgets",
          label: t("dashboardGeneral.alerts.slowBudgets", { days: 5 }),
          value: slowBudgets.length,
        },
        {
          key: "problems",
          label: t("dashboardGeneral.alerts.problemOrders"),
          value: problemOrders.length,
        },
      ]
    : [
        {
          key: "overdue",
          label: t("dashboardGeneral.alerts.overdueMine"),
          value: overdueServices.length,
        },
        {
          key: "pendingBudgets",
          label: t("dashboardGeneral.alerts.pendingBudgets"),
          value: pendingBudgets.length,
        },
        {
          key: "finishToday",
          label: t("dashboardGeneral.alerts.finishToday"),
          value: tasksDueToday.length,
        },
      ];

  const taskGroups = isOwner
    ? [
        {
          key: "today",
          title: t("dashboardGeneral.todayTasks.forecastShop"),
          items: tasksDueToday,
        },
        {
          key: "deliveries",
          title: t("dashboardGeneral.todayTasks.deliveries"),
          items: deliveriesToday,
        },
        {
          key: "pending",
          title: t("dashboardGeneral.todayTasks.pending"),
          items: pendingServices,
        },
      ]
    : [
        {
          key: "today",
          title: t("dashboardGeneral.todayTasks.forecastUser"),
          items: tasksDueToday,
        },
        {
          key: "deliveries",
          title: t("dashboardGeneral.todayTasks.deliveries"),
          items: deliveriesToday,
        },
        {
          key: "pending",
          title: t("dashboardGeneral.todayTasks.pending"),
          items: pendingServices,
        },
      ];

  const loadingDashboard =
    servicesQuery.isLoading ||
    clientsLoading ||
    carsLoading ||
    budgetsQuery.isLoading;

  return (
    <div className="page-container">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="heading-accent text-2xl md:text-3xl font-bold text-foreground mb-2">
            {t("dashboardGeneral.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("dashboardGeneral.subtitle")}
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("dashboardGeneral.periodFilter.label")}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  aria-label={t("dashboardGeneral.periodFilter.label")}
                  className={cn(
                    "flex w-full md:w-auto md:min-w-[250px] items-center justify-start gap-2 text-left font-normal h-auto py-2 whitespace-normal",
                    !hasActivePeriodFilter && "text-muted-foreground",
                  )}
                >
                  <CalendarRange className="h-4 w-4 text-primary shrink-0" />
                  <span className="break-words">{selectedRangeLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={isMobile ? 1 : 2}
                  defaultMonth={dateRange?.from ?? new Date()}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {hasActivePeriodFilter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearDateRange}
                className="text-xs"
              >
                {t("common.actions.clear")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("dashboardGeneral.periodFilter.helper")}
          </p>
        </div>
      </div>

      {loadingDashboard ? (
        <div
          className="flex items-center gap-3 text-muted-foreground mb-8"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("dashboardGeneral.loading")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className="border-border shadow-md hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--primary))] mb-1">
                      {stat.title}
                    </p>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                      {stat.value}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {stat.change}
                    </p>
                  </div>
                  <div className={`p-2 md:p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon
                      className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="heading-accent text-xl flex items-center gap-2">
              <Bell className="w-4 h-4 text-warning" />
              {t("dashboardGeneral.alerts.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 md:grid-cols-3">
              {alertItems.map((alert) => (
                <div
                  key={alert.key}
                  className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/40"
                >
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {alert.label}
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {alert.value}
                    </p>
                  </div>
                  <Badge
                    variant={alert.value ? "destructive" : "secondary"}
                    className="whitespace-nowrap"
                  >
                    {alert.value
                      ? t("dashboardGeneral.alerts.actionRequired")
                      : t("dashboardGeneral.alerts.noIssues")}
                  </Badge>
                </div>
              ))}
            </div>
            {alertItems.every((item) => item.value === 0) && (
              <p className="text-sm text-muted-foreground">
                {t("dashboardGeneral.alerts.empty")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="heading-accent text-xl flex items-center gap-2">
              <CalendarCheck2 className="w-4 h-4 text-primary" />
              {t("dashboardGeneral.todayTasks.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {taskGroups.map((group) => (
              <div
                key={group.key}
                className="rounded-lg border border-border/60 p-3 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">
                    {group.title}
                  </p>
                  <Badge variant="outline" className="bg-background">
                    {group.items.length}
                  </Badge>
                </div>
                {group.items.length ? (
                  <div className="space-y-2">
                    {group.items.slice(0, 4).map((task) => (
                      <Tooltip key={task.id} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedService(task);
                              setDetailDialogOpen(true);
                            }}
                            className="flex w-full items-center justify-between text-xs text-muted-foreground rounded-md border border-transparent hover:border-border/80 hover:bg-background px-2 py-2 transition-colors"
                            aria-label={t(
                              "dashboardGeneral.todayTasks.openDetails",
                              {
                                defaultValue: "Abrir detalhes do serviço",
                              },
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <ListChecks className="w-3 h-3 text-primary" />
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <span className="text-foreground font-semibold">
                                    #{task.id.substring(0, 8)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  #{task.id}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className="truncate">
                              {clientMap.get(task.clientId) ??
                                t(
                                  "dashboardGeneral.recentOrders.unknownClient",
                                )}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {t("dashboardGeneral.todayTasks.openDetails", {
                            defaultValue: "Abrir detalhes do serviço",
                          })}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("dashboardGeneral.todayTasks.empty")}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="heading-accent text-xl">
            {t("dashboardGeneral.recentOrdersTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {servicesQuery.isLoading ? (
            <div
              className="flex items-center gap-3 text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("dashboardGeneral.recentOrdersLoading")}
            </div>
          ) : servicesQuery.isError ? (
            <p className="text-destructive">
              {servicesQuery.error instanceof Error
                ? servicesQuery.error.message
                : t("dashboardGeneral.recentOrdersError")}
            </p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => {
                const isDelayed = isServiceOverdue(order);
                const dueDate = getServiceForecastDate(order);
                const responsibleName = resolveResponsibleName(order);
                const car = carMap.get(order.carId);
                const clientName =
                  clientMap.get(order.clientId) ??
                  t("dashboardGeneral.recentOrders.unknownClient");
                const priorityLabel = formatPriority(order.priority, t);
                return (
                  <RecentOrderItem
                    key={order.id}
                    order={order}
                    statusLabels={statusLabels}
                    isDelayed={isDelayed}
                    dueDate={dueDate}
                    responsibleName={responsibleName}
                    car={car}
                    clientName={clientName}
                    priorityLabel={priorityLabel}
                    t={t}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) setSelectedService(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              {t("dashboardGeneral.detailModal.title")}
            </DialogTitle>
            <DialogDescription>
              {t("dashboardGeneral.detailModal.subtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedService ? (
            (() => {
              const status = statusLabels[selectedService.status];
              const StatusIcon = status.icon;
              const car = carMap.get(selectedService.carId);
              const budget =
                selectedService.budget ??
                budgets.find((item) => item.id === selectedService.budgetId);
              const dueDate = getServiceForecastDate(selectedService);
              const priorityLabel = formatPriority(selectedService.priority, t);
              const responsibleName = resolveResponsibleName(selectedService);
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("dashboardGeneral.detailModal.orderId")}
                      </p>
                      <p className="font-semibold text-foreground">
                        {selectedService.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("dashboardGeneral.detailModal.status")}
                      </p>
                      <Badge
                        className={cn(
                          "gap-1 text-xs font-semibold border border-transparent",
                          status.className,
                        )}
                      >
                        <StatusIcon
                          className={cn("w-3 h-3", status.iconClass)}
                        />
                        {status.label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("dashboardGeneral.detailModal.client")}
                      </p>
                      <p className="font-semibold text-foreground">
                        {clientMap.get(selectedService.clientId) ??
                          t("dashboardGeneral.recentOrders.unknownClient")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("dashboardGeneral.detailModal.vehicle")}
                      </p>
                      <p className="font-semibold text-foreground">
                        {car
                          ? `${car.marca} ${car.modelo} · ${car.placa}`
                          : t("dashboardGeneral.recentOrders.unknownVehicle")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("dashboardGeneral.detailModal.mechanic")}
                      </p>
                      <p className="font-semibold text-foreground">
                        {responsibleName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("dashboardGeneral.detailModal.value")}
                      </p>
                      <p className="font-semibold text-foreground">
                        {currencyFormat.format(
                          Number(selectedService.totalValue) || 0,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("dashboardGeneral.detailModal.createdAt")}
                      </p>
                      <p className="font-semibold text-foreground">
                        {selectedService.createdAt
                          ? new Date(
                              selectedService.createdAt,
                            ).toLocaleDateString("pt-BR")
                          : t("dashboardGeneral.recentOrders.noForecast")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("dashboardGeneral.detailModal.forecast")}
                      </p>
                      <p className="font-semibold text-foreground">
                        {dueDate
                          ? dueDate.toLocaleDateString("pt-BR")
                          : t("dashboardGeneral.recentOrders.noForecast")}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("dashboardGeneral.detailModal.priority")}
                      </p>
                      <p className="font-semibold text-foreground">
                        {priorityLabel ??
                          t("dashboardGeneral.detailModal.priorityNone")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("dashboardGeneral.detailModal.alert")}
                      </p>
                      <p className="font-semibold text-foreground">
                        {isServiceOverdue(selectedService)
                          ? t("dashboardGeneral.recentOrders.overdue")
                          : t("dashboardGeneral.detailModal.onTrack")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      {t("dashboardGeneral.detailModal.description")}
                    </p>
                    <p className="text-sm text-foreground">
                      {selectedService.description ??
                        t("dashboardGeneral.recentOrders.noDescription")}
                    </p>
                  </div>
                  {budget && (
                    <div className="rounded-lg border border-border/70 p-3 bg-muted/30 space-y-1">
                      <p className="text-xs uppercase text-muted-foreground">
                        {t("dashboardGeneral.detailModal.budgetTitle")}
                      </p>
                      <p className="text-sm text-foreground">
                        {t("dashboardGeneral.detailModal.budgetId", {
                          id: budget.id,
                        })}
                      </p>
                      <p className="text-sm text-foreground">
                        {t("dashboardGeneral.detailModal.budgetValue", {
                          value: currencyFormat.format(
                            Number(budget.amount) || 0,
                          ),
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("dashboardGeneral.detailModal.budgetStatus", {
                          status: budgetStatusLabel(budget.status, t),
                        })}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("common.empty.noData")}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Atualização: Filtro de período unificado (padrão 30 dias) com calendário em pt-BR aplicado a todos os perfis e KPIs/listas sincronizados ao intervalo selecionado.
