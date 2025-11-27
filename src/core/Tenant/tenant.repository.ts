import { Prisma, Tenant } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class TenantRepository {
  async findById(
    id: number,
    select?: Prisma.TenantSelect
  ): Promise<Tenant | null> {
    return await prisma.tenant.findFirst({
      where: {
        id: id,
      },
      select,
    });
  }
  update(id: number, data: any, select?: Prisma.TenantSelect): Promise<Tenant> {
    return prisma.tenant.update({
      where: {
        id: id,
      },
      data,

      select,
    });
  }
  //   findAll(): Promise<MinhaEntidade[]>;
  //   create(data: Partial<MinhaEntidade>): Promise<MinhaEntidade>;
  //   delete(id: string): Promise<void>;
}
