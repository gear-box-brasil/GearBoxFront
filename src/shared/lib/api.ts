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
  options: ApiRequestOptions = {}
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: finalBody,
    signal,
  });

  const responseBody = await parseJsonSafe(response);

  if (!response.ok) {
    const error = new ApiError(
      (responseBody as any)?.error ||
        (responseBody as any)?.message ||
        "Erro ao comunicar com a API"
    );
    error.status = response.status;
    error.payload = responseBody;
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(UNAUTHORIZED_EVENT, { detail: { status: 401 } })
      );
    }
    throw error;
  }

  return responseBody as T;
}
