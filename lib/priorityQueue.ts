/**
 * Scalable In-Memory Priority Queue & Rate Throttler for Quiz Submissions
 * Handles concurrent quiz submission requests with priority weighting and retry handling.
 */

type Task<T = any> = {
  id: string;
  priority: number; // 1 = High (Live Exam Submission), 2 = Normal (Practice Quiz), 3 = Background
  fn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  createdAt: number;
};

class PriorityJobQueue {
  private queue: Task[] = [];
  private activeCount: number = 0;
  private readonly concurrencyLimit: number = 10; // Max simultaneous DB writes
  private totalProcessed: number = 0;

  public enqueue<T>(fn: () => Promise<T>, priority: number = 2): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: Task<T> = {
        id: Math.random().toString(36).substring(2, 9),
        priority,
        fn,
        resolve,
        reject,
        createdAt: Date.now()
      };

      // Insert task based on priority (lower number = higher priority)
      let inserted = false;
      for (let i = 0; i < this.queue.length; i++) {
        if (task.priority < this.queue[i].priority) {
          this.queue.splice(i, 0, task);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        this.queue.push(task);
      }

      this.processNext();
    });
  }

  private async processNext() {
    if (this.activeCount >= this.concurrencyLimit || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeCount++;

    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.activeCount--;
      this.totalProcessed++;
      // Process next task in queue
      setImmediate(() => this.processNext());
    }
  }

  public getStats() {
    return {
      queuedJobs: this.queue.length,
      activeJobs: this.activeCount,
      totalProcessed: this.totalProcessed
    };
  }
}

// Global singleton instance
export const submissionQueue = new PriorityJobQueue();
