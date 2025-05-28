export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckComponent {
  name: string;
  check: () => Promise<HealthCheckResult>;
}

export interface IHealthCheckService {
  registerComponent(component: HealthCheckComponent): void;
  checkHealth(
    components?: string[]
  ): Promise<Record<string, HealthCheckResult>>;
}

export interface JobStatus {
  name: string;
  isActive: boolean;
  nextRun: Date | null;
}