import { logger } from '../utils/logger.js';

/**
 * Async Mutex Queue ensuring that orders are executed sequentially on MT5.
 * Prevents MT5 error 10027: "Trade Context Busy"
 */
class ExecutionMutex {
  private queue: Array<() => Promise<void>> = [];
  private isLocked = false;

  public async acquire<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = async () => {
        this.isLocked = true;
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.isLocked = false;
          this.next();
        }
      };

      if (!this.isLocked) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  private next() {
    if (this.queue.length > 0 && !this.isLocked) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        nextTask();
      }
    }
  }

  public get pendingCount(): number {
    return this.queue.length;
  }
}

export const executionMutex = new ExecutionMutex();

