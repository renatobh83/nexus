import { Prisma } from "@prisma/client";
import { QueueRepository } from "./queue.repository";

export class QueueSerice {
    private queueRepository: QueueRepository
    constructor() {
        this.queueRepository = new QueueRepository()
    }

    async findAllQueue() {
        return await this.queueRepository.findAll()
    }
    async findQueueById(queueId: string) {
        const id = parseInt(queueId, 10)
        if (isNaN(id)) {
            return null;
        }
        return await this.queueRepository.findById(id)
    }
    async updateQueue(queueId: number, data: Prisma.QueueUpdateInput) {
        const existsQueue = await this.queueRepository.findById(queueId)
        if (!existsQueue) {
            return null
        }
        const updateQueue = await this.queueRepository.update(queueId, data)
    }
    async deleteQueue(queueId: number){
        await this.queueRepository.delete(queueId)
    }
}