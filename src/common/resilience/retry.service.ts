import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('RETRY_ENABLED', true);
  }

  async executeWithRetry<T>(
    operationName: string,
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
  ): Promise<T> {
    if (!this.enabled) {
      return operation();
    }

    const finalConfig: RetryConfig = {
      maxRetries:
        config?.maxRetries ||
        this.configService.get<number>('RETRY_MAX_ATTEMPTS', 3),
      initialDelay:
        config?.initialDelay ||
        this.configService.get<number>('RETRY_INITIAL_DELAY', 1000),
      maxDelay:
        config?.maxDelay ||
        this.configService.get<number>('RETRY_MAX_DELAY', 30000),
      backoffMultiplier:
        config?.backoffMultiplier ||
        this.configService.get<number>('RETRY_BACKOFF_MULTIPLIER', 2),
    };

    let lastError: any;
    let delay = finalConfig.initialDelay;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 0) {
          this.logger.log(
            `${operationName} succeeded on attempt ${attempt + 1}/${finalConfig.maxRetries + 1}`,
          );
        }
        
        return result;
      } catch (error) {
        lastError = error;

        if (attempt < finalConfig.maxRetries) {
          this.logger.warn(
            `${operationName} failed on attempt ${attempt + 1}/${finalConfig.maxRetries + 1}. Retrying in ${delay}ms... Error: ${error.message}`,
          );

          await this.sleep(delay);
          delay = Math.min(
            delay * finalConfig.backoffMultiplier,
            finalConfig.maxDelay,
          );
        } else {
          this.logger.error(
            `${operationName} failed after ${finalConfig.maxRetries + 1} attempts. Error: ${error.message}`,
          );
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute with retry and exponential backoff, with custom retry condition
   */
  async executeWithRetryIf<T>(
    operationName: string,
    operation: () => Promise<T>,
    shouldRetry: (error: any) => boolean,
    config?: Partial<RetryConfig>,
  ): Promise<T> {
    if (!this.enabled) {
      return operation();
    }

    const finalConfig: RetryConfig = {
      maxRetries:
        config?.maxRetries ||
        this.configService.get<number>('RETRY_MAX_ATTEMPTS', 3),
      initialDelay:
        config?.initialDelay ||
        this.configService.get<number>('RETRY_INITIAL_DELAY', 1000),
      maxDelay:
        config?.maxDelay ||
        this.configService.get<number>('RETRY_MAX_DELAY', 30000),
      backoffMultiplier:
        config?.backoffMultiplier ||
        this.configService.get<number>('RETRY_BACKOFF_MULTIPLIER', 2),
    };

    let lastError: any;
    let delay = finalConfig.initialDelay;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (!shouldRetry(error)) {
          this.logger.warn(
            `${operationName} failed with non-retryable error: ${error.message}`,
          );
          throw error;
        }

        if (attempt < finalConfig.maxRetries) {
          this.logger.warn(
            `${operationName} attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
          );
          await this.sleep(delay);
          delay = Math.min(
            delay * finalConfig.backoffMultiplier,
            finalConfig.maxDelay,
          );
        }
      }
    }

    throw lastError;
  }
}
