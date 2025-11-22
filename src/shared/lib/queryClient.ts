import { QueryClient } from "@tanstack/react-query";
import { ApiError, UNAUTHORIZED_EVENT } from "@/lib/api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 0,
      onError: (error) => {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          typeof window !== "undefined"
        ) {
          window.dispatchEvent(
            new CustomEvent(UNAUTHORIZED_EVENT, { detail: { status: 401 } })
          );
        }
      },
    },
    mutations: {
      retry: 0,
    },
  },
});
