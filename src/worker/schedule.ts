import schedule from 'node-schedule';
import { getLogger } from '@/lib/logger';
import { demoLogic } from './logic';

export interface Job {
  name: string;
  schedule: string;
  handler: () => Promise<void> | void;
  task?: schedule.Job;
}

export class ScheduleService {
  private activeJobs: Map<string, Job> = new Map();
  private jobs: Job[] = [];
  private logger = getLogger('schedule');

  constructor(jobs?: Job[]) {
    this.jobs = [
      ...(jobs || []),
      {
        name: 'cleanGameTransactions',
        schedule: process.env.CLEAN_TRANSACTIONS_SCHEDULE || '*/10 * * * * *', // Default to every 10 seconds
        handler: demoLogic
      }
    ];
  }

  async startWorker() {
    try {
      this.initializeJobs();
      this.logger.info('Worker started successfully');
    } catch (error) {
      this.logger.error('Error starting worker:', error);
      process.exit(1);
    }
  }

  private initializeJobs() {
    this.jobs.forEach((job) => {
      this.logger.info(
        `Initializing job: ${job.name} with schedule: ${job.schedule}`
      );
      const task = schedule.scheduleJob(job.schedule, async () => {
        try {
          this.logger.info(`Starting job: ${job.name}`);
          await job.handler();
          this.logger.info(`Completed job: ${job.name}`);
        } catch (error) {
          this.logger.error(`Error in job ${job.name}:`, error);
        }
      });
      job.task = task;
      this.activeJobs.set(job.name, job);
    });
  }

  getActiveJobs(): Map<string, Job> {
    return this.activeJobs;
  }

  async handleShutdown(signal: string) {
    this.logger.info(`Received ${signal}. Starting graceful shutdown...`);
    try {
      await schedule.gracefulShutdown();
      this.logger.info('Schedule graceful shutdown successfully');
    } catch (error: unknown) {
      this.logger.error('Error during shutdown:', error);
    }
    process.exit(0);
  }
}
