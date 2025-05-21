/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServer, Server as HttpServer } from 'http';
import { getLogger } from '@/lib/logger';
import { IServer, ServerConfig } from '../interfaces/server';

export class HttpServerImpl implements IServer {
  private server: HttpServer;
  private logger = getLogger('httpServer');

  constructor(private config: ServerConfig) {
    this.server = this.createServer();
  }

  private createServer(): HttpServer {
    return createServer(async (req, res) => {
      this.setCorsHeaders(res);

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === 'GET' && req.url?.startsWith('/health')) {
        await this.handleHealthCheck(req, res);
        return;
      }

      this.handleNotFound(res);
    });
  }

  private setCorsHeaders(res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  private async handleHealthCheck(req: any, res: any) {
    try {
      const components = req.url.split('?')[1]?.split('=')[1]?.split(',');
      const healthStatus =
        await this.config.healthCheckService.checkHealth(components);

      const isHealthy = Object.values(healthStatus).every(
        (result: { status: string }) => result.status === 'healthy'
      );

      res.statusCode = isHealthy ? 200 : 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          components: healthStatus
        })
      );
    } catch (error) {
      this.logger.error('Health check failed:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: 'error',
          message: 'Internal server error during health check'
        })
      );
    }
  }

  private handleNotFound(res: any) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        this.logger.info(`Server is running on port ${this.config.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          this.logger.error('Error closing server:', err);
          reject(err);
          return;
        }
        this.logger.info('HTTP server closed');
        resolve();
      });
    });
  }
}
