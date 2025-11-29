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

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  CalendarClock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateService } from "@/services/gearbox";
import type { ServiceStatus } from "@/types/api";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
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
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useOrders } from "@/hooks/useOrders";
import { gearboxKeys } from "@/lib/queryKeys";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusConfig = (
  t: (key: string) => string,
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

const SERVICE_STATUS_OPTIONS: ServiceStatus[] = [
  "Pendente",
  "Em andamento",
  "Concluído",
  "Cancelado",
];
const SERVICE_STATUS_FILTER_OPTIONS: (ServiceStatus | "todos")[] = [
  "todos",
  ...SERVICE_STATUS_OPTIONS,
];

type StatusDialogPayload = {
  serviceId: string;
  clientName: string;
  currentStatus: ServiceStatus;
  nextStatus: ServiceStatus;
};

const currencyFormat = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const ServiceDescription = ({ description }: { description: string }) => {
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
                  <DialogTitle>Descrição do Serviço</DialogTitle>
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

export default function Ordens() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | "todos">(
    "todos",
  );
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const { token, isOwner, user } = useAuth();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogPayload, setStatusDialogPayload] =
    useState<StatusDialogPayload | null>(null);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendTargetId, setExtendTargetId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState("");
  const [extendDate, setExtendDate] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const statusLabels = statusConfig(t);
  const normalizedSearch = searchTerm.trim();

  const { servicesQuery, clientsQuery, carsQuery, clientMap, carMap } =
    useOrders({
      page,
      perPage: 10,
      search: normalizedSearch || undefined,
    });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      dataPrevista,
      prazoEstimadoDias,
    }: {
      id: string;
      status: ServiceStatus;
      dataPrevista?: string;
      prazoEstimadoDias?: number;
    }) => {
      if (!token) {
        throw new Error(t("orders.toasts.updateErrorDesc"));
      }
      return updateService(token, id, {
        status,
        dataPrevista,
        prazoEstimadoDias,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gearboxKeys.services.all });
      toast({
        title: t("orders.toasts.statusUpdated"),
        description: t("orders.toasts.statusSynced"),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("orders.toasts.updateError"),
        description:
          error instanceof Error
            ? error.message
            : t("orders.toasts.updateErrorDesc"),
        variant: "destructive",
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

  const services = useMemo(
    () => servicesQuery.data?.list ?? [],
    [servicesQuery.data],
  );
  const getDateIfValid = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  const getDataPrevista = (service: (typeof services)[number]) => {
    const date =
      getDateIfValid(service.dataPrevista ?? undefined) ??
      getDateIfValid(service.forecastDate ?? undefined) ??
      null;
    if (date) return date;
    if (service.prazoEstimadoDias && service.createdAt) {
      const base = getDateIfValid(service.createdAt);
      if (base) {
        return new Date(
          base.getTime() + service.prazoEstimadoDias * 24 * 60 * 60 * 1000,
        );
      }
    }
    return null;
  };

  const getPrazoStatus = (service: (typeof services)[number]) => {
    const dataPrevista = getDataPrevista(service);
    if (!dataPrevista)
      return {
        label: t("orders.deadline.noForecast"),
        variant: "secondary" as const,
      };
    const today = new Date();
    const sameDay = dataPrevista.toDateString() === today.toDateString();
    if (dataPrevista < today && service.status !== "Concluído") {
      return {
        label: t("orders.deadline.late"),
        variant: "destructive" as const,
      };
    }
    if (sameDay)
      return {
        label: t("orders.deadline.dueToday"),
        variant: "warning" as const,
      };
    return { label: t("orders.deadline.onTrack"), variant: "outline" as const };
  };

  const getDaysRemaining = (service: (typeof services)[number]) => {
    const dataPrevista = getDataPrevista(service);
    if (!dataPrevista) return null;
    const today = new Date();
    const diffMs = dataPrevista.getTime() - today.getTime();
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  };

  const getBaseForecast = (service: (typeof services)[number]) => {
    if (service.prazoEstimadoDias && service.createdAt) {
      const base = getDateIfValid(service.createdAt);
      if (base) {
        return new Date(
          base.getTime() + service.prazoEstimadoDias * 24 * 60 * 60 * 1000,
        );
      }
    }
    return null;
  };

  const isExtended = (service: (typeof services)[number]) => {
    const dataPrevista = getDataPrevista(service);
    const base = getBaseForecast(service);
    if (!dataPrevista || !base) return false;
    return !isSameDay(dataPrevista, base);
  };

  const allowedServices = useMemo(() => {
    if (isOwner) return services;
    const mechanicId = user?.id;
    if (!mechanicId) return [];
    return services.filter(
      (service) =>
        service.userId === mechanicId || service.assignedToId === mechanicId,
    );
  }, [isOwner, services, user?.id]);

  const filteredServices = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const fromDate = createdFrom ? new Date(createdFrom) : null;
    const toDate = createdTo ? new Date(createdTo) : null;

    const filtered = allowedServices.filter((service) => {
      if (statusFilter !== "todos" && service.status !== statusFilter)
        return false;
      if (fromDate || toDate) {
        const createdAt = service.createdAt
          ? new Date(service.createdAt)
          : null;
        if (!createdAt) return false;
        if (fromDate && createdAt < fromDate) return false;
        if (toDate && createdAt > toDate) return false;
      }
      if (!term) return true;
      const clientName = clientMap.get(service.clientId)?.toLowerCase() ?? "";
      const car = carMap.get(service.carId);
      const vehicleText = car
        ? `${car.marca} ${car.modelo} ${car.placa}`.toLowerCase()
        : "";
      return (
        service.id.toLowerCase().includes(term) ||
        clientName.includes(term) ||
        vehicleText.includes(term) ||
        (service.description ?? "").toLowerCase().includes(term)
      );
    });

    return filtered.slice().sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [
    allowedServices,
    searchTerm,
    clientMap,
    carMap,
    statusFilter,
    createdFrom,
    createdTo,
  ]);

  const requestStatusChange = (
    serviceId: string,
    clientName: string,
    currentStatus: ServiceStatus,
    nextStatus: ServiceStatus,
    canUpdate: boolean,
  ) => {
    if (!canUpdate) return;
    if (statusDialogOpen || currentStatus === nextStatus) return;
    openStatusDialog({ serviceId, clientName, currentStatus, nextStatus });
  };

  return (
    <div className="page-container space-y-8">
      <PageHeader title={t("orders.title")} subtitle={t("orders.subtitle")} />

      <div className="mb-6">
        <SearchInput
          placeholder={t("orders.search")}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1 text-xs">
          <p className="text-muted-foreground uppercase tracking-wide">
            {t("orders.filters.status")}
          </p>
          <Select
            value={statusFilter}
            onValueChange={(value: typeof statusFilter) =>
              setStatusFilter(value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("orders.filters.all")} />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_STATUS_FILTER_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "todos"
                    ? t("orders.filters.all")
                    : statusLabels[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 text-xs">
          <p className="text-muted-foreground uppercase tracking-wide">
            {t("orders.filters.dateFrom")}
          </p>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Input
                type="date"
                value={createdFrom}
                aria-label={t("orders.filters.dateFrom")}
                onChange={(event) => setCreatedFrom(event.target.value)}
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              {t("orders.filters.dateFrom")}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="space-y-1 text-xs">
          <p className="text-muted-foreground uppercase tracking-wide">
            {t("orders.filters.dateTo")}
          </p>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Input
                type="date"
                value={createdTo}
                aria-label={t("orders.filters.dateTo")}
                onChange={(event) => setCreatedTo(event.target.value)}
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              {t("orders.filters.dateTo")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

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
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredServices.map((service) => {
              const statusMutationId = updateStatusMutation.variables?.id;
              const isUpdatingStatus =
                statusMutationId === service.id &&
                updateStatusMutation.isPending;
              const config = statusLabels[service.status];
              const StatusIcon = config?.icon;
              const clientName =
                clientMap.get(service.clientId) ?? "Cliente não encontrado";
              const car = carMap.get(service.carId);
              const total = currencyFormat.format(
                Number(service.totalValue) || 0,
              );
              const canUpdateService =
                isOwner ||
                service.userId === user?.id ||
                service.assignedToId === user?.id;
              const canManageDeadline = canUpdateService;
              return (
                <Card
                  key={service.id}
                  className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
                >
                  <CardContent className="space-y-4 p-4 md:space-y-5 md:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-base md:text-lg font-semibold text-foreground">
                          {clientName}
                        </p>
                        <div className="mt-1">
                          <p className="text-sm font-medium text-foreground">
                            {car
                              ? `${car.marca} ${car.modelo}`
                              : "Não localizado"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {car?.placa ?? "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="text-xl md:text-2xl font-bold text-foreground">
                          {total}
                        </p>
                        <Badge
                          className={cn(
                            "mt-1 w-fit px-3 py-1 text-xs font-semibold border border-transparent",
                            config.className,
                          )}
                        >
                          <StatusIcon
                            className={cn("w-3 h-3 mr-1", config.iconClass)}
                          />
                          {config.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4 text-sm sm:grid-cols-4 border-y border-border/40 py-3 md:py-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Ordem
                        </p>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <p
                              className="font-medium text-foreground truncate"
                              aria-label={service.id}
                            >
                              #{service.id.slice(0, 8)}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            #{service.id}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {t("orders.table.createdAt") || "Criado em"}
                        </p>
                        <p className="font-medium text-foreground">
                          {service.createdAt
                            ? new Date(service.createdAt).toLocaleDateString(
                                "pt-BR",
                              )
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {t("orders.deadline.estimatedDays")}
                        </p>
                        <p className="font-medium text-foreground">
                          {service.prazoEstimadoDias ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Responsável
                        </p>
                        <p className="font-medium text-foreground">
                          {service.user?.nome ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {t("orders.deadline.forecast")}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {(() => {
                            const dataPrevista = getDataPrevista(service);
                            return dataPrevista
                              ? dataPrevista.toLocaleDateString("pt-BR")
                              : t("orders.deadline.noForecast");
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {t("orders.deadline.status")}
                        </p>
                        {(() => {
                          const prazo = getPrazoStatus(service);
                          return (
                            <Badge
                              variant={prazo.variant}
                              className="w-fit text-xs mt-1"
                            >
                              <CalendarClock className="h-3 w-3 mr-1" />
                              {prazo.label}
                            </Badge>
                          );
                        })()}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {t("orders.deadline.remaining")}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {(() => {
                            const remaining = getDaysRemaining(service);
                            if (remaining === null)
                              return t("orders.deadline.noForecast");
                            return remaining >= 0
                              ? t("orders.deadline.remainingDays", {
                                  count: remaining,
                                })
                              : t("orders.deadline.overdueDays", {
                                  count: Math.abs(remaining),
                                });
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {t("orders.deadline.extended")}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {isExtended(service)
                            ? t("orders.deadline.extendedYes")
                            : t("orders.deadline.extendedNo")}
                        </p>
                      </div>
                    </div>

                    <ServiceDescription
                      description={service.description ?? ""}
                    />

                    <div className="flex flex-col gap-3 pt-2 border-t border-border/60 md:gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
                        <div className="space-y-1 flex-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Atualizar status
                          </p>
                          {canUpdateService ? (
                            <div className="flex items-center gap-2 max-w-xs">
                              <Select
                                value={service.status}
                                onValueChange={(value) =>
                                  requestStatusChange(
                                    service.id,
                                    clientName,
                                    service.status,
                                    value as ServiceStatus,
                                    canUpdateService,
                                  )
                                }
                                disabled={isUpdatingStatus || statusDialogOpen}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("orders.filters.status")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {SERVICE_STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {statusLabels[status].label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {isUpdatingStatus && (
                                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {t("orders.dialogs.updateStatusDescription")}
                            </p>
                          )}
                        </div>

                        <div className="flex items-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                              setExtendTargetId(service.id);
                              setExtendDialogOpen(true);
                              setExtendDays("");
                              setExtendDate("");
                            }}
                            disabled={!canManageDeadline}
                          >
                            <CalendarClock className="h-4 w-4" />
                            {t("orders.deadline.extend")}
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Atualizado por{" "}
                        <span className="font-medium text-foreground">
                          {service.updatedBy?.nome ?? "—"}
                        </span>
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
                {t("orders.pagination.page", { defaultValue: "Página" })}{" "}
                {servicesQuery.data.meta.currentPage} /{" "}
                {servicesQuery.data.meta.lastPage}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1 || servicesQuery.isFetching}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  {t("orders.pagination.prev", { defaultValue: "Anterior" })}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    page === servicesQuery.data.meta.lastPage ||
                    servicesQuery.isFetching
                  }
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  {t("orders.pagination.next", { defaultValue: "Próxima" })}
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
            <AlertDialogTitle>
              {t("orders.dialogs.updateStatusTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusDialogPayload ? (
                <>
                  {t("orders.dialogs.updateStatusDescription")}{" "}
                  <span className="font-semibold">
                    {statusDialogPayload.serviceId}
                  </span>{" "}
                  →{" "}
                  <span className="font-semibold">
                    {statusDialogPayload.nextStatus}
                  </span>
                </>
              ) : (
                t("orders.dialogs.updateStatusDescription")
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              className="bg-emerald-500 hover:bg-emerald-500/90"
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={extendDialogOpen}
        onOpenChange={(open) => {
          setExtendDialogOpen(open);
          if (!open) {
            setExtendDays("");
            setExtendDate("");
            setExtendTargetId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("orders.deadline.extendTitle")}</DialogTitle>
            <DialogDescription>
              {t("orders.deadline.extendHelper")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t("orders.deadline.extendDays")}
              </p>
              <Input
                type="number"
                min="0"
                value={extendDays}
                onChange={(event) => setExtendDays(event.target.value)}
                placeholder="3"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t("orders.deadline.extendDate")}
              </p>
              <Input
                type="date"
                value={extendDate}
                onChange={(event) => setExtendDate(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExtendDialogOpen(false);
                setExtendTargetId(null);
                setExtendDays("");
                setExtendDate("");
              }}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!extendTargetId) return;
                const currentService = services.find(
                  (s) => s.id === extendTargetId,
                );
                if (!currentService) return;
                let newDate: Date | null = null;
                if (extendDate) {
                  const parsed = new Date(extendDate);
                  if (!Number.isNaN(parsed.getTime())) newDate = parsed;
                } else if (extendDays) {
                  const daysNumber = Number(extendDays);
                  const base = getDataPrevista(currentService) ?? new Date();
                  if (!Number.isNaN(daysNumber)) {
                    newDate = new Date(
                      base.getTime() + daysNumber * 24 * 60 * 60 * 1000,
                    );
                  }
                }
                if (!newDate) {
                  toast({
                    title: t("orders.deadline.extendError"),
                    description: t("orders.deadline.extendHelper"),
                    variant: "destructive",
                  });
                  return;
                }
                updateStatusMutation.mutate({
                  id: extendTargetId,
                  status: currentService.status,
                  dataPrevista: newDate.toISOString(),
                });
                setExtendDialogOpen(false);
                setExtendDays("");
                setExtendDate("");
                setExtendTargetId(null);
              }}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending
                ? t("charts.placeholder.loading")
                : t("orders.deadline.extendAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
