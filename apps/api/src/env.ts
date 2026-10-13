export type Env = {
  DB: D1Database;
  ASSETS?: Fetcher;
  AUTH_LIMIT: RateLimit;
  AI_LIMIT: RateLimit;
  PUBLIC_LANDING_URL?: string;
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_MODEL?: string;
  ALLOWED_ORIGIN?: string;
  /** Trial duration in days (1–365); defaults to 30. */
  TRIAL_DAYS?: string;
};

export type AppBindings = {
  Bindings: Env;
  Variables: {
    user?: import('@dental/core').PlatformUser;
  };
};
