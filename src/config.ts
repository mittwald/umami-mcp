export type UmamiCredentials = {
  url: string;
  username: string;
  password: string;
};

export type AppConfig = {
  port: number;
};

export const HOST = '0.0.0.0';

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.MCP_PORT ?? 3334),
  };
}
