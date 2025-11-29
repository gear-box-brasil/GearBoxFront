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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Loader2, Car, Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
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
import {
  listClients,
  listCars,
  createClient,
  updateClient,
  deleteClient,
  createCar,
  deleteCar,
} from "@/services/gearbox";
import type { Client, Car as CarType } from "@/types/api";
import { ClientFormDialog } from "@/features/clients/components/ClientFormDialog";
import { ClientCarDialog } from "@/features/clients/components/ClientCarDialog";
import { useTranslation } from "react-i18next";

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const { token, isOwner } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const normalizedSearch = searchTerm.trim();
  const isSearching = normalizedSearch.length > 0;
  const effectivePage = isSearching ? 1 : page;
  const effectivePerPage = isSearching ? 50 : 9;

  const clientsQuery = useQuery({
    queryKey: [
      "clients",
      token,
      effectivePage,
      effectivePerPage,
      normalizedSearch,
    ],
    queryFn: () =>
      listClients(token!, {
        page: effectivePage,
        perPage: effectivePerPage,
        search: normalizedSearch || undefined,
      }),
    enabled: Boolean(token),
    keepPreviousData: true,
  });

  const carsQuery = useQuery({
    queryKey: ["cars", token, "clients-page"],
    queryFn: () => listCars(token!, { page: 1, perPage: 200 }),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });

  const createClientMutation = useMutation({
    mutationFn: (payload: { nome: string; telefone: string; email?: string }) =>
      createClient(token!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { nome: string; telefone: string; email?: string };
    }) => updateClient(token!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      deleteClient(token!, id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      toast({
        title: t("clients.toasts.clientRemovedTitle"),
        description: t("clients.toasts.clientRemovedDescription", {
          name: variables?.name ?? "",
        }),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("clients.toasts.clientRemovedError"),
        description:
          error instanceof Error
            ? error.message
            : t("clients.toasts.defaultError"),
        variant: "destructive",
      });
    },
  });

  const createCarMutation = useMutation({
    mutationFn: (payload: {
      clientId: string;
      placa: string;
      marca: string;
      modelo: string;
      ano: number;
    }) => createCar(token!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
    },
  });

  const deleteCarMutation = useMutation({
    mutationFn: ({ id }: { id: string; label: string }) =>
      deleteCar(token!, id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      toast({
        title: t("clients.toasts.carRemovedTitle"),
        description: t("clients.toasts.carRemovedDescription", {
          car: variables?.label ?? "",
        }),
      });
    },
    onError: (error: unknown) => {
      toast({
        title: t("clients.toasts.carRemovedError"),
        description:
          error instanceof Error
            ? error.message
            : t("clients.toasts.defaultError"),
        variant: "destructive",
      });
    },
  });

  const clients = useMemo(
    () => clientsQuery.data?.data ?? [],
    [clientsQuery.data],
  );
  const cars = useMemo(() => carsQuery.data?.data ?? [], [carsQuery.data]);

  const carsByClient = useMemo(() => groupCarsByClient(cars), [cars]);

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => {
      const matchesBase =
        client.nome.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.telefone.toLowerCase().includes(term) ||
        client.id.toLowerCase().includes(term);
      if (matchesBase) return true;
      const clientCars = carsByClient.get(client.id) ?? [];
      return clientCars.some((car) =>
        `${car.marca} ${car.modelo} ${car.placa}`.toLowerCase().includes(term),
      );
    });
  }, [clients, searchTerm, carsByClient]);

  const isLoading = clientsQuery.isLoading || carsQuery.isLoading;
  const isError = clientsQuery.isError || carsQuery.isError;

  const handleCreateClient = (values: {
    nome: string;
    telefone: string;
    email?: string;
  }) => createClientMutation.mutateAsync(values);

  const handleEditClient = (
    id: string,
    values: { nome: string; telefone: string; email?: string },
  ) => updateClientMutation.mutateAsync({ id, data: values });

  const handleDeleteClient = (id: string, name: string) =>
    deleteClientMutation.mutateAsync({ id, name });

  const handleAddCar = (values: {
    clientId: string;
    placa: string;
    marca: string;
    modelo: string;
    ano: number;
  }) => createCarMutation.mutateAsync(values);

  const handleDeleteCar = (id: string, label: string) =>
    deleteCarMutation.mutateAsync({ id, label });

  return (
    <div className="page-container space-y-8">
      <PageHeader
        eyebrow={t("owner.header.eyebrow")}
        title={t("clients.title")}
        subtitle={t("clients.subtitle")}
        actions={
          <ClientFormDialog
            onSubmit={handleCreateClient}
            renderTrigger={({ open, disabled }) => (
              <Button
                className="gap-2 bg-gradient-accent hover:opacity-90"
                onClick={open}
                disabled={disabled}
              >
                <Plus className="w-4 h-4" />
                {t("common.actions.createClient")}
              </Button>
            )}
          />
        }
      />

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <SearchInput
          placeholder={t("clients.search")}
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(1);
          }}
          wrapperClassName="max-w-xl"
        />
        <p className="text-xs text-muted-foreground">
          {clientsQuery.data?.meta?.total ?? 0}{" "}
          {t("clients.title").toLowerCase()}
        </p>
      </div>

      {isLoading ? (
        <div className="mt-10 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("charts.placeholder.loading")}
        </div>
      ) : isError ? (
        <p className="mt-10 text-destructive">
          {clientsQuery.error instanceof Error
            ? clientsQuery.error.message
            : carsQuery.error instanceof Error
              ? carsQuery.error.message
              : t("emptyState.error")}
        </p>
      ) : filteredClients.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={t("clients.table.empty")}
            description={t("clients.subtitle")}
          />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {filteredClients.map((client) => {
              const clientCars = carsByClient.get(client.id) ?? [];
              const createdBy = client.createdByUser?.nome ?? "—";
              const updatedBy = client.updatedByUser?.nome ?? "—";
              const createdAt = client.createdAt
                ? new Date(client.createdAt).toLocaleDateString("pt-BR")
                : "—";
              const updatedAt = client.updatedAt
                ? new Date(client.updatedAt).toLocaleDateString("pt-BR")
                : "—";
              const deleting =
                deleteClientMutation.variables?.id === client.id &&
                deleteClientMutation.isPending;

              return (
                <Card
                  key={client.id}
                  className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
                >
                  <CardContent className="space-y-4 p-4 md:space-y-5 md:p-6">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("clients.table.name")}
                      </p>
                      <h3 className="text-xl font-semibold text-foreground">
                        {client.nome}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        ID: {client.id}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("clients.table.email")}
                          </p>
                          <p className="text-sm text-foreground break-all">
                            {client.email ?? t("common.empty.noData")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("clients.table.phone")}
                          </p>
                          <p className="text-sm text-foreground">
                            {client.telefone}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 md:p-4">
                      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("vehicles.title")}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {clientCars.length || t("common.empty.noData")}
                          </p>
                        </div>
                        <ClientCarDialog
                          clientId={client.id}
                          clientName={client.nome}
                          onSubmit={handleAddCar}
                          renderTrigger={({ open, disabled }) => (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full sm:w-auto border-sky-200 dark:border-sky-400/60 bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-200 hover:bg-sky-200 dark:hover:bg-sky-500/20"
                              onClick={open}
                              disabled={disabled || createCarMutation.isPending}
                            >
                              <Car className="mr-1 h-3.5 w-3.5" />
                              {t("clients.actions.addCar", {
                                defaultValue: "Adicionar carro",
                              })}
                            </Button>
                          )}
                        />
                      </div>
                      {clientCars.length > 0 ? (
                        <div className="mt-3 flex flex-col gap-2">
                          {clientCars.map((car) => {
                            const carLabel = `${car.placa} · ${car.marca} ${car.modelo}`;
                            const removingCar =
                              deleteCarMutation.variables?.id === car.id &&
                              deleteCarMutation.isPending;
                            return (
                              <div
                                key={car.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background/70 px-3 py-2"
                              >
                                <Badge variant="outline" className="text-xs">
                                  {carLabel}
                                </Badge>
                                {isOwner && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive focus-visible:ring-destructive"
                                        disabled={removingCar}
                                      >
                                        {removingCar ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">
                                          {t("clients.actions.removeCar")}
                                        </span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          {t(
                                            "clients.confirmations.carDeleteTitle",
                                          )}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {t(
                                            "clients.confirmations.carDeleteDescription",
                                            {
                                              car: `${car.marca} ${car.modelo}`,
                                              plate: car.placa,
                                              client: client.nome,
                                            },
                                          )}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          {t("common.actions.cancel")}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteCar(car.id, carLabel)
                                          }
                                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                        >
                                          {t("common.actions.delete")}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground">
                          {t("vehicles.table.empty")}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 md:p-4 text-xs md:text-sm text-muted-foreground">
                      <p>
                        Cadastrado por{" "}
                        <span className="font-semibold text-foreground">
                          {createdBy}
                        </span>{" "}
                        em {createdAt}
                      </p>
                      <p>
                        Atualizado por{" "}
                        <span className="font-semibold text-foreground">
                          {updatedBy}
                        </span>{" "}
                        em {updatedAt}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <ClientFormDialog
                        mode="edit"
                        initialValues={{
                          nome: client.nome,
                          telefone: client.telefone,
                          email: client.email ?? "",
                        }}
                        onSubmit={(values) =>
                          handleEditClient(client.id, values)
                        }
                        renderTrigger={({ open, disabled }) => (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-warning/30 bg-warning-light text-warning hover:bg-warning-light/80"
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
                              className="border-destructive/30 bg-destructive-light text-destructive hover:bg-destructive-light/80"
                              disabled={deleting}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              {deleting
                                ? t("clients.actions.deleting")
                                : t("common.actions.delete")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t("clients.confirmations.clientDeleteTitle")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t(
                                  "clients.confirmations.clientDeleteDescription",
                                  { name: client.nome },
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                {t("common.actions.cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteClient(client.id, client.nome)
                                }
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                {t("common.actions.delete")}
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

          {!isSearching && clientsQuery.data?.meta && (
            <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Página {clientsQuery.data.meta.currentPage} de{" "}
                {clientsQuery.data.meta.lastPage}
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
                    page === clientsQuery.data.meta.lastPage ||
                    clientsQuery.isFetching
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
