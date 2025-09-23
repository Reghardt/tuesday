declare namespace NodeJS {
  interface ProcessEnv {
    readonly PG_HOST?: string;
    readonly PG_USER?: string;
    readonly PG_PASSWORD?: string;
    readonly PG_DATABASE?: string;
    readonly PG_PORT?: string;
    readonly PG_SSL?: string; // "true" to enable SSL
  }
}
