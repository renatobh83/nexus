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
}

//   const contactData: any = {
//     name:
//       contactChat?.name ||
//       contactChat?.pushname ||
//       contactChat?.shortName ||
//       null,
//     number: chat.id.user.replace("55",""),
//     tenantId,
//     pushname: contactChat?.pushname,
//     isUser: contactChat?.isUser,
//     isWAContact: contactChat?.isWAContact,
//     isGroup: !contactChat?.isUser,
//     profilePicUrl: contactChat?.profilePicThumbObj.eurl,
//     serializednumber: chat.id._serialized
    
//   };
// sender: {
//     id: '553184251692@c.us',
//     name: 'Renato Serviço',
//     shortName: 'Renato Serviço',
//     pushname: 'Renato Expert',
//     type: 'in',
//     verifiedName: 'Renato Expert',
//     isBusiness: true,
//     isEnterprise: false,
//     isSmb: true,
//     verifiedLevel: 0,
//     privacyMode: null,
//     statusMute: false,
//     labels: [],
//     isContactSyncCompleted: 1,
//     textStatusLastUpdateTime: -1,
//     syncToAddressbook: true,
//     formattedName: 'You',
//     isMe: true,
//     isMyContact: true,
//     isPSA: false,
//     isUser: true,
//     isWAContact: true,
//     profilePicThumbObj: null,
//     msgs: null
//   },