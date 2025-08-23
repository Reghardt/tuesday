declare namespace NodeJS {
  interface ProcessEnv {
    readonly PG_USER?: string;
    readonly PG_PASSWORD?: string;
    readonly PG_DATABASE?: string;
  }
}