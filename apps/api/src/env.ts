export type Env = {
  DB: D1Database;
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_MODEL?: string;
  ALLOWED_ORIGIN?: string;
  SESSION_SECRET?: string;
};

export type AppBindings = {
  Bindings: Env;
  Variables: {
    user?: import('@dental/core').PlatformUser;
  };
};
