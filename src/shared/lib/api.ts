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

import { API_BASE_URL } from "@/config/api";

interface ApiRequestOptions {
  method?: string;
  body?: BodyInit | Record<string, unknown> | null;
  headers?: Record<string, string>;
  token?: string | null;
  signal?: AbortSignal;
}

export const UNAUTHORIZED_EVENT = "gearbox:unauthorized";

export class ApiError extends Error {
  status?: number;
  payload?: unknown;
  isNetworkError?: boolean;
}

const parseJsonSafe = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204) {
    return null;
  }

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return text || null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = "GET", body = null, headers = {}, token, signal } = options;
  const finalHeaders = new Headers(headers);

  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  let finalBody: BodyInit | undefined;
  if (body !== null && body !== undefined) {
    if (body instanceof FormData) {
      finalBody = body;
    } else if (typeof body === "string" || body instanceof Blob) {
      if (!finalHeaders.has("Content-Type")) {
        finalHeaders.set("Content-Type", "application/json");
      }
      finalBody = body;
    } else {
      finalHeaders.set("Content-Type", "application/json");
      finalBody = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: finalBody,
      signal,
    });
  } catch (error) {
    const apiError = new ApiError(
      "Erro de conexão. Verifique sua internet ou o servidor e tente novamente.",
    );
    apiError.status = 0;
    apiError.payload = error;
    apiError.isNetworkError = true;
    throw apiError;
  }

  const responseBody = await parseJsonSafe(response);

  const extractErrorMessage = (payload: unknown): string | null => {
    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      if (typeof record.error === "string") return record.error;
      if (typeof record.message === "string") return record.message;
    }
    return null;
  };

  if (!response.ok) {
    const error = new ApiError(
      extractErrorMessage(responseBody) || "Erro ao comunicar com a API",
    );
    error.status = response.status;
    error.payload = responseBody;
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(UNAUTHORIZED_EVENT, { detail: { status: 401 } }),
      );
    }
    throw error;
  }

  return responseBody as T;
}
