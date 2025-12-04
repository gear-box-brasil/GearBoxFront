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

export type Role = "dono" | "mecanico" | "demo";

export interface ApiUser {
  id: string;
  nome: string;
  email: string;
  tipo: Role;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface AuthToken {
  type: string;
  value: string;
  abilities?: string[];
  expiresAt?: string | null;
}

export interface AuthResponse {
  user: ApiUser;
  token: AuthToken;
}

export interface PaginatedMeta {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
}

export interface PaginatedResponse<T> {
  meta: PaginatedMeta;
  data: T[];
}

export interface Client {
  id: string;
  nome: string;
  telefone: string;
  email?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdByUser?: ApiUser | null;
  updatedByUser?: ApiUser | null;
}

export interface Car {
  id: string;
  clientId: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ServiceStatus =
  | "Pendente"
  | "Em andamento"
  | "Concluído"
  | "Cancelado";

export interface Service {
  id: string;
  clientId: string;
  carId: string;
  userId?: string | null;
  status: ServiceStatus;
  description?: string | null;
  totalValue: string;
  prazoEstimadoDias?: number | null;
  dataPrevista?: string | null;
  assignedToId?: string | null;
  createdById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  user?: ApiUser | null;
  updatedBy?: ApiUser | null;
  assignedTo?: ApiUser | null;
  createdBy?: ApiUser | null;
  budgetId?: string | null;
  budget?: Budget | null;
  expectedCompletion?: string | null;
  expectedDate?: string | null;
  dueDate?: string | null;
  forecastDate?: string | null;
  estimatedDelivery?: string | null;
  deliveryDate?: string | null;
  deadline?: string | null;
  priority?: string | null;
}

export type BudgetStatus = "aberto" | "aceito" | "recusado" | "cancelado";

export interface Budget {
  id: string;
  clientId: string;
  carId: string;
  userId: string | null;
  createdById?: string | null;
  description: string;
  amount: string;
  status: BudgetStatus;
  prazoEstimadoDias?: number | null;
  createdAt?: string;
  updatedAt?: string;
  user?: ApiUser | null;
  updatedBy?: ApiUser | null;
  createdBy?: ApiUser | null;
}
