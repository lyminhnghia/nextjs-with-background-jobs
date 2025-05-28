import { Job as ScheduleJob } from 'node-schedule';
import { HealthCheckResult } from './health';

export interface Job {
  name: string;
  schedule: string;
  handler: () => Promise<void> | void;
  task?: ScheduleJob;
}

export interface IScheduleService {
  startWorker(): Promise<void>;
  handleShutdown(signal: string): Promise<void>;
  checkScheduler(): Promise<HealthCheckResult>;
}