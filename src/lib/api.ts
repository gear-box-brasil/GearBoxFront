import { API_BASE_URL } from '@/config/api';

interface ApiRequestOptions {
  method?: string;
  body?: BodyInit | Record<string, unknown> | null;
  headers?: Record<string, string>;
  token?: string | null;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  status?: number;
  payload?: unknown;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body = null, headers = {}, token, signal } = options;
  const finalHeaders = new Headers(headers);

  if (token) {
    finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  let finalBody: BodyInit | undefined;
  if (body !== null && body !== undefined) {
    if (body instanceof FormData) {
      finalBody = body;
    } else if (typeof body === 'string' || body instanceof Blob) {
      if (!finalHeaders.has('Content-Type')) {
        finalHeaders.set('Content-Type', 'application/json');
      }
      finalBody = body;
    } else {
      finalHeaders.set('Content-Type', 'application/json');
      finalBody = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: finalBody,
    signal,
  });

  let responseBody: any = null;
  if (response.status !== 204) {
    const text = await response.text();
    responseBody = text ? JSON.parse(text) : null;
  }

  if (!response.ok) {
    const error = new ApiError(
      responseBody?.error || responseBody?.message || 'Erro ao comunicar com a API'
    );
    error.status = response.status;
    error.payload = responseBody;
    throw error;
  }

  return responseBody as T;
}
