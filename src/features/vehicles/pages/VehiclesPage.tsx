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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Calendar, Loader2, Pencil, Trash2 } from "lucide-react";
import VehicleFormDialog from "@/components/VehicleFormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listCars,
  listClients,
  deleteCar,
  updateCar,
} from "@/services/gearbox";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/ui/use-toast";
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
} from "@/components/ui/alert-dialog";
import { VehicleEditDialog } from "@/features/vehicles/components/VehicleEditDialog";

type VehicleUpdateInput = {
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
};

export default function Veiculos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { token, isOwner } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { toast } = useToast();
  const normalizedSearch = searchTerm.trim();

  const carsQuery = useQuery({
    queryKey: ["cars", token, page, normalizedSearch],
    queryFn: () =>
      listCars(token!, {
        page,
        perPage: 12,
        search: normalizedSearch || undefined,
      }),
    enabled: Boolean(token),
    keepPreviousData: true,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", token, "select"],
    queryFn: () => listClients(token!, { page: 1, perPage: 100 }),
    enabled: Boolean(token),
  });

  const updateCarMutation = useMutation({
    mutationFn: ({
      id,
      data,
      label,
    }: {
      id: string;
      data: VehicleUpdateInput;
      label: string;
    }) => updateCar(token!, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      toast({
        title: t("vehicles.toasts.updatedTitle"),
        description: variables?.label
          ? `${variables.label} – ${t("vehicles.toasts.updatedDescription")}`
          : t("vehicles.toasts.updatedDescription"),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("vehicles.toasts.updateError"),
        description:
          error instanceof Error
            ? error.message
            : t("vehicles.toasts.defaultError"),
        variant: "destructive",
      });
    },
  });

  const deleteCarMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      deleteCar(token!, id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      toast({
        title: t("vehicles.toasts.deletedTitle"),
        description: variables?.label
          ? `${variables.label} – ${t("vehicles.toasts.deletedDescription")}`
          : t("vehicles.toasts.deletedDescription"),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("vehicles.toasts.deleteError"),
        description:
          error instanceof Error
            ? error.message
            : t("vehicles.toasts.defaultError"),
        variant: "destructive",
      });
    },
  });

  const clientMap = useMemo(() => {
    const entries =
      clientsQuery.data?.data?.map((client) => [client.id, client.nome]) ?? [];
    return new Map(entries);
  }, [clientsQuery.data]);

  const filteredCars = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const list = carsQuery.data?.data ?? [];
    if (!term) return list;
    return list.filter((car) => {
      const clientName = clientMap.get(car.clientId)?.toLowerCase() ?? "";
      return (
        car.marca.toLowerCase().includes(term) ||
        car.modelo.toLowerCase().includes(term) ||
        car.placa.toLowerCase().includes(term) ||
        clientName.includes(term)
      );
    });
  }, [carsQuery.data, searchTerm, clientMap]);

  const isLoading = carsQuery.isLoading;
  const isError = carsQuery.isError;
  const error = carsQuery.error;

  const handleVehicleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["cars"] });
    setDialogOpen(false);
  };

  const handleVehicleUpdate = (
    id: string,
    data: VehicleUpdateInput,
    label: string,
  ) => updateCarMutation.mutateAsync({ id, data, label });

  const handleVehicleDelete = (id: string, label: string) =>
    deleteCarMutation.mutateAsync({ id, label });

  return (
    <div className="page-container space-y-8">
      <PageHeader
        title={t("vehicles.title")}
        subtitle={t("vehicles.subtitle")}
        actions={
          <Button
            className="gap-2 bg-gradient-accent hover:opacity-90"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-4 h-4" />
            {t("common.actions.createVehicle")}
          </Button>
        }
      />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("vehicles.search")}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("charts.placeholder.loading")}
        </div>
      ) : isError ? (
        <p className="text-destructive">
          {error instanceof Error ? error.message : t("emptyState.error")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCars.map((vehicle) => {
              const vehicleLabel = `${vehicle.marca} ${vehicle.modelo}`.trim();
              const updatingVehicle =
                updateCarMutation.variables?.id === vehicle.id &&
                updateCarMutation.isPending;
              const deletingVehicle =
                deleteCarMutation.variables?.id === vehicle.id &&
                deleteCarMutation.isPending;

              return (
                <Card
                  key={vehicle.id}
                  className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
                >
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {t("vehicles.table.model")}
                      </p>
                      <h3 className="text-lg font-bold text-foreground">
                        {vehicle.marca} {vehicle.modelo}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("vehicles.table.year")} {vehicle.ano}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono">
                        {vehicle.placa}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {t("vehicles.table.client")}:{" "}
                        {clientMap.get(vehicle.clientId) ?? "—"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {t("vehicles.table.createdAt")}{" "}
                      {vehicle.createdAt
                        ? new Date(vehicle.createdAt).toLocaleDateString(
                            "pt-BR",
                          )
                        : "—"}
                    </div>
                    {isOwner && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <VehicleEditDialog
                          vehicle={vehicle}
                          onSubmit={(values) =>
                            handleVehicleUpdate(
                              vehicle.id,
                              values,
                              vehicleLabel,
                            )
                          }
                          renderTrigger={({ open, disabled }) => (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-warning/30 bg-warning-light text-warning hover:bg-warning-light/80"
                              onClick={open}
                              disabled={disabled || updatingVehicle}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              {updatingVehicle
                                ? t("vehicles.actions.updating")
                                : t("common.actions.edit")}
                            </Button>
                          )}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/30 bg-destructive-light text-destructive hover:bg-destructive-light/80"
                              disabled={deletingVehicle}
                            >
                              {deletingVehicle ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              {deletingVehicle
                                ? t("vehicles.actions.deleting")
                                : t("common.actions.delete")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t("vehicles.confirmations.deleteTitle")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("vehicles.confirmations.deleteDescription", {
                                  model: vehicleLabel,
                                  plate: vehicle.placa,
                                })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                {t("common.actions.cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                onClick={() =>
                                  handleVehicleDelete(vehicle.id, vehicleLabel)
                                }
                              >
                                {t("common.actions.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {carsQuery.data?.meta && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                {t("budgets.pagination.page")} {carsQuery.data.meta.currentPage}{" "}
                / {carsQuery.data.meta.lastPage}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1 || carsQuery.isFetching}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  {t("budgets.pagination.prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    page === carsQuery.data.meta.lastPage ||
                    carsQuery.isFetching
                  }
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  {t("budgets.pagination.next")}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <VehicleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={clientsQuery.data?.data ?? []}
        onCreated={handleVehicleCreated}
      />
    </div>
  );
}
