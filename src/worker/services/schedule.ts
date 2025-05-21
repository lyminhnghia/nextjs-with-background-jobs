import schedule from 'node-schedule';
import { getLogger } from '@/lib/logger';
import { demoLogic } from './demo-logic';
import { IScheduleService, Job } from '../interfaces/schedule';

export class ScheduleServiceImpl implements IScheduleService {
  private activeJobs: Map<string, Job> = new Map();
  private jobs: Job[] = [];
  private logger = getLogger('schedule');

  constructor(jobs?: Job[]) {
    this.jobs = [
      ...(jobs || []),
      {
        name: 'demoJob',
        schedule: '*/10 * * * * *', // every 10 seconds
        handler: demoLogic
      }
    ];
  }

  async startWorker(): Promise<void> {
    try {
      this.initializeJobs();
      this.logger.info('Worker started successfully');
    } catch (error) {
      this.logger.error('Error starting worker:', error);
      throw error;
    }
  }

  private initializeJobs(): void {
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

  async handleShutdown(signal: string): Promise<void> {
    this.logger.info(`Received ${signal}. Starting graceful shutdown...`);
    try {
      await schedule.gracefulShutdown();
      this.logger.info('Schedule graceful shutdown successfully');
    } catch (error: unknown) {
      this.logger.error('Error during shutdown:', error);
      throw error;
    }
  }
}
