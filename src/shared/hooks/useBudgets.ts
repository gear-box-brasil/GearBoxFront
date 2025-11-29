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

import { useQuery } from "@tanstack/react-query";
import { listBudgets } from "@/services/gearbox";
import { useAuth } from "@/contexts/AuthContext";
import { gearboxKeys } from "@/lib/queryKeys";
import { QUERY_STALE_TIMES } from "@/config/query";
import type { Budget, PaginatedMeta, PaginatedResponse } from "@/types/api";

type PaginatedListResult<T> = {
  list: T[];
  meta: PaginatedMeta;
};

type UseBudgetsParams = {
  page?: number;
  perPage?: number;
  enabled?: boolean;
  filters?: {
    startDate?: string | null;
    endDate?: string | null;
  };
  search?: string;
};

export function useBudgets({
  page = 1,
  perPage = 10,
  enabled = true,
  filters,
  search,
}: UseBudgetsParams = {}) {
  const { token, isOwner, user } = useAuth();
  const scope = isOwner ? "owner" : "mine";
  const normalizedSearch = search?.trim() || undefined;
  const queryParams = {
    page,
    perPage,
    scope,
    userId: !isOwner ? user?.id : undefined,
    startDate: filters?.startDate ?? undefined,
    endDate: filters?.endDate ?? undefined,
    search: normalizedSearch,
  };

  return useQuery<
    PaginatedResponse<Budget>,
    Error,
    PaginatedListResult<Budget>
  >({
    queryKey: gearboxKeys.budgets.list(queryParams),
    queryFn: () => listBudgets(token!, queryParams),
    enabled: Boolean(token) && enabled,
    staleTime: QUERY_STALE_TIMES.budgets,
    keepPreviousData: true,
    select: (data) => ({
      list: data.data,
      meta: data.meta,
    }),
  });
}
