import dotenv from 'dotenv';
import { getLogger } from '@/lib/logger';
import { ScheduleServiceImpl } from './services/schedule';
import { HealthCheckServiceImpl } from './services/health-check';
import { HttpServerFactory } from './factories/server-factory';
import { demoLogic } from './services/demo-logic';

dotenv.config();
const logger = getLogger('mainWorker');

async function startServer() {
  try {
    const scheduleService = new ScheduleServiceImpl([
      {
        name: 'demoLogic',
        schedule: process.env.DEMO_LOGIC_SCHEDULE || '*/10 * * * * *', // every 10 seconds
        handler: demoLogic
      }
    ]);
    await scheduleService.startWorker();

    // Initialize health check service
    const healthCheckService = new HealthCheckServiceImpl();
    healthCheckService.registerComponent({
      name: 'scheduler',
      check: () => scheduleService.checkScheduler()
    });

    // Initialize server
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
        logger.info('Server stopped successfully');
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