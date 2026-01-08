import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

interface Circuit {
  state: CircuitState;
  failures: number;
  successes: number;
  nextAttempt: number;
  config: CircuitConfig;
}

@Injectable()
export class CircuitBreakerService {
  private circuits = new Map<string, Circuit>();
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>(
      'CIRCUIT_BREAKER_ENABLED',
      true,
    );
  }

  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitConfig>,
  ): Promise<T> {
    if (!this.enabled) {
      return operation();
    }

    const circuit = this.getOrCreateCircuit(serviceName, config);

    // If circuit is OPEN, check if we should try HALF_OPEN
    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() < circuit.nextAttempt) {
        const error = new Error(
          `Circuit breaker OPEN for ${serviceName}. Next attempt at ${new Date(circuit.nextAttempt).toISOString()}`,
        );
        error.name = 'CircuitBreakerOpenError';
        throw error;
      }
      // Move to HALF_OPEN state
      circuit.state = CircuitState.HALF_OPEN;
      circuit.successes = 0;
      this.logger.log(`Circuit breaker HALF_OPEN for ${serviceName}`);
    }

    try {
      // Execute operation with timeout
      const result = await Promise.race<T>([
        operation(),
        this.timeout<T>(circuit.config.timeout),
      ]);

      this.onSuccess(serviceName);
      return result;
    } catch (error) {
      this.onFailure(serviceName, error);
      throw error;
    }
  }

  private getOrCreateCircuit(
    serviceName: string,
    config?: Partial<CircuitConfig>,
  ): Circuit {
    if (!this.circuits.has(serviceName)) {
      const defaultConfig: CircuitConfig = {
        failureThreshold:
          config?.failureThreshold ||
          this.configService.get<number>(
            'CIRCUIT_BREAKER_FAILURE_THRESHOLD',
            5,
          ),
        successThreshold:
          config?.successThreshold ||
          this.configService.get<number>(
            'CIRCUIT_BREAKER_SUCCESS_THRESHOLD',
            2,
          ),
        timeout:
          config?.timeout ||
          this.configService.get<number>('CIRCUIT_BREAKER_TIMEOUT', 30000),
        resetTimeout:
          config?.resetTimeout ||
          this.configService.get<number>(
            'CIRCUIT_BREAKER_RESET_TIMEOUT',
            60000,
          ),
      };

      this.circuits.set(serviceName, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        nextAttempt: 0,
        config: defaultConfig,
      });
    }
    return this.circuits.get(serviceName)!;
  }

  private onSuccess(serviceName: string): void {
    const circuit = this.circuits.get(serviceName)!;
    circuit.failures = 0;

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successes++;
      if (circuit.successes >= circuit.config.successThreshold) {
        circuit.state = CircuitState.CLOSED;
        this.logger.log(`Circuit breaker CLOSED for ${serviceName}`);
      }
    }
  }

  private onFailure(serviceName: string, error: any): void {
    const circuit = this.circuits.get(serviceName)!;
    circuit.failures++;
    circuit.successes = 0;

    this.logger.warn(
      `Circuit failure ${circuit.failures}/${circuit.config.failureThreshold} for ${serviceName}: ${error.message}`,
    );

    if (circuit.failures >= circuit.config.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      circuit.nextAttempt = Date.now() + circuit.config.resetTimeout;
      this.logger.error(
        `Circuit breaker OPEN for ${serviceName}. Will retry at ${new Date(circuit.nextAttempt).toISOString()}`,
      );
    }
  }

  private timeout<T>(ms: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(`Operation timeout after ${ms}ms`);
        error.name = 'TimeoutError';
        reject(error);
      }, ms);
    });
  }

  getCircuitState(serviceName: string): CircuitState | null {
    const circuit = this.circuits.get(serviceName);
    return circuit ? circuit.state : null;
  }

  reset(serviceName: string): void {
    const circuit = this.circuits.get(serviceName);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.failures = 0;
      circuit.successes = 0;
      this.logger.log(`Circuit breaker manually reset for ${serviceName}`);
    }
  }

  resetAll(): void {
    this.circuits.forEach((_, serviceName) => {
      this.reset(serviceName);
    });
  }
}
