import dotenv from 'dotenv';
import { getLogger } from '@/lib/logger';
import { ScheduleServiceImpl } from './services/schedule';
import { HealthCheckServiceImpl } from './services/health-check';
import { HttpServerFactory } from './factories/server-factory';

dotenv.config();
const logger = getLogger('mainWorker');

async function startServer() {
  try {
    const scheduleService = new ScheduleServiceImpl();
    await scheduleService.startWorker();

    const healthCheckService = new HealthCheckServiceImpl(
      scheduleService.getActiveJobs()
    );

    const serverFactory = new HttpServerFactory();
    const server = serverFactory.createServer({
      port: Number(process.env.PORT) || 8000,
      healthCheckService
    });

    await server.start();

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      try {
        await scheduleService.handleShutdown(signal);
        await server.stop();
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();
