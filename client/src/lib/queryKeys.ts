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
    preview: (contractId: string) => ["contract", contractId, "preview"] as const,
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

  goddessPhotos: {
    queue: () => ["goddess", "photos", "queue"] as const,
  },

  kinks: {
    matrix: () => ["sub", "profile", "kinks"] as const,
  },

  limits: {
    own: () => ["sub", "profile", "limits"] as const,
    triggers: () => ["sub", "profile", "triggers"] as const,
  },

  safeword: {
    own: () => ["profile", "safeword"] as const,
  },

  today: {
    rituals: () => ["sub", "rituals", "today"] as const,
    tasks: () => ["sub", "tasks", "open"] as const,
    ritualsList: () => ["sub", "rituals", "list"] as const,
  },

  journal: {
    own: () => ["sub", "journal"] as const,
    forSub: (subId: string) => ["goddess", "subs", subId, "journal"] as const,
  },

  merits: {
    subRewards: () => ["sub", "rewards"] as const,
    subBalance: () => ["sub", "points-balance"] as const,
    goddessRewards: () => ["goddess", "rewards"] as const,
    goddessPunishments: () => ["goddess", "punishments"] as const,
  },

  toys: {
    own: () => ["sub", "profile", "toys"] as const,
    forSub: (subId: string) => ["goddess", "subs", subId, "toys"] as const,
  },

  penaltyRules: {
    all: () => ["goddess", "penalty-rules"] as const,
  },

  kinkOverview: {
    all: () => ["goddess", "kinks", "overview"] as const,
  },

  reviewQueue: {
    all: () => ["goddess", "review-queue"] as const,
  },

  tributeGauge: {
    forSub: (subId: string) =>
      ["goddess", "subs", subId, "tribute-minimum", "gauge"] as const,
  },

  aftercare: {
    own: () => ["aftercare", "own"] as const,
  },

  medical: {
    own: () => ["profile", "medical", "self"] as const,
  },
};
