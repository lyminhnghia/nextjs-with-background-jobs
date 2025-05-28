import { getLogger } from '@/lib/logger';
import {
  HealthCheckComponent,
  HealthCheckResult,
  IHealthCheckService
} from '../interfaces/health';

export interface JobStatus {
  name: string;
  isActive: boolean;
  nextRun: Date | null;
}

export class HealthCheckServiceImpl implements IHealthCheckService {
  private components: Map<string, HealthCheckComponent> = new Map();
  private logger = getLogger('healthCheck');

  constructor() {}

  registerComponent(component: HealthCheckComponent): void {
    this.components.set(component.name, component);
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