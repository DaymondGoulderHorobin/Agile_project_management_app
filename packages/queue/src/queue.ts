import { Queue, type ConnectionOptions, type JobsOptions } from "bullmq";
import { QueueEnvelopeSchema, type JobName, type QueueEnvelope } from "./jobs.js";

export type PublishOptions = Readonly<{
  jobId: string;
  attempts?: number;
  backoffMilliseconds?: number;
  delayMilliseconds?: number;
}>;

export interface JobPublisher {
  publish(envelope: QueueEnvelope, options: PublishOptions): Promise<void>;
  close(): Promise<void>;
}

export class BullJobPublisher implements JobPublisher {
  readonly #queues = new Map<JobName, Queue>();

  public constructor(private readonly connection: ConnectionOptions, private readonly prefix = "tracework") {}

  public async publish(envelope: QueueEnvelope, options: PublishOptions): Promise<void> {
    const parsed = QueueEnvelopeSchema.parse(envelope);
    let queue = this.#queues.get(parsed.name);
    if (!queue) {
      queue = new Queue(parsed.name, { connection: this.connection, prefix: this.prefix });
      this.#queues.set(parsed.name, queue);
    }
    const jobOptions: JobsOptions = {
      jobId: options.jobId,
      attempts: options.attempts ?? 5,
      backoff: { type: "exponential", delay: options.backoffMilliseconds ?? 1_000 },
      removeOnComplete: { age: 86_400, count: 10_000 },
      removeOnFail: false,
    };
    if (options.delayMilliseconds !== undefined) jobOptions.delay = options.delayMilliseconds;
    await queue.add(parsed.name, parsed, jobOptions);
  }

  public async close(): Promise<void> {
    await Promise.all([...this.#queues.values()].map(async (queue) => queue.close()));
    this.#queues.clear();
  }
}

export type PublishedJob = Readonly<{ envelope: QueueEnvelope; options: PublishOptions }>;

export class MemoryJobPublisher implements JobPublisher {
  readonly #published = new Map<string, PublishedJob>();

  public get published(): readonly PublishedJob[] {
    return [...this.#published.values()];
  }

  public async publish(envelope: QueueEnvelope, options: PublishOptions): Promise<void> {
    QueueEnvelopeSchema.parse(envelope);
    if (!this.#published.has(options.jobId)) this.#published.set(options.jobId, { envelope, options });
  }

  public async close(): Promise<void> {}
}
