//   findById(id: string): Promise<MinhaEntidade | null>;
//   findAll(): Promise<MinhaEntidade[]>;
//   create(data: Partial<MinhaEntidade>): Promise<MinhaEntidade>;
//   update(id: string, data: Partial<MinhaEntidade>): Promise<MinhaEntidade>;
//   delete(id: string): Promise<void>;
import { prisma } from "../../lib/prisma";
import { FastReply, Prisma } from "@prisma/client";

export class FastReplyRepository {
  findOneFast(where: Prisma.FastReplyWhereInput): Promise<FastReply | null> {
    return prisma.fastReply.findFirst({ where });
  }
  findAll(): Promise<FastReply[]> {
    return prisma.fastReply.findMany();
  }
  create(data: Prisma.FastReplyCreateWithoutUserInput): Promise<FastReply> {
    return prisma.fastReply.create({ data });
  }
  update(id: number, data: Prisma.FastReplyUpdateInput): Promise<FastReply> {
    return prisma.fastReply.update({ where: { id: id }, data });
  }
  //   delete(id: string): Promise<void>;
}
