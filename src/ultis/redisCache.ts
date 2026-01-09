import { format } from "date-fns";
import { SessaoUsuario } from "../core/IGenesis/types";
import { redisClient } from "../lib/redis";

// Buscar do cache
export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

// Salvar no cache com TTL
export async function setCache<T>(key: string, value: T, ttlSeconds = 120) {
  await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export const REDIS_KEYS = {
  channel: (id: number) => `cache:channel:${id}`,

  contact: (channelId: number, contato: string) =>
    `cache:contact:${channelId}:${contato}`,

  ticketLock: (whatsappId: number, contactId: number) =>
    `lock:wpp:ticket:${whatsappId}:${contactId}`,
  // settingIgnoreGroup: (tenantId: number | string) =>
  //   `cache:wpp:setting:ignoreGroup:${tenantId}`,
  sessao: (ticketId: number) => `sessao:${ticketId}`,
  previousStepId: (ticketId: number) => `stepFromTicket:${ticketId}`,
  horarioAgendamento: (horarioId: any) => `horario:${horarioId}`,
  Procedimentos: (unidadeId: any) => `Procedimentos:${unidadeId}`,
  Pdf: (plano: any) => `pdf:${plano}`,
};

/// INTEGRACAO

export async function salvarSessaoUsuario(
  ticketId: number,
  sessao: any
): Promise<void> {
  await setCache(REDIS_KEYS.sessao(ticketId), sessao);
}

export async function obterSessaoUsuarioRedis(
  ticketId: number
): Promise<SessaoUsuario> {
  const sessaoExist = (await getCache(
    REDIS_KEYS.sessao(ticketId)
  )) as SessaoUsuario;
  if (sessaoExist) {
    return sessaoExist;
  }
  const novaSessao: SessaoUsuario = {
    dadosPaciente: {},
    unidadeSelecionada: null,
    planoSelecionado: null,
    examesParaAgendar: [],
    ultimaDataConsulta: format(new Date(), "dd/MM/yyyy"),
    horarioSelecionado: null,
    cadastro: null,
    cdHorario: null,
    intervaloSelecionado: "",
    medicosSelecionados: null,
    ultimoExameSelecionado: null,
    valorTotalExames: 0,
    listaAtendimentos: [],
    listaAgendamentos: [],
    listaPlanos: [],
    listaUnidades: [],
    listaExames: [],
    examesComMedicos: [],
    errosResponse: 0,
  };

  await salvarSessaoUsuario(ticketId, JSON.stringify(novaSessao)); // TTL de 1h
  return novaSessao;
}
