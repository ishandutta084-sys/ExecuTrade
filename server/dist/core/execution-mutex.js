/**
 * Async Mutex Queue ensuring that orders are executed sequentially on MT5.
 * Prevents MT5 error 10027: "Trade Context Busy"
 */
class ExecutionMutex {
    queue = [];
    isLocked = false;
    async acquire(task) {
        return new Promise((resolve, reject) => {
            const execute = async () => {
                this.isLocked = true;
                try {
                    const result = await task();
                    resolve(result);
                }
                catch (err) {
                    reject(err);
                }
                finally {
                    this.isLocked = false;
                    this.next();
                }
            };
            if (!this.isLocked) {
                execute();
            }
            else {
                this.queue.push(execute);
            }
        });
    }
    next() {
        if (this.queue.length > 0 && !this.isLocked) {
            const nextTask = this.queue.shift();
            if (nextTask) {
                nextTask();
            }
        }
    }
    get pendingCount() {
        return this.queue.length;
    }
}
export const executionMutex = new ExecutionMutex();
//# sourceMappingURL=execution-mutex.js.map