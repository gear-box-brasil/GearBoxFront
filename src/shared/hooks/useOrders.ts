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
import { useServices } from "@/hooks/useServices";
import { useClients } from "@/hooks/useClients";
import { useCars } from "@/hooks/useCars";

type UseOrdersParams = {
  page?: number;
  perPage?: number;
  search?: string;
};

export function useOrders({
  page = 1,
  perPage = 10,
  search,
}: UseOrdersParams = {}) {
  const servicesQuery = useServices({ page, perPage, search });
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
