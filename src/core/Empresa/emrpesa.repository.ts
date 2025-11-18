import { Empresa, EmpresaContrato, Prisma } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "../../lib/prisma";

export interface ContratoServiceProps {
  dataContrato: Date;
  empresaId: number; // Assumindo que IDs são strings (UUIDs)
  tenantId: number;
  totalHoras: number;
}
type ContratoCreateData = Omit<ContratoServiceProps, "dataContrato"> & {
  dataContrato: Date;
};
type ContratoUpdateData = Pick<ContratoServiceProps, "totalHoras">;

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

  async findByDateAndEmpresaId(
    dataContrato: Date,
    empresaId: number
  ): Promise<EmpresaContrato | null> {
    // A lógica de range de data (startOfDay/endOfDay) é traduzida para o Prisma
    // usando o operador 'gte' (greater than or equal) e 'lte' (less than or equal).
    // Para isso, usaremos as funções de data do `date-fns` no Service.
    return prisma.empresaContrato.findFirst({
      where: {
        empresaId: empresaId,
        dataContrato: {
          gte: startOfDay(dataContrato), // Início do dia
          lte: endOfDay(dataContrato), // Fim do dia
        },
      },
    });
  }
  async updateContrato(
    id: number,
    data: ContratoUpdateData
  ): Promise<EmpresaContrato> {
    return prisma.empresaContrato.update({
      where: { id },
      data,
    });
  }
  async createContrato(data: ContratoCreateData): Promise<EmpresaContrato> {
    return prisma.empresaContrato.create({
      data,
    });
  }
  async findContatoByEmpresa(empresaId: number) {
    return prisma.empresa.findFirst({
      where: {
        id: empresaId,
      },
      select: {
        name: true,
        empresaContacts: {
          select: {
            contact: {
              select: {
                id: true,
                name: true,
                number: true,
                email: true,
                profilePicUrl: true,
              },
            },
          },
        },
      },
    });
  }
  async updateContatoEmpresa(empresaId: number, contatoId: []) {
    // 1. Cria as operações de criação (create) para cada contactId
    const createOperations = contatoId.map((contactId) =>
      prisma.empresaContact.create({
        data: {
          empresaId: empresaId,
          contactId: contactId,
        },
      })
    );

    // 2. Define a operação de exclusão (deleteMany)
    const deleteOperation = prisma.empresaContact.deleteMany({
      where: {
        empresaId: empresaId,
      },
    });

    // 3. Executa as operações em uma transação:
    //    - Primeiro, deleta todas as associações existentes.
    //    - Depois, cria as novas associações.
    await prisma.$transaction([deleteOperation, ...createOperations]);

    // 4. Retorna a empresa com os novos contatos incluídos (opcional)
    const empresaAtualizada = await prisma.empresa.findUniqueOrThrow({
      where: { id: empresaId },
      select: {
        name: true,
        empresaContacts: {
          select: {
            contact: {
              select: {
                id: true,
                name: true,
                number: true,
                email: true,
                profilePicUrl: true,
              },
            },
          },
        },
      },
    });

    return empresaAtualizada;
  }
}
