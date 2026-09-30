export type Env = {
  DB: D1Database;
  ASSETS?: Fetcher;
  AUTH_LIMIT: RateLimit;
  AI_LIMIT: RateLimit;
  PUBLIC_LANDING_URL?: string;
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_MODEL?: string;
  ALLOWED_ORIGIN?: string;
  SESSION_SECRET?: string;
  /** Optional shared invite PIN for controlled pilot signups. */
  TRIAL_PIN?: string;
  /** Pilot duration in days; defaults to 14. */
  TRIAL_DAYS?: string;
};

export type AppBindings = {
  Bindings: Env;
  Variables: {
    user?: import('@dental/core').PlatformUser;
  };
};
