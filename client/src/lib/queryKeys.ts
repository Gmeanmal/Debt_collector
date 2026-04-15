export const queryKeys = {
  auth: {
    all: () => ["auth"] as const,
    me: () => ["auth", "me"] as const,
  },

  health: {
    all: () => ["health"] as const,
  },

  sub: {
    all: () => ["sub"] as const,
    dashboard: () => ["subDashboard"] as const,
    planning: () => ["subPlanning"] as const,
    contracts: () => ["subContracts"] as const,
    paymentMethods: () => ["subPaymentMethods"] as const,
    payments: () => ["myPayments"] as const,
  },

  goddess: {
    all: () => ["goddess"] as const,
    dashboard: () => ["goddessDashboard"] as const,
    dashboardCharts: () => ["goddessDashboardCharts"] as const,
    subs: () => ["goddessSubs"] as const,
    contracts: () => ["goddessContracts"] as const,
    pendingPayments: () => ["pendingPayments"] as const,
    pendingValidations: () => ["goddessPendingPayments"] as const,
    lateSubs: () => ["goddessLateSubs"] as const,
    weeklyPayments: () => ["goddessWeeklyPayments"] as const,
    allRolling: (subIds: string[]) => ["goddessAllRolling", subIds] as const,
  },

  contracts: {
    all: () => ["contract"] as const,
    detail: (contractId: string) => ["contract", contractId] as const,
    audit: (contractId: string) => ["contractAudit", contractId] as const,
    pendingAdjustments: () => ["pendingAdjustments"] as const,
    debtDetail: (contractId: string) => ["debt-contract", contractId] as const,
  },

  rolling: {
    all: () => ["rolling"] as const,
    bySubId: (subId: string) => ["rolling", subId] as const,
  },

  payments: {
    all: () => ["payments"] as const,
    methods: (scope: "goddess") => ["paymentMethods", scope] as const,
  },

  invitations: {
    all: () => ["invitations"] as const,
    goddess: () => ["invitations", "goddess"] as const,
    public: (token: string) => ["invitation", "public", token] as const,
  },

  notifications: {
    all: () => ["notifications"] as const,
  },

  blacklist: {
    all: () => ["blacklist"] as const,
  },

  profile: {
    all: () => ["profile"] as const,
    changeRequests: {
      all: () => ["profile", "changeRequests"] as const,
      own: () => ["profile", "changeRequests", "own"] as const,
      pendingByGoddess: () => ["profile", "changeRequests", "pendingByGoddess"] as const,
    },
  },

  admin: {
    all: () => ["admin"] as const,
    entity: (entity: string) => ["admin", entity] as const,
    list: (entity: string, q: string, page: number) => ["admin", entity, q, page] as const,
  },
};
