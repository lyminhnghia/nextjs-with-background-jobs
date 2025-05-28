import schedule from 'node-schedule';
import { getLogger } from '@/lib/logger';
import { IScheduleService, Job } from '../interfaces/schedule';
import { HealthCheckResult, JobStatus } from '../interfaces/health';

export class ScheduleServiceImpl implements IScheduleService {
  private activeJobs: Map<string, Job> = new Map();
  private jobs: Job[] = [];
  private logger = getLogger('schedule');

  constructor(jobs?: Job[]) {
    this.jobs = jobs || [];
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

  async checkScheduler(): Promise<HealthCheckResult> {
    const jobStatuses: JobStatus[] = Array.from(this.activeJobs.entries()).map(
      ([name, job]) => {
        const task = job.task;
        return {
          name,
          isActive: !!task,
          nextRun: task?.nextInvocation ? new Date(task.nextInvocation()) : null
        };
      }
    );
    const hasInactiveJobs = jobStatuses.some((job) => !job.isActive);
    return {
      status: hasInactiveJobs ? 'unhealthy' : 'healthy',
      message: hasInactiveJobs
        ? 'Some scheduled jobs are not active'
        : 'All scheduled jobs are healthy',
      details: { jobs: jobStatuses }
    };
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