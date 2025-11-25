import { useQuery } from "@tanstack/react-query";
import { listBudgets } from "@/services/gearbox";
import { useAuth } from "@/contexts/AuthContext";
import { gearboxKeys } from "@/lib/queryKeys";
import { QUERY_STALE_TIMES } from "@/config/query";
import type { Budget, PaginatedMeta } from "@/types/api";

type UseBudgetsParams = {
  page?: number;
  perPage?: number;
  enabled?: boolean;
  filters?: {
    startDate?: string | null;
    endDate?: string | null;
  };
};

export function useBudgets({
  page = 1,
  perPage = 10,
  enabled = true,
  filters,
}: UseBudgetsParams = {}) {
  const { token, isOwner, user } = useAuth();
  const scope = isOwner ? "owner" : "mine";
  const queryParams = {
    page,
    perPage,
    scope,
    userId: !isOwner ? user?.id : undefined,
    startDate: filters?.startDate ?? undefined,
    endDate: filters?.endDate ?? undefined,
  };

  return useQuery({
    queryKey: gearboxKeys.budgets.list(queryParams),
    queryFn: () => listBudgets(token!, queryParams),
    enabled: Boolean(token) && enabled,
    staleTime: QUERY_STALE_TIMES.budgets,
    keepPreviousData: true,
    select: (data) => ({
      list: data.data as Budget[],
      meta: data.meta as PaginatedMeta,
    }),
  });
}
