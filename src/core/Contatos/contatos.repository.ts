import { Contact, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { PaginationOptions } from "../users/users.repository";

interface Request {
    searchParam?: string;
    options?: PaginationOptions;
}

interface Response {
    contatos: Contact[];
    count: number;
    hasMore: boolean;
}


export class ContatosRepository {
    async findContatoByWhere(where: Prisma.ContactWhereInput): Promise<Contact | null> {
        return await prisma.contact.findFirst({ where })

    }
    async findAll({ searchParam = "", options }: Request): Promise<Response> {
        const DEFAULT_LIMIT = 40;
        const DEFAULT_SKIP = 0;
        const { limit = DEFAULT_LIMIT, skip = DEFAULT_SKIP } = options || {};
        const whereCondition: Prisma.ContactWhereInput = {

            OR: [
                {
                    name: {
                        contains: searchParam,
                        mode: 'insensitive', // Equivalente a LOWER() e LIKE no Sequelize
                    },
                },
                {
                    number: {
                        contains: searchParam,
                        mode: 'insensitive', // Equivalente a LIKE no Sequelize
                    },
                },
            ],
        }
        const contatos = await prisma.contact.findMany({
            where: whereCondition,
            take: limit,
            skip: skip,
            include: {
                empresaAssignments: {
                    select: {
                        empresa: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                name: "asc",
            },
        })
        const contatosTransformados = contatos.map(contato => ({
            ...contato,
            empresaAssignments: contato.empresaAssignments.map(assignment => assignment.empresa)
        }));
        const count = await prisma.contact.count();
        const hasMore = count > skip + contatosTransformados.length;
        return {
            contatos: contatosTransformados as any,
            count,
            hasMore,
        }
    }
    async findOrCreateContact(data: Prisma.ContactCreateInput,
        whereUnique: Prisma.ContactWhereUniqueInput): Promise<Contact> {
        const contact = await prisma.contact.upsert({
            where: whereUnique,
            update: {}, // Não faz nada se encontrar (apenas retorna o existente)
            create: data, // Cria com os dados fornecidos se não encontrar
        });
        return contact
    }
    async updateContato(id: number, data: Prisma.ContactUpdateInput): Promise<Contact> {
        return await prisma.contact.update({
            where: {
                id: id
            },
            data
        })
    }
    async delete(id: number): Promise<void> {
        await prisma.contact.delete({
            where: { id }
        })
    }

}