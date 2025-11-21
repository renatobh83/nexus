import { Contact, Prisma } from "@prisma/client";
import { ContatosRepository } from "./contatos.repository";

export class ContatoService{
    private contatosRepository: ContatosRepository

    constructor(){
        this.contatosRepository = new ContatosRepository()
    }
    async ListarContatos(){
        return await this.contatosRepository.findAll({})
    }
    async findOrCreate(where: any, data:Prisma.ContactCreateInput): Promise<Contact>{

        const contact = await this.contatosRepository.findOrCreateContact(data, where)

        return contact

    }
    async findContato(where: Prisma.ContactWhereInput){
        return await this.contatosRepository.findContatoByWhere(where)
    }
}
