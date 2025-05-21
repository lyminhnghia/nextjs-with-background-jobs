import { ServerConfig, ServerFactory } from '../interfaces/server';
import { HttpServerImpl } from '../services/http-server';

export class HttpServerFactory implements ServerFactory {
  createServer(config: ServerConfig) {
    return new HttpServerImpl(config);
  }
}
