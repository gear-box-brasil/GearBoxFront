import { apiRequest } from '@/lib/api';
import type {
  AuthResponse,
  PaginatedResponse,
  Client,
  Car,
  Service,
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
  payload: { nome: string; email: string; senha: string; tipo: Role }
) {
  return apiRequest<ApiUser>('/users', { method: 'POST', body: payload, token });
}

export function listClients(token: string, params?: PaginationParams) {
  return apiRequest<PaginatedResponse<Client>>(`/clients${buildQueryString(params)}`, {
    token,
  });
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

export function createCar(
  token: string,
  payload: { clientId: string; placa: string; marca: string; modelo: string; ano: number }
) {
  return apiRequest<Car>('/cars', { method: 'POST', body: payload, token });
}
