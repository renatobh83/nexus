import { Prisma } from "@prisma/client";

export type CreateDTOChamado = {
  userId: number;
  descricao: string;
  assunto: string;
  contatoId: number[];
  empresaId: number;
  tenantId: number;
};
export const CHAMADO_INCLUDE_CONFIG: Prisma.ChamadoInclude = {
  chamadoContatos: {
    select: {
      contact: {
        select: {
          id: true,
          name: true,
          email: true,
          number: true,
          serializednumber: true,
        },
      },
    },
  },
  ticket: { select: { id: true } },
  empresa: { select: { name: true, id: true } },
  usuario: { select: { name: true, id: true } },
  media: true,
  pauseHistory: true,
};
export interface IUpdateChamadoService {
  userIdUpdate: string;
  chamadoId: number;
  ticketId?: number;
  userId?: number;
  descricao?: string;
  contatoId: any;
  assunto?: string;
  conclusao?: string;
  comentarios?: string[];
  files?: any[];
  status?: "ABERTO" | "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";
  tenantId: number;
}
