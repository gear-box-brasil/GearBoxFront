export const QUERY_STALE_TIMES = {
  services: 60_000,
  budgets: 60_000,
  clients: 120_000,
  cars: 120_000,
  users: 120_000,
} as const;

export const DEFAULT_QUERY_OPTIONS = {
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};
