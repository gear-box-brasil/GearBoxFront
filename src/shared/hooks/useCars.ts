import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCars } from "@/services/gearbox";
import { useAuth } from "@/contexts/AuthContext";
import { gearboxKeys } from "@/lib/queryKeys";
import { QUERY_STALE_TIMES } from "@/config/query";
import type { Car, PaginatedMeta } from "@/types/api";

type UseCarsParams = {
  page?: number;
  perPage?: number;
  enabled?: boolean;
};

export function useCars({ page = 1, perPage = 50, enabled = true }: UseCarsParams = {}) {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: gearboxKeys.cars.list({ page, perPage }),
    queryFn: () => listCars(token!, { page, perPage }),
    enabled: Boolean(token) && enabled,
    staleTime: QUERY_STALE_TIMES.cars,
    select: (data) => ({
      list: data.data as Car[],
      meta: data.meta as PaginatedMeta,
    }),
  });

  const carMap = useMemo(() => {
    const entries = query.data?.list?.map((car) => [car.id, car]) ?? [];
    return new Map(entries);
  }, [query.data?.list]);

  return { ...query, carMap };
}
