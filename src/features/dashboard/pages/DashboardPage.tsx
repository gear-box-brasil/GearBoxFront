import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  Bell,
  CalendarCheck2,
  ListChecks,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  listServices,
  listClients,
  listCars,
  listBudgets,
} from "@/services/gearbox";
import type { ServiceStatus, Service, Budget, BudgetStatus } from "@/types/api";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

type ExtendedService = Service & {
  expectedCompletion?: string | null;
  expectedDate?: string | null;
  forecastDate?: string | null;
  dueDate?: string | null;
  estimatedDelivery?: string | null;
  deliveryDate?: string | null;
  deadline?: string | null;
};

const statusConfig = (
  t: (key: string) => string
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

const getDateIfValid = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getServiceForecastDate = (service: ExtendedService) => {
  const candidates: (keyof ExtendedService)[] = [
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
const formatPriority = (
  priority: string | null | undefined,
  t: (key: string, options?: any) => string
) => {
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

const budgetStatusLabel = (
  status: BudgetStatus,
  t: (key: string, options?: any) => string
) => {
  const mapping: Record<BudgetStatus, string> = {
    aberto: t("budgets.status.aberto"),
    aceito: t("budgets.status.aceito"),
    recusado: t("budgets.status.recusado"),
    cancelado: t("budgets.status.cancelado"),
  };
  return mapping[status] ?? status;
};

export default function Dashboard() {
  const { token, user, isOwner } = useAuth();
  const { t } = useTranslation();
  const statusLabels = statusConfig(t);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ExtendedService | null>(
    null
  );

  const servicesQuery = useQuery({
    queryKey: ["services", token, "dashboard"],
    queryFn: () => listServices(token!, { page: 1, perPage: 50 }),
    enabled: Boolean(token),
  });

  const budgetsQuery = useQuery({
    queryKey: ["budgets", token, "dashboard"],
    queryFn: () => listBudgets(token!, { page: 1, perPage: 50 }),
    enabled: Boolean(token),
  });

  const clientsForMapQuery = useQuery({
    queryKey: ["clients", token, "dashboard-map"],
    queryFn: () => listClients(token!, { page: 1, perPage: 200 }),
    enabled: Boolean(token),
  });

  const carsForMapQuery = useQuery({
    queryKey: ["cars", token, "dashboard-map"],
    queryFn: () => listCars(token!, { page: 1, perPage: 200 }),
    enabled: Boolean(token),
  });

  const services = (servicesQuery.data?.data ?? []) as ExtendedService[];
  const budgets = (budgetsQuery.data?.data ?? []) as Budget[];
  const clientMap = useMemo(() => {
    const entries =
      clientsForMapQuery.data?.data?.map((client) => [
        client.id,
        client.nome,
      ]) ?? [];
    return new Map(entries);
  }, [clientsForMapQuery.data]);

  const carMap = useMemo(() => {
    const entries =
      carsForMapQuery.data?.data?.map((car) => [car.id, car]) ?? [];
    return new Map(entries);
  }, [carsForMapQuery.data]);

  const visibleServices = useMemo(() => {
    if (isOwner) return services;
    const mechanicId = user?.id;
    if (!mechanicId) return [];
    return services.filter(
      (service) =>
        service.userId === mechanicId ||
        service.assignedToId === mechanicId ||
        service.budget?.userId === mechanicId
    );
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
    [visibleServices]
  );

  const openOrders =
    visibleServices.filter(
      (service) =>
        service.status === "Pendente" || service.status === "Em andamento"
    ).length ?? 0;

  const totalRevenue =
    visibleServices.reduce((acc, service) => {
      const value = Number(service.totalValue);
      return acc + (Number.isNaN(value) ? 0 : value);
    }, 0) ?? 0;

  const clientIds = new Set(
    visibleServices.map((service) => service.clientId).filter(Boolean)
  );
  const vehicleIds = new Set(
    visibleServices.map((service) => service.carId).filter(Boolean)
  );

  const stats = [
    {
      title: isOwner
        ? t("dashboardGeneral.stats.ordersOwner")
        : t("dashboardGeneral.stats.ordersUser"),
      value:
        (isOwner
          ? servicesQuery.data?.meta.total
          : visibleServices.length
        )?.toString() ?? "—",
      change: t("dashboardGeneral.stats.ordersChange", { count: openOrders }),
      icon: Wrench,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: isOwner
        ? t("dashboardGeneral.stats.clientsOwner")
        : t("dashboardGeneral.stats.clientsUser"),
      value:
        (isOwner
          ? clientsForMapQuery.data?.meta.total
          : clientIds.size
        )?.toString() ?? "—",
      change: t("dashboardGeneral.stats.clientsChange"),
      icon: Users,
      color: "text-accent",
      bgColor: "bg-accent-light",
    },
    {
      title: isOwner
        ? t("dashboardGeneral.stats.vehiclesOwner")
        : t("dashboardGeneral.stats.vehiclesUser"),
      value:
        (isOwner
          ? carsForMapQuery.data?.meta.total
          : vehicleIds.size
        )?.toString() ?? "—",
      change: t("dashboardGeneral.stats.vehiclesChange"),
      icon: Car,
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
    (service) => service.status === "Pendente"
  );
  const pendingBudgets = visibleBudgets.filter(
    (budget) => budget.status === "aberto"
  );
  const slowBudgets = visibleBudgets.filter(
    (budget) =>
      budget.status === "aberto" && isOlderThanDays(budget.createdAt, 5)
  );
  const problemOrders = visibleServices.filter(
    (service) => service.status === "Cancelado"
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
    clientsForMapQuery.isLoading ||
    carsForMapQuery.isLoading ||
    budgetsQuery.isLoading;

  return (
    <div className="page-container bg-gradient-hero rounded-2xl border border-border shadow-lg p-6 md:p-8">
      <div className="mb-8">
        <h1 className="heading-accent text-3xl font-bold text-foreground mb-2">
          {t("dashboardGeneral.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("dashboardGeneral.subtitle")}
        </p>
      </div>

      {loadingDashboard ? (
        <div className="flex items-center gap-3 text-muted-foreground mb-8">
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
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--primary))] mb-1">
                      {stat.title}
                    </p>
                    <h3 className="text-3xl font-bold text-foreground mb-2">
                      {stat.value}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {stat.change}
                    </p>
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

      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card className="border-border shadow-md">
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
                  <Badge variant={alert.value ? "destructive" : "secondary"}>
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

        <Card className="border-border shadow-md">
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
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          setSelectedService(task);
                          setDetailDialogOpen(true);
                        }}
                        className="flex w-full items-center justify-between text-xs text-muted-foreground rounded-md border border-transparent hover:border-border/80 hover:bg-background px-2 py-2 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ListChecks className="w-3 h-3 text-primary" />
                          <span className="text-foreground font-semibold">
                            {task.id}
                          </span>
                        </div>
                        <span className="truncate">
                          {clientMap.get(task.clientId) ??
                            t("dashboardGeneral.recentOrders.unknownClient")}
                        </span>
                      </button>
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

      <Card className="border-border shadow-md">
        <CardHeader>
          <CardTitle className="heading-accent text-xl">
            {t("dashboardGeneral.recentOrdersTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {servicesQuery.isLoading ? (
            <div className="flex items-center gap-3 text-muted-foreground">
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
                const StatusIcon = statusLabels[order.status].icon;
                const isDelayed = isServiceOverdue(order);
                const dueDate = getServiceForecastDate(order);
                const responsibleName =
                  order.assignedTo?.nome ??
                  order.user?.nome ??
                  order.budget?.user?.nome ??
                  t("dashboardGeneral.recentOrders.noResponsible");
                const car = carMap.get(order.carId);
                const clientName =
                  clientMap.get(order.clientId) ??
                  t("dashboardGeneral.recentOrders.unknownClient");
                const priorityLabel = formatPriority(order.priority, t);
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {order.id}
                        </span>
                        <Badge
                          className={cn(
                            "gap-1 text-xs font-semibold border border-transparent",
                            statusLabels[order.status].className
                          )}
                        >
                          <StatusIcon
                            className={cn(
                              "w-3 h-3",
                              statusLabels[order.status].iconClass
                            )}
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
                            {t("dashboardGeneral.labels.priority")}:{" "}
                            {priorityLabel}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground font-medium">
                        {clientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {car
                          ? `${car.marca} ${car.modelo} · ${car.placa}`
                          : t("dashboardGeneral.recentOrders.unknownVehicle")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.description ??
                          t("dashboardGeneral.recentOrders.noDescription")}
                      </p>
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
                            ? new Date(order.createdAt).toLocaleDateString(
                                "pt-BR"
                              )
                            : t("dashboardGeneral.recentOrders.noForecast")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">
                        {currencyFormat.format(Number(order.totalValue) || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.updatedAt
                          ? t("dashboardGeneral.recentOrders.updatedAt", {
                              date: new Date(
                                order.updatedAt
                              ).toLocaleDateString("pt-BR"),
                            })
                          : ""}
                      </p>
                    </div>
                  </div>
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
              const priorityLabel = formatPriority(
                selectedService.priority,
                t
              );
              const responsibleName =
                selectedService.assignedTo?.nome ??
                selectedService.user?.nome ??
                selectedService.budget?.user?.nome ??
                t("dashboardGeneral.recentOrders.noResponsible");
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
                          status.className
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
                          Number(selectedService.totalValue) || 0
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
                              selectedService.createdAt
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
                            Number(budget.amount) || 0
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
