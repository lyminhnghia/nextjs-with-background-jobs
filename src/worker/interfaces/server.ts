import { IHealthCheckService } from './health';

export interface IServer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface ServerConfig {
  port: number;
  healthCheckService: IHealthCheckService;
}

export interface ServerFactory {
  createServer(config: ServerConfig): IServer;
}
