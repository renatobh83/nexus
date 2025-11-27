import { Contact, Prisma } from "@prisma/client";
import { ContatosRepository } from "./contatos.repository";
import { PaginationOptions } from "../Users/users.repository";
import { WhatsappRepository } from "../Whatsapp/whatsapp.repository";
import { getWbot } from "../../lib/wbot";
import { AppError } from "../../errors/errors.helper";

type ContactFindWhere = {
  email?: string;
  serializednumber?: string;
  telegramId?: number;
};

export class ContatoService {
  private contatosRepository: ContatosRepository;
  private whatsappRepository: WhatsappRepository;

  constructor() {
    this.contatosRepository = new ContatosRepository();
    this.whatsappRepository = new WhatsappRepository();
  }
  async ListarContatos(searchParam = "", options?: PaginationOptions) {
    return await this.contatosRepository.findAll({
      searchParam,
      options,
    });
  }
  async findOrCreate(
    where: ContactFindWhere,
    data: Prisma.ContactCreateInput
  ): Promise<Contact> {
    const wppConnect = await this.whatsappRepository.findFirst({
      type: "whatsapp",
      status: "CONNECTED",
    });
    if ("empresas" in data) {
      delete data.empresas;
    }
    if (!data.dtaniversario) {
      delete data.dtaniversario;
    }

    if (wppConnect) {
      const wbot = getWbot(wppConnect.id);
      try {
        const contato = await wbot.checkNumberStatus(data.number!);
        if (contato) {
          data.serializednumber = contato.id._serialized;
          data.isWAContact = true;
          data.number = contato.id.user.replace("55", "");
          const pic = await wbot.getProfilePicFromServer(
            contato.id._serialized
          );
          data.profilePicUrl = pic.eurl;
        } else {
          data.serializednumber = null;
        }
      } catch (error) {}
    }
    const contact = await this.contatosRepository.findOrCreateContact(
      data,
      where
    );

    return contact;
  }
  async findContato(where: Prisma.ContactWhereInput) {
    return await this.contatosRepository.findContatoByWhere(where);
  }
  async updateContato(
    id: number,
    data: Prisma.ContactCreateInput
  ): Promise<Contact> {
    if ("empresas" in data) {
      delete data.empresas;
    }
    if ("empresaAssignments" in data) {
      delete data.empresaAssignments;
    }
    if (!data.dtaniversario) {
      delete data.dtaniversario;
    }

    const wppConnect = await this.whatsappRepository.findFirst({
      type: "whatsapp",
      status: "CONNECTED",
    });
    if (wppConnect) {
      const wbot = getWbot(wppConnect.id);
      try {
        const contato = await wbot.checkNumberStatus(data.number!);
        if (contato) {
          data.serializednumber = contato.id._serialized;
          data.isWAContact = true;
          data.number = contato.id.user.replace("55", "");
          const pic = await wbot.getProfilePicFromServer(
            contato.id._serialized
          );
          data.profilePicUrl = pic.eurl;
          // const isContato = await wbot.getContact(contato.id._serialized) as Contact
          // if(isContato) {
          //     data.pushname = isContato.pushname

          // }
        } else {
          data.serializednumber = null;
        }
      } catch (error) {}
    }
    const contact = await this.contatosRepository.updateContato(id, data);

    return contact;
  }

  async deleteContato(id: number): Promise<void> {
    await this.contatosRepository.delete(id);
  }

  async createContact(
    where: ContactFindWhere,
    data: Prisma.ContactCreateInput
  ) {
    const contactExists = await this.contatosRepository.finUnique(where);

    if (contactExists) {
      throw new AppError("ERR_DUPLICATED_CONTACT", 400);
    }
    const contact = await this.contatosRepository.createContat(data);
    return contact;
  }
}
