import { ApiConfig, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class ApiExternaRepository {
  async findWhere(
    where: Prisma.ApiConfigWhereInput
  ): Promise<ApiConfig | null> {
    return await prisma.apiConfig.findFirst({ where });
  }
  create(data: Prisma.ApiConfigCreateInput): Promise<ApiConfig> {
    return prisma.apiConfig.create({ data: data });
  }

  findAll(): Promise<ApiConfig[]> {
    return prisma.apiConfig.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }
  update(id: string, data: Prisma.ApiConfigUpdateInput): Promise<ApiConfig> {
    return prisma.apiConfig.update({
      where: {
        id: id,
      },
      data,
    });
  }
  async delete(id: string): Promise<void> {
    await prisma.apiConfig.delete({
      where: {
        id: id,
      },
    });
  }
}
