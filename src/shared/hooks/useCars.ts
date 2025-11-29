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
  search?: string;
};

export function useCars({
  page = 1,
  perPage = 50,
  enabled = true,
  search,
}: UseCarsParams = {}) {
  const { token } = useAuth();
  const normalizedSearch = search?.trim() || undefined;

  const query = useQuery({
    queryKey: gearboxKeys.cars.list({ page, perPage, search: normalizedSearch }),
    queryFn: () => listCars(token!, { page, perPage, search: normalizedSearch }),
    enabled: Boolean(token) && enabled,
    staleTime: QUERY_STALE_TIMES.cars,
    keepPreviousData: true,
    select: (data) => ({
      list: data.data as Car[],
      meta: data.meta as PaginatedMeta,
    }),
  });

  const carMap = useMemo(() => {
    const entries =
      query.data?.list?.map((car): [string, Car] => [car.id, car]) ?? [];
    return new Map<string, Car>(entries);
  }, [query.data?.list]);

  return { ...query, carMap };
}
