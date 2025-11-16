

import { Message } from '@prisma/client';
import { encrypt, decrypt, isEncrypted } from '../../lib/crypto'; // Importa as funções
import { MessageRepository } from './message.repository';

export class MessageService {
  private messageRepository: MessageRepository;

  constructor() {
    this.messageRepository = new MessageRepository();
  }

//   /**
//    * Cria uma nova mensagem, aplicando a criptografia antes de salvar.
//    */
//   async create(dto: any): Promise<Message> {
//     // --- LÓGICA DO HOOK 'beforeCreate' ---
//     let bodyToSave = dto.body.trim();
//     if (bodyToSave === '') {
//       bodyToSave = 'Bot message - sem conteudo';
//     }

//     // Criptografa o corpo da mensagem se ainda não estiver criptografado.
//     if (!isEncrypted(bodyToSave)) {
//       bodyToSave = encrypt(bodyToSave);
//     }

//     // Monta o objeto de dados para o repositório
//     const dataForDb = {
//       ...dto,
//       body: bodyToSave,
//       // Lógica para conectar relações (ticket, contact, etc.)
//       ticket: { connect: { id: dto.ticketId } },
      
//       // ...
//     };

//     const newMessage = await this.messageRepository.create(dataForDb);
//     return newMessage;
//   }

//   /**
//    * Busca uma mensagem pelo ID e a retorna com o corpo descriptografado
//    * e a URL da mídia completa.
//    */
//   async findByIdAndProcess(id: string): Promise<Message | null> {
//     const message = await this.messageRepository.findById(id);
//     if (!message) {
//       return null;
//     }

//     // --- LÓGICA DO GETTER 'mediaUrl' E DESCRIPTOGRAFIA ---
    
//     // Descriptografa o corpo da mensagem
//     const decryptedBody = decrypt(message.body);

//     // Monta a URL completa da mídia
//     let fullMediaUrl: string | null = null;
//     if (message.mediaUrl) {
//       const { BACKEND_URL, PROXY_PORT } = process.env;
//       fullMediaUrl = (process.env.NODE_ENV === 'development' && PROXY_PORT)
//         ? `${BACKEND_URL}:${PROXY_PORT}/public/${message.mediaUrl}`
//         : `${BACKEND_URL}/public/${message.mediaUrl}`;
//     }

//     // Retorna uma cópia do objeto da mensagem com os campos processados
//     return {
//       ...message,
//       body: decryptedBody,
//       mediaUrl: fullMediaUrl,
//     };
//   }
}
