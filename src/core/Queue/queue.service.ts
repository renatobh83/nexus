import { Prisma } from "@prisma/client";
import { QueueRepository } from "./queue.repository";
import { AppError } from "../../errors/errors.helper";

export class QueueSerice {
  private queueRepository: QueueRepository;
  constructor() {
    this.queueRepository = new QueueRepository();
  }

  async findAllQueue() {
    return await this.queueRepository.findAll();
  }
  async findQueueById(queueId: string) {
    const id = parseInt(queueId, 10);
    if (isNaN(id)) {
      return null;
    }
    return await this.queueRepository.findById({ id });
  }
  async updateQueue(queueId: number, data: Prisma.QueueUpdateInput) {
    const existsQueue = await this.queueRepository.findById({ id: queueId });
    if (!existsQueue) {
      return null;
    }
    const updateQueue = await this.queueRepository.update(queueId, data);
    return updateQueue;
  }
  async deleteQueue(queueId: number) {
    await this.queueRepository.delete(queueId);
  }
  async createQueue(queueData: any) {
    const { id, tenantId, userId, queue, ...restQueue } = queueData;
    const dataForPrisma = {
      ...restQueue,
      queue,
      tenant: {
        connect: {
          id: tenantId,
        },
      },
    };
    const queueExists = await this.queueRepository.findById({ queue: queue });

    if (queueExists) {
      throw new AppError("QUEUE_ALREADY_EXISTS", 501);
    }
    
    await this.queueRepository.create(dataForPrisma);
  }
}
