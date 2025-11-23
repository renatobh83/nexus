

import { Message, Prisma, Ticket } from '@prisma/client';
import { encrypt, decrypt, isEncrypted } from '../../lib/crypto'; // Importa as funções
import { MessageRepository } from './message.repository';
import { MessageDTO } from './message.type';


export class MessageService {
  private messageRepository: MessageRepository;

  constructor() {
    this.messageRepository = new MessageRepository();
  }

  /**
   * Cria uma nova mensagem, aplicando a criptografia antes de salvar.
   */
  async createMessageSystem(dto: MessageDTO): Promise<void> {

    // --- LÓGICA DO HOOK 'beforeCreate' ---
    let bodyToSave = dto.body.trim();
    if (bodyToSave === '') {
      bodyToSave = 'Bot message - sem conteudo';
    }

    // Criptografa o corpo da mensagem se ainda não estiver criptografado.
    if (!isEncrypted(bodyToSave)) {
      bodyToSave = encrypt(bodyToSave);
    }
    const {ticketId, tenantId,contactId, ...restDto} = dto
    // Monta o objeto de dados para o repositório
    const dataForDb = {
      ...restDto,
      body: bodyToSave,
      // Lógica para conectar relações (ticket, contact, etc.)
      ticket: { connect: { id: dto.ticketId  as number} },
      contact: { connect: { id: dto.contactId  as number} },
      tenant: { connect: { id: dto.tenantId as number }  },
      // user: { connect: { id: dto.userId } },

      // ...
    };
    console.log(dataForDb)
    //   const createInput: Prisma.MessageCreateInput = filterValidAttributes({
    //   ...dto,
    //   body: dto.mediaUrl || dto.body,
    //   mediaUrl: dto.mediaUrl,
    //   mediaType:
    //     media && media.mimetype ? detectMediaType(media.mimetype) : 'chat',
    // });
    const updateInput: Prisma.MessageUpdateInput = {
      ack: 2,
      // timestamp: messageSent.timestamp,
      // ... outros campos que você queira atualizar
    };

    //   // 3. Definição do UPDATE (Lógica de Negócios)
    // const updateInput: Prisma.MessageUpdateInput = {
    //   ack: 2,
    //   timestamp: messageSent.timestamp,
    //   // ... outros campos que você queira atualizar
    // };

    const newMessage = await this.messageRepository.findOrCreateAndReload(
      { messageId: dto.messageId!, tenantId: dto.tenantId! },
      dataForDb,
      updateInput);
      console.log(newMessage)
    //return newMessage;
  }

  /**
   * Busca uma mensagem pelo ID e a retorna com o corpo descriptografado
   * e a URL da mídia completa.
   */
  // async findByIdAndProcess(id: string): Promise<Message | null> {
  //   const message = await this.messageRepository.findById(id);
  //   if (!message) {
  //     return null;
  //   }

  //   // --- LÓGICA DO GETTER 'mediaUrl' E DESCRIPTOGRAFIA ---

  //   // Descriptografa o corpo da mensagem
  //   const decryptedBody = decrypt(message.body);

  //   // Monta a URL completa da mídia
  //   let fullMediaUrl: string | null = null;
  //   if (message.mediaUrl) {
  //     const { BACKEND_URL, PROXY_PORT } = process.env;
  //     fullMediaUrl = (process.env.NODE_ENV === 'development' && PROXY_PORT)
  //       ? `${BACKEND_URL}:${PROXY_PORT}/public/${message.mediaUrl}`
  //       : `${BACKEND_URL}/public/${message.mediaUrl}`;
  //   }

  //   // Retorna uma cópia do objeto da mensagem com os campos processados
  //   return {
  //     ...message,
  //     body: decryptedBody,
  //     mediaUrl: fullMediaUrl,
  //   };
  // }



  /*private buildMessageBody = (template: string, ticket: any) => {
    
  return pupa(template || "", {
    
    name: ticket?.contact?.name ?? "",
    email: ticket?.contact?.email ?? "",
    phoneNumber: ticket?.contact?.number ?? "",
    user: ticket?.user?.name ?? "",
    userEmail: ticket?.user?.email ?? "",
  });
};*/

  async findMessageBy(where: Prisma.MessageWhereInput): Promise<Message | null> {
    return await this.messageRepository.findMessageBy(where)
  }
}
