import { JobSchedulerTemplateOptions, JobsOptions, Queue } from "bullmq";
import { redisClient } from "./redis";

interface JobQueue {
  bull: Queue;
  name: string;
  handle: (data: any) => Promise<void>;
  options: JobsOptions & { opts?: JobSchedulerTemplateOptions }; // Adicionando suporte para opts
}
import * as jobs from "../jobs/index";

/**
 * Filas bullMq
 */

export const queues: JobQueue[] = Object.values(jobs).map((job: any) => {
  const bullQueue = new Queue(job.key, {
    connection: redisClient,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        delay: 2000,
        type: "exponential",
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 50,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    },
  });

  return {
    bull: bullQueue,
    name: job.key,
    handle: job.handle,
    options: job.options,
  };
});
