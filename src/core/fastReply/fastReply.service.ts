import { Prisma } from "@prisma/client";
import { FastReplyRepository } from "./fastReply.repository";

export class FastReplyService {
  private fastReplyRepository: FastReplyRepository;

  constructor() {
    this.fastReplyRepository = new FastReplyRepository();
  }

  async findAll(where: Prisma.FastReplyWhereInput) {
    return await this.fastReplyRepository.findAll(where);
  }

  async findOne(where: Prisma.FastReplyWhereInput) {
    return await this.fastReplyRepository.findByWhere(where);
  }
  async updateFastReply(fastId: number, data: any) {
      
    return await this.fastReplyRepository.update(fastId, data);
  }
  async deteleFastReply(fastId: number): Promise<void> {
    await this.fastReplyRepository.delete(fastId);
  }
  async createFasReply(dto: any) {
    return await this.fastReplyRepository.create(dto);
  }
}
