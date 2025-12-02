import { ChamadoRepository } from "./chamado.repository";
import {
  CHAMADO_INCLUDE_CONFIG,
  CreateDTOChamado,
  IUpdateChamadoService,
} from "./chamado.types";
import { AppError } from "../../errors/errors.helper";
import { Chamado, Media, PauseHistory, Prisma, Ticket } from "@prisma/client";
import { getFastifyApp } from "../../api";
import socketEmit from "../../api/helpers/socketEmit";
import { prisma } from "../../lib/prisma";
import { prepareMediaFile } from "../../ultis/prepareMediaFile";

export class ChamadoService {
  private chamadoRepository: ChamadoRepository;
  constructor() {
    this.chamadoRepository = new ChamadoRepository();
  }

  async createChamado(dto: CreateDTOChamado, ticket: Ticket | undefined) {
    const { empresaId, tenantId, contatoId, userId, ...restDtoData } = dto;

    const dataForPrisma: any = {
      ...restDtoData,
    };
    if (!Array.isArray(contatoId)) {
      dataForPrisma.contatoId = [contatoId];
    } else {
      dataForPrisma.contatoId = contatoId;
    }
    if (ticket) {
      dataForPrisma.ticket = {
        connect: { id: ticket.id },
      };
    }
    dataForPrisma.empresa = {
      connect: { id: empresaId },
    };
    dataForPrisma.usuario = {
      connect: { id: dto.userId },
    };

    const chamado = await this.chamadoRepository.create(dataForPrisma, ticket);
    return chamado;
  }
  async findAllBy(where: Prisma.ChamadoWhereInput) {
    return await this.chamadoRepository.findAll(where);
  }
  async findAll() {
    return await this.chamadoRepository.findAll();
  }
  async findById(chamadoId: number) {
    return await this.chamadoRepository.findById(chamadoId);
  }
  async updateChamado({
    chamadoId,
    contatoId,
    tenantId,
    userIdUpdate,
    assunto,
    comentarios,
    conclusao,
    descricao,
    files,
    status,
    ticketId,
    userId,
  }: IUpdateChamadoService) {
    let parsedComentarios: string[] = [];
    if (typeof comentarios === "string") {
      try {
        parsedComentarios = JSON.parse(comentarios);
      } catch {
        parsedComentarios = [];
      }
    } else if (Array.isArray(comentarios)) {
      parsedComentarios = comentarios;
    }
    const safeComentarios = parsedComentarios.filter(
      (c) => c !== null && c !== undefined
    );
    const id = ticketId ? ticketId : chamadoId;
    const chamado = await this.chamadoRepository.findById(id);

    if (!chamado) {
      throw new AppError("ERR_NO_CHAMADO_FOUND", 404);
    }

    if (chamado.userId !== +userIdUpdate && chamado.userId === userId) {
      userId = +userIdUpdate;
    }
    if (chamado.status === "CONCLUIDO") {
      throw new AppError("ERR_CHAMADO_IS_CLOSED", 404);
    }
    if (safeComentarios.length > 0) {
      chamado.comentarios = safeComentarios;
    }
    if (status === "PAUSADO") {
      await this.pausarTicket(chamado);
    }
    if (status === "ABERTO") {
      await this.retomarTicket(chamado);
    }
    if (status === "CONCLUIDO") {
      await this.fecharTicket(chamado, conclusao!);
    }
    if (contatoId) {
      const contatosArray = Array.isArray(contatoId) ? contatoId : [contatoId];

      await this.chamadoRepository.updateContatoChamado(
        contatosArray,
        chamado.id
      );
    }
    const dataForPrima: any = {
      descricao,
      assunto,
      conclusao,
      comentarios:
        safeComentarios.length > 0 ? safeComentarios : chamado.comentarios,
    };
    dataForPrima.usuario = {
      connect: { id: typeof userId === "string" ? parseInt(userId) : userId },
    };

    const chamadoAtualizado = await this.chamadoRepository.update(
      chamado.id,
      dataForPrima
    );
    return chamadoAtualizado;
  }
  async associarTicketChamado(
    empresaId: number,
    chamadoId: number,
    ticketId: number
  ) {
    const chamado = await this.chamadoRepository.findOneByWhere({
      empresaId: empresaId,
      id: chamadoId,
    });

    if (chamado) {
      const ticketsAtualizados =
        chamado.ticketsAssociados && Array.isArray(chamado.ticketsAssociados)
          ? [...chamado.ticketsAssociados]
          : [];

      if (ticketsAtualizados.includes(ticketId)) {
        throw new AppError("TICKET_ALREADY_ASSOCIATED", 409);
      }
      ticketsAtualizados.push(ticketId);
      await this.chamadoRepository.update(chamado.id, {
        ticketsAssociados: ticketsAtualizados,
      });
      const ticket = await getFastifyApp().services.ticketService.updateTicket(
        ticketId,
        {
          chamadoId: chamadoId,
          associatedCalls: true,
        }
      );

      socketEmit({
        tenantId: ticket.tenantId,
        type: "ticket:update",
        payload: ticket,
      });
      return chamado;
    }
  }
  async getMediaChamado(id: number) {
    const findMedia = await prisma.media.findFirst({
      where: {
        id: id,
      },
    });
    if (!findMedia) {
      throw new AppError("MEDIA_NO_FOUND", 404);
    }
    return findMedia;
  }

  async deleteMediaChamado(id: number) {
    const findMedia = await prisma.media.findFirst({
      where: {
        id: id,
      },
    });
    if (!findMedia) {
      throw new AppError("MEDIA_NO_FOUND", 404);
    }
    await prisma.media.delete({ where: { id: id } });
  }
  async updateMediaFileChamado(anexo: any) {
    const findMedia = await prisma.media.findFirst({
      where: {
        id: anexo.id,
      },
    });
    if (!findMedia) {
      throw new AppError("MEDIA_NO_FOUND", 404);
    }
    const novoDado = anexo.dadosenvio;

    if (!novoDado || typeof novoDado !== "object" || Array.isArray(novoDado)) {
      throw new AppError("INVALID_DADOSENVIO", 400);
    }
    const chaveNova = Object.keys(novoDado)[0]!;
    if (!["mensagemEnviadoEm", "emailEnviadoEm"].includes(chaveNova)) {
      throw new AppError("CHAVE_DADOSENVIO_INVALIDA", 400);
    }
    const dadosAnteriores = Array.isArray(findMedia.dadosenvio)
      ? findMedia.dadosenvio
      : [];

    const dadosAtualizados = [
      ...dadosAnteriores.filter((item: any) => !item.hasOwnProperty(chaveNova)),
      novoDado, // adiciona o novo dado
    ];
    await prisma.media.update({
      where: {
        id: anexo.id,
      },
      data: {
        dadosenvio: dadosAtualizados,
      },
    });
  }

  async createMediaChamado(chamadoId: number, files: any) {
    if (Array.isArray(files) && files.length > 0) {
      const mediaData = files.map((file) => {
        const { url, type } = prepareMediaFile(file);
        return { url, type, chamadoId };
      }) as unknown as any;

      await prisma.media.createMany({
        data: mediaData,
        skipDuplicates: true, // Opcional: ignora a inserção se um registro único já existir
      });
    }
    const chamado = await prisma.chamado.findFirst({
      where: { id: chamadoId },
      include: CHAMADO_INCLUDE_CONFIG,
    });
    return chamado;
  }
  async sendMessageChamado(data: any) {
    const { tenantId, sendTo } = data;
    if (Array.isArray(sendTo) && sendTo.length > 0) {
      const messagensParaEnviar: any[] = [];
      sendTo.forEach((to) => {
        const messageOptions = {
          ...data,
          sendTo: to,
          tenantId,
        };

        messagensParaEnviar.push(messageOptions);
      });
      messagensParaEnviar.forEach((options) => {
        //addJOB
      });
    }
  }
  async chamadosEmpresaContato(empresaId: number, conttoId: number) {
    return await this.chamadoRepository.findChamadoEmpresaContato(
      empresaId,
      conttoId
    );
  }
  private async pausarTicket(chamado: Chamado) {
    if (chamado.status.includes("PAUSADO")) {
      return;
    }
    if (!chamado || chamado.status !== "ABERTO") {
      throw new AppError("ERROR_UPDATE_TICKET", 404);
    }

    await this.chamadoRepository.createPauseHistoryChamado(chamado.id);

    await this.chamadoRepository.update(chamado.id, {
      status: "PAUSADO",
    });
  }
  private async retomarTicket(chamado: Chamado) {
    if (chamado.status === "ABERTO") return;

    if (chamado.status !== "PAUSADO") {
      throw new AppError("ERROR_UPDATE_TICKET", 404);
    }

    await this.chamadoRepository.updatePauseHistory(chamado.id, {
      endTime: new Date(),
    });
    await this.chamadoRepository.update(chamado.id, {
      status: "ABERTO",
    });
  }
  private async fecharTicket(chamado: Chamado, conclusao: string) {
    if (chamado.status === "CONCLUIDO") {
      throw new AppError("ERROR_UPDATE_TICKET_NO_FOUND", 404);
    }

    if (chamado.status === "PAUSADO") {
      await this.retomarTicket(chamado);
    }
    const isActiveSenEmail =
      await getFastifyApp().services.settingsService.findBySettings({
        key: "sendEmailOpenClose",
      });

    if (isActiveSenEmail?.value !== "disabled") {
      // sendEmailOpenClose(ticket, conclusao);
    }

    const closeTime = new Date();
    const createdAt = new Date(chamado.createdAt!);
    const closedAt = new Date(closeTime);
    let totalTime = closedAt.getTime() - createdAt.getTime();
    const pauseHistory = await this.chamadoRepository.getPauseHistoryChamado(
      chamado.id
    );
    pauseHistory.forEach((pause: PauseHistory) => {
      const pauseStart = new Date(pause.startTime);
      const pauseEnd = pause.endTime ? new Date(pause.endTime) : new Date();
      totalTime -= pauseEnd.getTime() - pauseStart.getTime();
    });
    await this.chamadoRepository.update(chamado.id, {
      status: "CONCLUIDO",
      closedAt: closeTime,
      tempoChamado: (chamado.tempoChamado ?? 0) + totalTime,
    });
  }
}
