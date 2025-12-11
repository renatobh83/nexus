import { IGConfirmacao, Prisma } from "@prisma/client";
import { v4 as uuidV4 } from "uuid";
import { IGenesisRepository } from "./IGenesis.repository";
import { AppError } from "../../errors/errors.helper";
import ProcessBodyData from "../../ultis/ProcessBodyData";

import { getWbot } from "../../lib/wbot";
import { extratcInforAgendamneto } from "./IGenesis.utils";
import { prisma } from "../../lib/prisma";
import { compareSync } from "bcryptjs";
import { addJob } from "../../lib/Queue";
interface ConfirmacaoProps {
  contato: string;
  cliente: string;
  idExterno: number;
  notificacao: object;
  apiId: string;
  idIntegracao: string;
  authToken: string;
}

export class IGenesisServices {
  private iGenesisConfirmacaoReposigory: IGenesisRepository;
  constructor() {
    this.iGenesisConfirmacaoReposigory = new IGenesisRepository();
  }

  async findOne(
    where: Prisma.IGConfirmacaoWhereInput
  ): Promise<IGConfirmacao | null> {
    return await this.iGenesisConfirmacaoReposigory.findOne(where);
  }
  async findConfirmacao(payload: ConfirmacaoProps): Promise<void> {
    const integracao = await this.iGenesisConfirmacaoReposigory.findIntegracao(
      payload.apiId
    );
    if (!integracao) {
      throw new AppError("ERR_SESSION_NOT_FOUND", 404);
    }
    const whatsapp = await this.iGenesisConfirmacaoReposigory.findChannel(
      integracao.sessionId
    );
    if (!whatsapp) {
      throw new AppError("ERR_SESSION_NOT_CONNECTED", 404);
    }
    const body = ProcessBodyData(payload.notificacao);
    const wbot = getWbot(integracao.sessionId);
    const numberWpp = await wbot.checkNumberStatus(payload.contato);
    if (!numberWpp.numberExists) {
      throw new AppError("ERR_SENDING_WAPP_NUMBER_NO_FOUND", 404);
    }

    const dadosAgendamento = await extratcInforAgendamneto({
      body,
    });
    let ticket = await this.iGenesisConfirmacaoReposigory.findOne({
      atendimentoData: body.atendimento_data,
      answered: false,
      closedAt: null,
      idexterno: {
        array_contains: dadosAgendamento.idExternos,
      },
    });
    const dataToJob: any = {
      body,
      sessionId: integracao.sessionId,
    };
    if (!ticket) {
      const novosProcedimentos: any[] = [];
      const novosIdExternos: any[] = [];
      for (const agendamento of body.dados_agendamentos) {
        const { idExterno, Procedimento } = agendamento;
        // Verifique se idExterno já existe em novosIdExternos antes de adicionar
        if (!novosIdExternos.includes(idExterno)) {
          novosIdExternos.push(idExterno);
        }
        // Verifique se Procedimento já existe em novosProcedimentos antes de adicionar
        if (!novosProcedimentos.includes(Procedimento)) {
          novosProcedimentos.push(Procedimento);
        }
      }

      const TicketObj: any = {
        id: uuidV4(),
        contato: numberWpp.id._serialized,
        contatoSend: payload.contato,
        procedimentos: novosProcedimentos,
        idexterno: novosIdExternos,
        channelId: integracao.sessionId,
        atendimentoData: body.atendimento_data,
        atendimentoHora: dadosAgendamento.horarioMaisCedo.Hora,
        integracaoId: +payload.idIntegracao,
      };
      ticket = await this.iGenesisConfirmacaoReposigory.create(TicketObj);
    } else {
      if (ticket.enviada) {
        throw new AppError("ERR_SENDING_WAPP_MESSAGE_ALREADY_SENDED", 400);
      }
      for (const agendamento of body.dados_agendamentos) {
        const { idExterno, Procedimento } = agendamento;
        // 🔥 GARANTE ARRAY
        const procArr = Array.isArray(Procedimento)
          ? Procedimento
          : [Procedimento];
        const idExtArr = Array.isArray(idExterno) ? idExterno : [idExterno];
        await prisma.$executeRaw`
            UPDATE "IGConfirmacao"
            SET
                procedimentos = CASE
                WHEN NOT EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements_text(procedimentos) AS elem
                   WHERE elem::int = ANY(${procArr}::int[])
                )
               THEN procedimentos || to_jsonb(${procArr}::int[])
                ELSE procedimentos
                END,

                "atendimentoHora" = LEAST("atendimentoHora", ${dadosAgendamento.horarioMaisCedo.Hora}),

                idexterno = CASE
                WHEN NOT EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements_text(idexterno) AS elem
                    WHERE elem::int = ANY(${idExtArr}::int[])
                )
                THEN idexterno || to_jsonb(${idExtArr}::int[])
                ELSE idexterno
                END

            WHERE id = ${ticket.id}
            `;
      }
    }
    dataToJob.ticket = ticket;
    addJob("SendMessageConfirmar", dataToJob);
  }
  async updateTicketConfirmacao(id: string, data: any) {
    return await this.iGenesisConfirmacaoReposigory.update(id, data);
  }
}
