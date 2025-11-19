import { Prisma } from "@prisma/client";
import { FastReplyRepository } from "./fastReply.repository";

export class FastReplyService {
  private fastReplyRepository: FastReplyRepository;

  constructor() {
    this.fastReplyRepository = new FastReplyRepository();
  }

  async findAll() {
    return await this.fastReplyRepository.findAll();
  }

  async findOne(where: Prisma.FastReplyWhereInput) {
    return await this.fastReplyRepository.findByWhere(where);
  }
  async updateFastReply(fastId: number, data: Prisma.FastReplyUpdateInput) {
    return await this.fastReplyRepository.update(fastId, data);
  }
  async deteleFastReply(fastId: number): Promise<void> {
    await this.fastReplyRepository.delete(fastId);
  }
  async createFasReply(dto: any) {
    return await this.fastReplyRepository.create(dto);
  }
}
