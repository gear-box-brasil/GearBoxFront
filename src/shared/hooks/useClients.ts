import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listClients } from "@/services/gearbox";
import { useAuth } from "@/contexts/AuthContext";
import { gearboxKeys } from "@/lib/queryKeys";
import { QUERY_STALE_TIMES } from "@/config/query";
import type { Client, PaginatedMeta } from "@/types/api";

type UseClientsParams = {
  page?: number;
  perPage?: number;
  enabled?: boolean;
};

export function useClients({
  page = 1,
  perPage = 50,
  enabled = true,
}: UseClientsParams = {}) {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: gearboxKeys.clients.list({ page, perPage }),
    queryFn: () => listClients(token!, { page, perPage }),
    enabled: Boolean(token) && enabled,
    staleTime: QUERY_STALE_TIMES.clients,
    select: (data) => ({
      list: data.data as Client[],
      meta: data.meta as PaginatedMeta,
    }),
  });

  const clientMap = useMemo(() => {
    const entries = query.data?.list?.map((client) => [client.id, client.nome]) ?? [];
    return new Map(entries);
  }, [query.data?.list]);

  return { ...query, clientMap };
}
