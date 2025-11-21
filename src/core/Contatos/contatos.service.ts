import { Contact, Prisma } from "@prisma/client";
import { ContatosRepository } from "./contatos.repository";
import { PaginationOptions } from "../users/users.repository";

type ContactFindWhere = {
    email?: string;
    serializednumber?: string;
    telegramId?: number;
};

export class ContatoService{
    private contatosRepository: ContatosRepository

    constructor(){
        this.contatosRepository = new ContatosRepository()
    }
    async ListarContatos(searchParam= "", options?: PaginationOptions){
        
        return await this.contatosRepository.findAll({
            searchParam,
            options
        })
    }
    async findOrCreate( where: ContactFindWhere, data:Prisma.ContactCreateInput): Promise<Contact>{

        const contact = await this.contatosRepository.findOrCreateContact(data, where)

        return contact

    }
    async findContato(where: Prisma.ContactWhereInput){
        return await this.contatosRepository.findContatoByWhere(where)
    }
    async updateContato(id: number, data: Prisma.EmpresaContratoUpdateInput): Promise<Contact>{
        return await this.contatosRepository.updateContato(id, data)
    }

}
