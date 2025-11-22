import { useQuery } from "@tanstack/react-query";
import { listServices } from "@/services/gearbox";
import { useAuth } from "@/contexts/AuthContext";
import { gearboxKeys } from "@/lib/queryKeys";
import { QUERY_STALE_TIMES } from "@/config/query";
import type { PaginatedMeta, Service } from "@/types/api";

type UseServicesParams = {
  page?: number;
  perPage?: number;
  enabled?: boolean;
};

export function useServices({
  page = 1,
  perPage = 10,
  enabled = true,
}: UseServicesParams = {}) {
  const { token, isOwner, user } = useAuth();
  const scope = isOwner ? "owner" : "mine";
  const queryParams = {
    page,
    perPage,
    scope,
    userId: !isOwner ? user?.id : undefined,
    assignedToId: !isOwner ? user?.id : undefined,
  };

  return useQuery({
    queryKey: gearboxKeys.services.list(queryParams),
    queryFn: () => listServices(token!, queryParams),
    enabled: Boolean(token) && enabled,
    staleTime: QUERY_STALE_TIMES.services,
    select: (data) => ({
      list: data.data as Service[],
      meta: data.meta as PaginatedMeta,
    }),
  });
}
