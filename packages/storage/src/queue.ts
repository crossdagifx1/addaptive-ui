import type { Blueprint } from "@aui/schema";
import type { SQLiteStorage, QueueJobRecord } from "./database.js";

export type JobHandler = (job: QueueJobRecord) => Promise<Blueprint>;

export interface QueueOptions {
  concurrency?: number;
  pollIntervalMs?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
}

export class AsyncGenerationQueue {
  private isRunning = false;
  private activeWorkers = 0;
  private timer: NodeJS.Timeout | null = null;
  private handler: JobHandler | null = null;
  private concurrency: number;
  private pollIntervalMs: number;
  private maxAttempts: number;
  private baseBackoffMs: number;

  constructor(
    private storage: SQLiteStorage,
    options: QueueOptions = {}
  ) {
    this.concurrency = options.concurrency ?? 2;
    this.pollIntervalMs = options.pollIntervalMs ?? 100;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.baseBackoffMs = options.baseBackoffMs ?? 500;
  }

  /**
   * Sets the execution handler responsible for calling model generation.
   */
  registerHandler(handler: JobHandler): void {
    this.handler = handler;
  }

  /**
   * Adds a generation job to the queue.
   */
  enqueue(params: {
    siteId: string;
    segmentKey: string;
    prompt: string;
    priority?: "high" | "normal" | "low";
  }): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const job: QueueJobRecord = {
      jobId,
      siteId: params.siteId,
      segmentKey: params.segmentKey,
      priority: params.priority || "normal",
      status: "pending",
      prompt: params.prompt,
      attempts: 0,
      maxAttempts: this.maxAttempts,
      nextRunAt: Date.now(),
      createdAt: now,
      updatedAt: now,
    };

    this.storage.enqueueJob(job);
    return jobId;
  }

  /**
   * Starts processing queued generation tasks.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextTick();
  }

  /**
   * Stops processing queued generation tasks.
   */
  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Gets job status by ID.
   */
  getJob(jobId: string): QueueJobRecord | null {
    return this.storage.getJob(jobId);
  }

  private scheduleNextTick(): void {
    if (!this.isRunning) return;
    this.timer = setTimeout(() => this.processNextJobs(), this.pollIntervalMs);
  }

  private async processNextJobs(): Promise<void> {
    if (!this.isRunning || !this.handler) {
      this.scheduleNextTick();
      return;
    }

    while (this.activeWorkers < this.concurrency) {
      const job = this.storage.claimNextJob();
      if (!job) break;

      this.activeWorkers++;
      this.executeJob(job).finally(() => {
        this.activeWorkers--;
      });
    }

    this.scheduleNextTick();
  }

  private async executeJob(job: QueueJobRecord): Promise<void> {
    try {
      if (!this.handler) throw new Error("No job handler registered");
      const resultBlueprint = await this.handler(job);

      this.storage.updateJob(job.jobId, {
        status: "completed",
        resultBlueprint,
      });
    } catch (err: any) {
      const isExhausted = job.attempts >= job.maxAttempts;
      if (isExhausted) {
        this.storage.updateJob(job.jobId, {
          status: "failed",
          errorMessage: err?.message || String(err),
        });
      } else {
        // Exponential backoff with jitter
        const backoff = this.baseBackoffMs * Math.pow(2, job.attempts - 1) + Math.random() * 100;
        this.storage.updateJob(job.jobId, {
          status: "pending",
          errorMessage: err?.message || String(err),
          nextRunAt: Date.now() + backoff,
        });
      }
    }
  }
}
