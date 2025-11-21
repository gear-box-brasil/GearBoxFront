import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Calendar, Loader2 } from "lucide-react";
import VehicleFormDialog from "@/components/VehicleFormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listCars, listClients } from "@/services/gearbox";
import { useTranslation } from "react-i18next";

export default function Veiculos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const carsQuery = useQuery({
    queryKey: ["cars", token, page],
    queryFn: () => listCars(token!, { page, perPage: 12 }),
    enabled: Boolean(token),
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", token, "select"],
    queryFn: () => listClients(token!, { page: 1, perPage: 100 }),
    enabled: Boolean(token),
  });

  const clientMap = useMemo(() => {
    const entries =
      clientsQuery.data?.data?.map((client) => [client.id, client.nome]) ?? [];
    return new Map(entries);
  }, [clientsQuery.data]);

  const cars = carsQuery.data?.data ?? [];
  const filteredCars = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return cars.filter((car) => {
      const clientName = clientMap.get(car.clientId)?.toLowerCase() ?? "";
      return (
        car.marca.toLowerCase().includes(term) ||
        car.modelo.toLowerCase().includes(term) ||
        car.placa.toLowerCase().includes(term) ||
        clientName.includes(term)
      );
    });
  }, [cars, searchTerm, clientMap]);

  const isLoading = carsQuery.isLoading;
  const isError = carsQuery.isError;
  const error = carsQuery.error;

  const handleVehicleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["cars"] });
    setDialogOpen(false);
  };

  return (
    <div className="page-container bg-gradient-hero rounded-2xl border border-border shadow-lg p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-accent text-3xl font-bold text-foreground mb-2">
            {t("vehicles.title")}
          </h1>
          <p className="text-muted-foreground">{t("vehicles.subtitle")}</p>
        </div>
        <Button
          className="gap-2 bg-gradient-accent hover:opacity-90"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="w-4 h-4" />
          {t("common.actions.createVehicle")}
        </Button>
      </div>

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
            {filteredCars.map((vehicle) => (
              <Card
                key={vehicle.id}
                className="border-border shadow-md hover:shadow-lg transition-shadow"
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
                      ? new Date(vehicle.createdAt).toLocaleDateString("pt-BR")
                      : "—"}
                  </div>
                </CardContent>
              </Card>
            ))}
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
