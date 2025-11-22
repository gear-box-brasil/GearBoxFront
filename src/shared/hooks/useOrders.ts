import { useMemo } from "react";
import { useServices } from "@/hooks/useServices";
import { useClients } from "@/hooks/useClients";
import { useCars } from "@/hooks/useCars";

type UseOrdersParams = {
  page?: number;
  perPage?: number;
};

export function useOrders({ page = 1, perPage = 10 }: UseOrdersParams = {}) {
  const servicesQuery = useServices({ page, perPage });
  const clientsQuery = useClients({ page: 1, perPage: 200 });
  const carsQuery = useCars({ page: 1, perPage: 200 });

  const clientMap = useMemo(() => {
    const entries =
      clientsQuery.data?.list?.map((client) => [client.id, client.nome]) ?? [];
    return new Map(entries);
  }, [clientsQuery.data?.list]);

  const carMap = useMemo(() => {
    const entries = carsQuery.data?.list?.map((car) => [car.id, car]) ?? [];
    return new Map(entries);
  }, [carsQuery.data?.list]);

  return {
    servicesQuery,
    clientsQuery,
    carsQuery,
    clientMap,
    carMap,
  };
}
