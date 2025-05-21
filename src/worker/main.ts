import schedule from 'node-schedule';
import dotenv from 'dotenv';
import { getLogger } from '@/lib/logger';
import { demoLogic } from './logic';

dotenv.config();
const logger = getLogger('mainWorker');

interface Job {
  name: string;
  schedule: string;
  handler: () => Promise<void> | void;
  task?: schedule.Job;
}

const jobs: Job[] = [
  {
    name: 'demoLogic',
    schedule: '*/10 * * * * *', // Default to every 10 seconds
    handler: demoLogic
  }
];

const activeJobs = new Map<string, Job>();

function initializeJobs() {
  jobs.forEach((job) => {
    logger.info(`Initializing job: ${job.name} with schedule: ${job.schedule}`);
    const task = schedule.scheduleJob(job.schedule, async () => {
      try {
        logger.info(`Starting job: ${job.name}`);
        await job.handler();
        logger.info(`Completed job: ${job.name}`);
      } catch (error) {
        logger.error(`Error in job ${job.name}:`, error);
      }
    });
    job.task = task;
    activeJobs.set(job.name, job);
  });
}

async function handleShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  try {
    await schedule.gracefulShutdown();
    logger.info('Schedule graceful shutdown successfully');
  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
  process.exit(0);
}

async function startWorker() {
  try {
    initializeJobs();
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
    logger.info('Worker started successfully');
  } catch (error) {
    logger.error('Error starting worker:', error);
    process.exit(1);
  }
}

startWorker();
