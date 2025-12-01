import { Email, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class EmailRepository {
  async findAll(where?: Prisma.EmailWhereInput): Promise<Email[]> {
    return await prisma.email.findMany({ where });
  }
  create(data: Prisma.EmailCreateInput): Promise<Email> {
    return prisma.email.create({ data });
  }
  async findOne(where?: Prisma.EmailWhereInput): Promise<Email | null> {
    return await prisma.email.findFirst({ where });
  }
  async update(id: number, data: Prisma.EmailUpdateInput): Promise<Email> {
    return await prisma.email.update({
      where: {
        id: id,
      },
      data,
    });
  }
  //   delete(id: string): Promise<void>;
}
