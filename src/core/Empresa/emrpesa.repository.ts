import { Empresa, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { connect } from "http2";

export class EmpresaRepository {
  async findById(where: Prisma.EmpresaWhereInput): Promise<Empresa | null> {
    return prisma.empresa.findFirst({ where });
  }
  async findAll(include?: Prisma.EmpresaInclude): Promise<Empresa[]> {
    return prisma.empresa.findMany({ include });
  }
  async create(data: Prisma.EmpresaCreateInput): Promise<Empresa> {
    const { tenant, ...restData } = data;

    return prisma.empresa.create({
      data: {
        ...restData,
        tenant: {
          connect: {
            id: tenant as number,
          },
        },
      },
    });
  }
  async update(
    id: string,
    data: Partial<Prisma.EmpresaUpdateInput>
  ): Promise<Empresa> {
    return prisma.empresa.update({
      where: { id: parseInt(id) },
      data,
      include: {
        empresaContacts: {
          select: {
            contact: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.empresa.delete({ where: { id: parseInt(id) } });
  }
}
