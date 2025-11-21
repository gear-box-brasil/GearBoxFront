export type Role = 'dono' | 'mecanico';

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

export type ServiceStatus = 'Pendente' | 'Em andamento' | 'Concluído' | 'Cancelado';

export interface Service {
  id: string;
  clientId: string;
  carId: string;
  status: ServiceStatus;
  description?: string | null;
  totalValue: string;
  createdAt?: string;
  updatedAt?: string;
  user?: ApiUser | null;
  updatedBy?: ApiUser | null;
  budgetId?: string | null;
  budget?: Budget | null;
}

export type BudgetStatus = 'aberto' | 'aceito' | 'recusado' | 'cancelado';

export interface Budget {
  id: string;
  clientId: string;
  carId: string;
  userId: string | null;
  description: string;
  amount: string;
  status: BudgetStatus;
  createdAt?: string;
  updatedAt?: string;
  user?: ApiUser | null;
  updatedBy?: ApiUser | null;
}
