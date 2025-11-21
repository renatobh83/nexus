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
// Defina um tipo para os argumentos de busca OR
type ContactFindOrCondition = {
    email?: string;
    serializednumber?: string;
    telegramId?: number;
};


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
        whereOr: ContactFindOrCondition): Promise<Contact> {
        const contact = await prisma.contact.findFirst({
            where: {
                OR: [
                    // Filtra apenas as condições que têm valor
                    ...(whereOr.email ? [{ email: whereOr.email }] : []),
                    ...(whereOr.serializednumber ? [{ serializednumber: whereOr.serializednumber }] : []),
                    ...(whereOr.telegramId ? [{ telegramId: whereOr.telegramId }] : []),
                ],
            },
        });
        if (contact) {
            // Opcional: Se você quiser atualizar o contato encontrado com os novos dados,
            // você faria um update aqui. Se não, apenas retorne.
            return contact;
        }
        const newContact = await prisma.contact.create({
            data: data,
        });
        return newContact;
        // const contact = await prisma.contact.upsert({
        //     where: whereUnique,
        //     update: {}, // Não faz nada se encontrar (apenas retorna o existente)
        //     create: data, // Cria com os dados fornecidos se não encontrar
        // });
        // return contact
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