import { getLogger } from '@/lib/logger';
import { Job } from '../interfaces/schedule';
import {
  HealthCheckComponent,
  HealthCheckResult,
  IHealthCheckService
} from '../interfaces/health';

interface JobStatus {
  name: string;
  isActive: boolean;
  nextRun: Date | null;
}

export class HealthCheckServiceImpl implements IHealthCheckService {
  private components: Map<string, HealthCheckComponent> = new Map();
  private logger = getLogger('healthCheck');

  constructor(private activeJobs: Map<string, Job>) {
    this.registerDefaultComponents();
  }

  private registerDefaultComponents() {
    this.registerComponent({
      name: 'scheduler',
      check: () => this.checkScheduler(this.activeJobs)
    });
  }

  registerComponent(component: HealthCheckComponent): void {
    this.components.set(component.name, component);
  }

  private async checkScheduler(
    activeJobs: Map<string, Job>
  ): Promise<HealthCheckResult> {
    const jobStatuses: JobStatus[] = Array.from(activeJobs.entries()).map(
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

  async checkHealth(
    components?: string[]
  ): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {};
    const componentsToCheck = components
      ? components.filter((name) => this.components.has(name))
      : Array.from(this.components.keys());

    for (const name of componentsToCheck) {
      const component = this.components.get(name);
      if (component) {
        try {
          results[name] = await component.check();
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Health check failed for ${name}:`, error);
          results[name] = {
            status: 'unhealthy',
            message: `Health check failed: ${errorMessage}`,
            details: { error: errorMessage }
          };
        }
      }
    }

    return results;
  }
}
