import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface BulkheadPool {
  maxConcurrent: number;
  queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
    timestamp: number;
  }>;
  running: number;
  name: string;
}

@Injectable()
export class BulkheadService {
  private pools = new Map<string, BulkheadPool>();
  private readonly logger = new Logger(BulkheadService.name);
  private readonly enabled: boolean;
  private readonly queueTimeout = 30000; // 30 seconds max wait in queue

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('BULKHEAD_ENABLED', true);
  }

  async execute<T>(
    poolName: string,
    operation: () => Promise<T>,
    maxConcurrent?: number,
  ): Promise<T> {
    if (!this.enabled) {
      return operation();
    }

    const pool = this.getOrCreatePool(poolName, maxConcurrent);

    // Check if we need to wait for a slot
    if (pool.running >= pool.maxConcurrent) {
      this.logger.debug(
        `Bulkhead ${poolName}: ${pool.running}/${pool.maxConcurrent} slots in use. Queueing request...`,
      );
      await this.waitForSlot(pool);
    }

    pool.running++;

    this.logger.debug(
      `Bulkhead ${poolName}: ${pool.running}/${pool.maxConcurrent} slots now in use`,
    );

    try {
      const result = await operation();
      return result;
    } finally {
      pool.running--;
      this.processQueue(pool);

      this.logger.debug(
        `Bulkhead ${poolName}: ${pool.running}/${pool.maxConcurrent} slots now in use (released)`,
      );
    }
  }

  private getOrCreatePool(
    poolName: string,
    maxConcurrent?: number,
  ): BulkheadPool {
    if (!this.pools.has(poolName)) {
      const max =
        maxConcurrent ||
        this.configService.get<number>('BULKHEAD_MAX_CONCURRENT', 10);

      this.pools.set(poolName, {
        name: poolName,
        maxConcurrent: max,
        queue: [],
        running: 0,
      });

      this.logger.log(
        `Created bulkhead pool: ${poolName} with max concurrent: ${max}`,
      );
    }
    return this.pools.get(poolName)!;
  }

  private waitForSlot(pool: BulkheadPool): Promise<void> {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();

      // Add timeout to prevent indefinite waiting
      const timeoutId = setTimeout(() => {
        const index = pool.queue.findIndex(
          (item) => item.timestamp === timestamp,
        );
        if (index !== -1) {
          pool.queue.splice(index, 1);
          reject(
            new Error(
              `Bulkhead ${pool.name}: Queue timeout after ${this.queueTimeout}ms`,
            ),
          );
        }
      }, this.queueTimeout);

      pool.queue.push({
        resolve: () => {
          clearTimeout(timeoutId);
          resolve();
        },
        reject: () => {
          clearTimeout(timeoutId);
          reject(
            new Error(`Bulkhead ${pool.name}: Request rejected from queue`),
          );
        },
        timestamp,
      });
    });
  }

  private processQueue(pool: BulkheadPool): void {
    if (pool.queue.length > 0 && pool.running < pool.maxConcurrent) {
      const next = pool.queue.shift();
      if (next) {
        next.resolve();
      }
    }
  }

  getPoolStats(poolName: string): {
    running: number;
    queued: number;
    maxConcurrent: number;
    state: CircuitState | null;
  } | null {
    const pool = this.pools.get(poolName);
    if (!pool) return null;

    return {
      running: pool.running,
      queued: pool.queue.length,
      maxConcurrent: pool.maxConcurrent,
      state: null,
    };
  }

  getAllPoolStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {};
    this.pools.forEach((pool, name) => {
      stats[name] = {
        running: pool.running,
        queued: pool.queue.length,
        maxConcurrent: pool.maxConcurrent,
      };
    });
    return stats;
  }
}
