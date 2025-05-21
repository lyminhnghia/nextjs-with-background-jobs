import { createServer } from 'http';
import dotenv from 'dotenv';
import { getLogger } from '@/lib/logger';
import { ScheduleService } from './schedule';
import { HealthCheckService } from './health';

dotenv.config();
const logger = getLogger('mainWorker');

async function startServer() {
  try {
    const PORT = process.env.PORT || 8000;
    const scheduleService = new ScheduleService();
    await scheduleService.startWorker();
    const healthCheckService = new HealthCheckService(
      scheduleService.getActiveJobs()
    );

    const server = createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === 'GET' && req.url?.startsWith('/health')) {
        try {
          const components = req.url.split('?')[1]?.split('=')[1]?.split(',');
          const healthStatus = await healthCheckService.checkHealth(components);

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
          logger.error('Health check failed:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              status: 'error',
              message: 'Internal server error during health check'
            })
          );
        }
        return;
      }

      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      await scheduleService.handleShutdown(signal);
      server.close(() => {
        logger.info('HTTP server closed');
      });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();
