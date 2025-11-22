type QueryKeyParams = Record<string, string | number | boolean | undefined | null>;

const withParams = (base: string, params?: QueryKeyParams) =>
  params ? [base, { ...params }] : [base];

export const gearboxKeys = {
  services: {
    all: ["services"] as const,
    list: (params?: QueryKeyParams) => ["services", ...withParams("list", params)],
  },
  budgets: {
    all: ["budgets"] as const,
    list: (params?: QueryKeyParams) => ["budgets", ...withParams("list", params)],
  },
  clients: {
    all: ["clients"] as const,
    list: (params?: QueryKeyParams) => ["clients", ...withParams("list", params)],
  },
  cars: {
    all: ["cars"] as const,
    list: (params?: QueryKeyParams) => ["cars", ...withParams("list", params)],
  },
  users: {
    all: ["users"] as const,
    list: (params?: QueryKeyParams) => ["users", ...withParams("list", params)],
  },
};
