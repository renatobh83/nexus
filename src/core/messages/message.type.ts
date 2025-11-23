// Tipos auxiliares que devem ser definidos em seu projeto
export enum MessageStatus {
  pending = 'pending',
  sent = 'sent',
  delivered = 'delivered',
  read = 'read',
  failed = 'failed',
    
  // Adicione outros status conforme necessário
}

export enum MessageSendType {
  chat = 'chat',
  template = 'template',
  // Adicione outros tipos conforme necessário
}

/**
 * Representa a Estrutura de Dados de Transferência (DTO) para uma Mensagem.
 * Este tipo é gerado a partir do modelo Prisma MessageDTO.
 */
export interface MessageDTO {
  // --- Campos Principais ---
  id: string; // @id @default(uuid()) @db.Uuid
  messageId: string | null; // ID da mensagem vindo da plataforma (WA, IG, etc.)
  ack: number; // @default(1)
  status: MessageStatus; // @default(pending)
  wabaMediaId?: string | null;
  read: boolean; // @default(false)
  fromMe: boolean; // @default(false)
  body: string; // Corpo da mensagem, será armazenado criptografado
  mediaUrl?: string | null; // Armazena apenas o nome do arquivo, a URL completa é montada no serviço
  mediaType?: string | null;
  reaction?: string | null;
  reactionFromMe?: string | null;
  timestamp: number | null; // BigInt? - Usado como number para timestamps JS
  scheduleDate?: Date | null; // DateTime?
  sendType: MessageSendType; // @default(chat)
  idFront: string | null; // ID temporário gerado pelo frontend
  isDeleted?: boolean; // @default(false)
  isForwarded?: boolean; // @default(false)


  // --- Chaves Estrangeiras ---
  ticketId?: number | null; // Int?
  contactId: number | null; // Int?
  userId?: number | null; // Int?
  tenantId?: number | null; // Int?
  quotedMsgId?: string | null; // String? @db.Uuid

  // --- Relações (Opcional em DTOs, mas incluído para completude) ---
  // Dependendo do seu caso de uso, você pode querer aninhar os DTOs relacionados aqui.
  // Para um DTO simples, as chaves estrangeiras acima são suficientes.
  // Se for um DTO "completo" (com relações), descomente e defina os tipos:
  /*
  ticket?: TicketDTO | null;
  contact?: ContactDTO | null;
  user?: UserDTO | null;
  tenant?: TenantDTO | null;
  quotedMsg?: MessageDTO | null;
  quotes?: MessageDTO[];
  */
}
