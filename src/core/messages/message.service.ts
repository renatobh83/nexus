

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

    // Monta o objeto de dados para o repositório
    const dataForDb = {
      ...dto,
      body: bodyToSave,
      // Lógica para conectar relações (ticket, contact, etc.)
      ticket: { connect: { id: dto.ticketId } },
      
      // ...
    };
    //   const createInput: Prisma.MessageCreateInput = filterValidAttributes({
    //   ...messageData,
    //   ...messageSent,
    //   ack: 2,
    //   // Se o messageId for nulo, gera um UUID temporário para o campo 'id'
    //   id: messageId || uuidv4(), 
    //   // Chaves estrangeiras diretas (para campos escalares)
    //   userId: userId,
    //   tenantId: tenantId,
    //   // Relações (para campos de relação)
    //   ticket: { connect: { id: messageData.ticketId } },
    //   contact: { connect: { id: messageData.contactId } },
      
    //   body: media?.originalname || messageData.body,
    //   mediaUrl: media?.filename,
    //   mediaType:
    //     media && media.mimetype ? detectMediaType(media.mimetype) : 'chat',
    // });

    //   // 3. Definição do UPDATE (Lógica de Negócios)
    // const updateInput: Prisma.MessageUpdateInput = {
    //   ack: 2,
    //   timestamp: messageSent.timestamp,
    //   // ... outros campos que você queira atualizar
    // };

    //const newMessage = await this.messageRepository.findOrCreateAndReload();
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
}
