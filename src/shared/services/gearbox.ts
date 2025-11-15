import { apiRequest } from '@/lib/api';
import type {
  AuthResponse,
  PaginatedResponse,
  Client,
  Car,
  Service,
  Budget,
  BudgetStatus,
  Role,
  ApiUser,
} from '@/types/api';

interface PaginationParams {
  page?: number;
  perPage?: number;
}

const buildQueryString = (params?: PaginationParams) => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.perPage) searchParams.set('perPage', String(params.perPage));
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export function login(payload: { email: string; password: string }) {
  return apiRequest<AuthResponse>('/login', { method: 'POST', body: payload });
}

export function logout(token: string) {
  return apiRequest<void>('/logout', { method: 'DELETE', token });
}

export function createUser(
  token: string,
  payload: { nome: string; email: string; senha: string; tipo: Role; ativo?: boolean }
) {
  return apiRequest<ApiUser>('/users', { method: 'POST', body: payload, token });
}

export function listUsers(token: string, params?: PaginationParams) {
  return apiRequest<PaginatedResponse<ApiUser>>(`/users${buildQueryString(params)}`, {
    token,
  });
}

export function updateUser(
  token: string,
  id: string,
  payload: Partial<{ nome: string; email: string; senha: string; tipo: Role; ativo: boolean }>
) {
  return apiRequest<ApiUser>(`/users/${id}`, { method: 'PUT', body: payload, token });
}

export function deleteUser(
  token: string,
  id: string,
  payload?: { transferToUserId?: string | null }
) {
  return apiRequest<void>(`/users/${id}`, { method: 'DELETE', token, body: payload });
}

export function listClients(token: string, params?: PaginationParams) {
  return apiRequest<PaginatedResponse<Client>>(`/clients${buildQueryString(params)}`, {
    token,
  });
}

export function createClient(
  token: string,
  payload: { nome: string; telefone: string; email?: string | null }
) {
  return apiRequest<Client>('/clients', { method: 'POST', body: payload, token });
}

export function updateClient(
  token: string,
  id: string,
  payload: Partial<{ nome: string; telefone: string; email?: string | null }>
) {
  return apiRequest<Client>(`/clients/${id}`, { method: 'PUT', body: payload, token });
}

export function deleteClient(token: string, id: string) {
  return apiRequest<void>(`/clients/${id}`, { method: 'DELETE', token });
}

export function listCars(token: string, params?: PaginationParams) {
  return apiRequest<PaginatedResponse<Car>>(`/cars${buildQueryString(params)}`, {
    token,
  });
}

export function listServices(token: string, params?: PaginationParams) {
  return apiRequest<PaginatedResponse<Service>>(`/services${buildQueryString(params)}`, {
    token,
  });
}

export function updateService(
  token: string,
  id: string,
  payload: Partial<{ status: ServiceStatus }>
) {
  return apiRequest<Service>(`/services/${id}`, { method: 'PUT', body: payload, token });
}

export function listBudgets(token: string, params?: PaginationParams) {
  return apiRequest<PaginatedResponse<Budget>>(`/budgets${buildQueryString(params)}`, {
    token,
  });
}

export function createBudget(
  token: string,
  payload: { clientId: string; carId: string; description: string; amount: number; status?: BudgetStatus }
) {
  return apiRequest<Budget>('/budgets', { method: 'POST', body: payload, token });
}

export function updateBudget(
  token: string,
  id: string,
  payload: Partial<{ clientId: string; carId: string; description: string; amount: number; status: BudgetStatus }>
) {
  return apiRequest<Budget>(`/budgets/${id}`, { method: 'PUT', body: payload, token });
}

export function acceptBudget(token: string, id: string) {
  return apiRequest<{ budget: Budget; service: Service }>(`/budgets/${id}/accept`, {
    method: 'POST',
    token,
  });
}

export function rejectBudget(token: string, id: string) {
  return apiRequest<Budget>(`/budgets/${id}/reject`, {
    method: 'POST',
    token,
  });
}

export function createCar(
  token: string,
  payload: { clientId: string; placa: string; marca: string; modelo: string; ano: number }
) {
  return apiRequest<Car>('/cars', { method: 'POST', body: payload, token });
}
