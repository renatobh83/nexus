import { getFastifyApp } from "../../../../../api";
import {
  setCache,
  REDIS_KEYS,
  getCache,
} from "../../../../../ultis/redisCache";
import { validarCPF } from "../../../../../ultis/validarCPF";
import { ConsultaPaciente } from "../../../../IGenesis/IGenesis.utils";
import { SessaoUsuario } from "../../../../IGenesis/types";
import { Ticket } from "@prisma/client";
import {
  generatePatientNotFoundMessage,
  generateWelcomeMessage,
} from "../messages/message_utils";

export let listaUnidades: any[];

interface ActionHandlerParams {
  integracao: any;
  ticket: Ticket;
  msg: any;
  sessao: SessaoUsuario;
  input: string;
}

export async function handleInicioNode({ ticket }: ActionHandlerParams) {
  await setCache(REDIS_KEYS.previousStepId(ticket.id), ticket.stepChatFlow);
  return false;
}

// export async function handleRecuperar({
//   integracao,
//   ticket,
//   input,
//   sessao,
// }: ActionHandlerParams) {
//   const emailMatch = input.match(
//     /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/
//   );
//   if (!emailMatch) {
//     await ticket.update({
//       stepChatFlow: PREVIOUS_STEPID,
//       lastInteractionBot: new Date(),
//     });
//     sessao.errosResponse = sessao.errosResponse + 1;
//     return "Dados inseridos inválido, favor conferir e enviar novamente.";
//   }
//   PREVIOUS_STEPID = ticket.stepChatFlow;
//   const emailMsg = emailMatch[0];
//   let dtNascimento = "";
//   if (emailMsg) {
//     dtNascimento = input.replace(emailMsg, "").trim();
//   }
//   try {
//     await ticket.update({
//       status: "closed",
//       closedAt: new Date().getTime(),
//       botRetries: 0,
//       lastInteractionBot: new Date(),
//     });
//     sessao.errosResponse = 0;
//     const data = await RecuperarAcessoHelper({
//       integracao,
//       email: emailMsg,
//       dtNascimento,
//     });
//     return `${data[0].Sucesso} Atendimento será finalziado.`;
//   } catch (error) {
//     await ticket.update({
//       status: "closed",
//       closedAt: new Date().getTime(),
//       botRetries: 0,
//       lastInteractionBot: new Date(),
//     });
//     sessao.errosResponse = 0;
//     return "Não conseguimos localizar seu cadastro com as informações inseridas, favor entrar em contato com a nossa central e solicitar o seu acesso. Atendimento será finalziado.";
//   }
// }

function getError(response: any): string | null {
  if (!response) return null;

  // Caso seja array
  if (Array.isArray(response) && response.length > 0 && response[0].Erro) {
    return response[0].Erro;
  }

  // Caso seja objeto
  if (response.Erro) return response.Erro;
  if (response.error) return response.error;

  return null; // sem erro
}

export async function handleConsulta({
  integracao,
  ticket,
  sessao,
  input,
}: ActionHandlerParams) {
  const cpfMatch = input.match(/\b\d{11}\b/);

  const PREVIOUS_STEPID = await getCache(REDIS_KEYS.previousStepId(ticket.id));
  if (!cpfMatch) {
    await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
      stepChatFlow: PREVIOUS_STEPID!,
      lastInteractionBot: new Date(),
    });

    sessao.errosResponse = sessao.errosResponse + 1;
    return "Dados inseridos inválido, favor conferir e enviar novamente.";
  }

  if (!validarCPF(cpfMatch[0])) {
    await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
      stepChatFlow: PREVIOUS_STEPID!, // Restaurar para o passo anterior
      lastInteractionBot: new Date(),
    });
    sessao.errosResponse = sessao.errosResponse + 1;
    return "Dados inseridos inválido, favor conferir e enviar novamente.";
  }
  await setCache(REDIS_KEYS.previousStepId(ticket.id), ticket.stepChatFlow);
  await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
    lastInteractionBot: new Date(),
  });
  sessao.errosResponse = 0;
  const cpf = cpfMatch[0];
  sessao.cadastro = cpf;
  const consultaAPI = await ConsultaPaciente({
    senha: "0",
    integracao,
    cpf,
  });
  const erro = getError(consultaAPI);
  if (erro === "Senha inválida !") {
    return "🤖 Para continuar, por favor, digite sua senha de acesso.";
  } else if (erro === "Cadastro não encontrado !") {
    return generatePatientNotFoundMessage(ticket.channel!);
  } else if (erro) {
    await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
      lastInteractionBot: new Date(),
    });
    sessao.errosResponse = sessao.errosResponse + 1;
    return erro;
  }
}

export async function handleSolicitarSenha({
  integracao,
  ticket,
  sessao,
  input,
}: ActionHandlerParams) {
  const senha = input.trim();
  const cpf = sessao.cadastro;
  const PREVIOUS_STEPID = await getCache(REDIS_KEYS.previousStepId(ticket.id));
  // Se já houver dados do paciente na sessão, pula a consulta
  if (sessao.dadosPaciente && Object.keys(sessao.dadosPaciente).length > 0) {
    return generateWelcomeMessage(
      sessao.dadosPaciente.ds_paciente,
      ticket.channel!
    );
  }

  const retornoConsulta = await ConsultaPaciente({
    senha,
    integracao,
    cpf,
  });

  if (getError(retornoConsulta) === "Senha inválida !") {
    await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
      stepChatFlow: PREVIOUS_STEPID!,
      lastInteractionBot: new Date(),
    });
    sessao.errosResponse = sessao.errosResponse + 1;
    if (sessao.errosResponse === 1 || sessao.errosResponse === 2) {
      return "🤖 Dados inseridos inválido, favor conferir e enviar novamente.";
    } else if (sessao.errosResponse >= 3) {
      await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
        stepChatFlow: PREVIOUS_STEPID!,
        lastInteractionBot: new Date(),
      });
      sessao.errosResponse = 0;
      return "🤖 Os dados fornecidos não conferem. Favor digitar *recuperar* para cadastrar uma nova senha.";
    }
  }

  await setCache(REDIS_KEYS.previousStepId(ticket.id), ticket.stepChatFlow);
  sessao.dadosPaciente = retornoConsulta[0];
  await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
    botRetries: 0,
    lastInteractionBot: new Date(),
  });
  sessao.errosResponse = 0;
  return generateWelcomeMessage(
    sessao.dadosPaciente.ds_paciente,
    ticket.channel!
  );
}

// export async function handleLinkCadastro({
//   integracao,
//   ticket,
//   sessao,
// }: ActionHandlerParams) {
//   const cpfCadastro = sessao.cadastro;
//   const link = await RegistrationLinkHelper(cpfCadastro, integracao);
//   ticket.update({
//     status: "closed",
//     closedAt: new Date().getTime(),
//     lastInteractionBot: new Date(),
//   });
//   sessao.errosResponse = 0;
//   return `🤖 Clique no link para se cadastrar:\n\n${link}\n\nO link irá expirar em 15minutos.\nEsse atendimento sera encerrado.`;
// }

// export async function handleServicoEscolhido({
//   ticket,
//   sessao,
// }: ActionHandlerParams) {
//   ticket.update({
//     botRetries: 0,
//     lastInteractionBot: new Date(),
//   });
//   sessao.errosResponse = 0;
//   const servicosDisponiveis = ["Agendamentos", "Laudos"];
//   return generateServiceSelectionMessage(servicosDisponiveis, ticket.channel);
// }

// export async function handleAgendamentos({
//   integracao,
//   ticket,
//   sessao,
// }: ActionHandlerParams) {
//   PREVIOUS_STEPID = ticket.stepChatFlow;
//   ticket.update({
//     lastInteractionBot: new Date(),
//   });
//   sessao.errosResponse = 0;
//   sessao.listaAgendamentos = await ConsultaAgendamentosHelper({
//     ticket,
//     codPaciente: sessao.dadosPaciente.cd_paciente,
//     integracao,
//     sessao,
//   });

//   if (
//     Array.isArray(sessao.listaAgendamentos) &&
//     sessao.listaAgendamentos.length > 0
//   ) {
//     return generateAppointmentListMessage(sessao.listaAgendamentos);
//   } else {
//     return generateNoAppointmentMessage();
//   }
// }

// export async function handleLaudo({
//   integracao,
//   ticket,
//   sessao,
// }: ActionHandlerParams) {
//   ticket.update({
//     lastInteractionBot: new Date(),
//   });

//   sessao.errosResponse = 0;
//   sessao.listaAtendimentos = await ConsultaAtendimentosHelper({
//     integracao,
//     codigoPaciente: sessao.dadosPaciente.cd_paciente,
//     token: sessao.dadosPaciente.ds_token,
//   });
//   if (
//     Array.isArray(sessao.listaAtendimentos) &&
//     sessao.listaAtendimentos.length
//   ) {
//     return generateLaudoListMessage(sessao.listaAtendimentos);
//   } else {
//     return generateNoLaudoMessage();
//   }
// }

// export async function handleLaudoPdf({
//   integracao,
//   ticket,
//   msg,
//   sessao,
// }: ActionHandlerParams) {
//   ticket.update({
//     lastInteractionBot: new Date(),
//   });
//   sessao.errosResponse = 0;
//   const selectedLaudo = sessao.listaAtendimentos![+ticket.lastMessage - 1];
//   await GetLaudoHelper({
//     cdExame: +selectedLaudo!.cd_exame,
//     integracao,
//     ticket,
//     exame: selectedLaudo!.ds_procedimento,
//     cdPaciente: sessao.dadosPaciente.cd_paciente,
//   });

//   return generateLaudoPdfMessage();
// }

// export async function handlePreparo({ ticket, sessao }: ActionHandlerParams) {
//   ticket.update({
//     lastInteractionBot: new Date(),
//   });
//   sessao.errosResponse = 0;
//   // Assuming listaAgendamentos is accessible here, or passed as a parameter
//   // For now, I'll assume it's a global or passed in a more refactored way.
//   // This needs to be properly managed in the main dispatcher.
//   return generatePreparoSelectionMessage(
//     sessao.listaAgendamentos!,
//     ticket.channel
//   );
//   // return "Preparo ainda não implementado completamente."; // Placeholder
// }

// export async function handleSendPreparo({
//   integracao,
//   ticket,
//   msg,
//   sessao,
// }: ActionHandlerParams) {
//   ticket.update({
//     lastInteractionBot: new Date(),
//   });
//   sessao.errosResponse = 0;
//   let procedimento: string = "";
//   if (msg.msg.type === "reply_markup") {
//     procedimento = msg.msg.body.toLowerCase().trim().split("_")[1];
//   }
//   if (msg.msg.type === "list_response") {
//     procedimento = String(msg.msg.listResponse.singleSelectReply.selectedRowId)
//       .toLowerCase()
//       .trim()
//       .split("_")[1] as string;
//   }
//   const cdProcedimento = procedimento.split(";");
//   const data = await Promise.all(
//     cdProcedimento.map(async (procedimento) => {
//       return await GetPreparoHelper(procedimento, integracao, ticket);
//     })
//   );
//   return generateSendPreparoMessage(data);
// }
// export async function handleConfirmarExame({
//   ticket,
//   sessao,
//   integracao,
// }: ActionHandlerParams) {
//   const exameParaConfirmar =
//     sessao.listaAgendamentos![+ticket.lastMessage - 1].cd_atendimento;
//   const responseCofirmacao = await ConfirmarHelper({
//     integracao,
//     cdAtendimento: exameParaConfirmar,
//   });
//   return generateConfirmaMessage(responseCofirmacao);
// }
// export async function handleConfirmarExame({
//   ticket,
//   sessao,
//   integracao,
// }: ActionHandlerParams) {
//   const agendamentos = sessao.listaAgendamentos;

//   if (!agendamentos || agendamentos.length === 0) {
//     ticket.update({
//       stepChatFlow: PREVIOUS_STEPID,

//       lastInteractionBot: new Date(),
//     });
//     sessao.errosResponse = sessao.errosResponse + 1;
//     // return "❌ Nenhum exame disponível para confirmação.";
//     return (
//       "❌ Nenhum exame disponível para confirmação.\n\n" +
//       "📞 9 - Falar com o suporte.\n" +
//       "🔄 6 - Retornar ao menu.\n" +
//       "❌ 7 - Encerrar o atendimento.\n\n" +
//       "_Digite o número da opção desejada_."
//     );
//   }

//   const escolhaUsuario = Number(ticket.lastMessage);

//   if (
//     isNaN(escolhaUsuario) ||
//     escolhaUsuario < 1 ||
//     escolhaUsuario > agendamentos.length
//   ) {
//     ticket.update({
//       stepChatFlow: PREVIOUS_STEPID,

//       lastInteractionBot: new Date(),
//     });
//     sessao.errosResponse = sessao.errosResponse + 1;
//     return `❌ Opção inválida. Por favor, escolha um número de 1 a ${agendamentos.length} para confirmar seu agendamento.`;
//   }

//   const exameParaConfirmar = agendamentos[escolhaUsuario - 1]!.cd_atendimento;
//   sessao.errosResponse = 0;
//   const responseCofirmacao = await ConfirmarHelper({
//     integracao,
//     cdAtendimento: exameParaConfirmar,
//   });
//   PREVIOUS_STEPID = ticket.stepChatFlow;
//   return generateConfirmaMessage(responseCofirmacao);
// }
// export async function handleAgendamentoExame({
//   ticket,
//   integracao,
//   sessao,
// }: ActionHandlerParams) {
//   ticket.update({
//     lastInteractionBot: new Date(),
//   });
//   sessao.errosResponse = 0;
//   const existeUnidadesRedis = await redisClient.exists("ListaUnidades");

//   if (!existeUnidadesRedis) {
//     const unidades = await AgendarExameHelpers.ListarUnidades(
//       integracao,
//       sessao.dadosPaciente.ds_token
//     );
//     await redisClient.set(
//       "ListaUnidades",
//       JSON.stringify(unidades),
//       "EX",
//       3600
//     );
//     sessao.listaUnidades = unidades;
//     listaUnidades = unidades;
//   } else {
//     const unidadesRedis = await redisClient.get("ListaUnidades");
//     sessao.listaUnidades = JSON.parse(unidadesRedis!);
//     listaUnidades = sessao.listaUnidades;
//   }
//   const existePlanosRedis = await redisClient.exists("ListaPlanos");

//   if (!existePlanosRedis) {
//     const planos = await AgendarExameHelpers.ListarPlanos(
//       integracao,
//       sessao.dadosPaciente.ds_token
//     );
//     await redisClient.set("ListaPlanos", JSON.stringify(planos), "EX", 3600);

//     sessao.listaPlanos = planos;
//   } else {
//     const planosRedis = await redisClient.get("ListaPlanos");
//     sessao.listaPlanos = JSON.parse(planosRedis!);
//   }

//   return generateAgendamentoMessage(ticket.channel, sessao.listaUnidades);
// }
// export function handleSelecionarUnidade({
//   sessao,
//   ticket,
//   msg,
// }: ActionHandlerParams) {
//   PREVIOUS_STEPID = ticket.stepChatFlow;
//   ticket.update({
//     lastInteractionBot: new Date(),
//   });
//   sessao.errosResponse = 0;
//   let unidade: any;
//   if (msg.msg.type === "reply_markup") {
//     unidade = msg.msg.body.toLowerCase().trim().split("_")[1];
//   }
//   if (msg.msg.type === "list_response") {
//     unidade = String(msg.msg.listResponse.singleSelectReply.selectedRowId)
//       .toLowerCase()
//       .trim()
//       .split("_")[1];
//   }
//   if (!sessao.unidadeSelecionada) {
//     sessao.unidadeSelecionada = unidade;
//   }

//   return "🤖 Digite o nome do seu plano de saúde para que possamos encontrar as opções corretas.";
// }

// export function handleGetPlanos({
//   input,
//   ticket,
//   sessao,
// }: ActionHandlerParams) {
//   const plano = input;
//   const options = {
//     keys: ["ds_plano"],
//     threshold: 0.4, // 0 = exato, 1 = qualquer coisa. 0.3–0.4 é um bom valor.
//     includeScore: true,
//   };
//   const pesquisaFuse = fuseSearch(sessao.listaPlanos, plano, options);
//   if (!pesquisaFuse) {
//     ticket.update({
//       stepChatFlow: PREVIOUS_STEPID,

//       lastInteractionBot: new Date(),
//     });
//     sessao.errosResponse = sessao.errosResponse + 1;
//     return "🤖 O nome do plano está muito curto. Tente digitar o nome completo ou uma parte mais significativa dele.";
//   }
//   if (pesquisaFuse.length === 0) {
//     ticket.update({
//       stepChatFlow: PREVIOUS_STEPID,

//       lastInteractionBot: new Date(),
//     });
//     sessao.errosResponse = sessao.errosResponse + 1;
//     return "🤖 Ops! Não localizamos nenhum plano com base no que foi digitado. Por favor, revise as informações e tente novamente.";
//   }
//   PREVIOUS_STEPID = ticket.stepChatFlow;
//   sessao.errosResponse = 0;
//   return generatePlanosMessage(ticket.channel, pesquisaFuse);
// }

// export async function handleObsPlanoSelecionado({
//   ticket,
//   msg,
//   integracao,
//   sessao,
// }: ActionHandlerParams) {
//   ticket.update({
//     lastInteractionBot: new Date(),
//   });
//   sessao.errosResponse = 0;
//   let cdPlano: number = 0;

//   if (msg.msg.type === "reply_markup") {
//     cdPlano = msg.msg.body.toLowerCase().trim().split("_")[1];
//   }
//   if (msg.msg.type === "list_response") {
//     cdPlano = msg.msg.listResponse.singleSelectReply.selectedRowId
//       .toLowerCase()
//       .trim()
//       .split("_")[1];
//   }

//   const ListaProcedimentoEmpresa = await redisClient.exists(
//     `${sessao.unidadeSelecionada}:Procedimentos`
//   );

//   if (!ListaProcedimentoEmpresa) {
//     const listaProcedimentos = await AgendarExameHelpers.getListaProcedimento({
//       integracao,
//       cdPlano,
//       cdEmpresa: sessao.unidadeSelecionada,
//       token: sessao.dadosPaciente.ds_token,
//     });
//     await redisClient.set(
//       `${sessao.unidadeSelecionada}:Procedimentos`,
//       JSON.stringify(listaProcedimentos),
//       "EX",
//       3600
//     );

//     sessao.listaExames = listaProcedimentos;
//   } else {
//     const listaProcedimentosRedis = await redisClient.get(
//       `${sessao.unidadeSelecionada}:Procedimentos`
//     );
//     sessao.listaExames = JSON.parse(listaProcedimentosRedis!);
//   }

//   sessao.planoSelecionado = cdPlano;
//   const existeObsPlanoSelecionado = await redisClient.exists(`Pdf:${cdPlano}`);

//   if (!existeObsPlanoSelecionado) {
//     const obsPlano = await AgendarExameHelpers.ObsplanoAsync({
//       integracao,
//       cdPlano,
//       token: sessao.dadosPaciente.ds_token,
//     });

//     if (!obsPlano) {
//       await redisClient.del(`Pdf:${cdPlano}`);
//       return generateObsPlanoSelecionado(obsPlano, ticket.channel);
//     } else {
//       await redisClient.set(`Pdf:${cdPlano}`, obsPlano, "EX", 3600);
//     }

//     const linkPDF = await generateLinkPdf(cdPlano, integracao); //`https://seuservidor.com/pdf/${cdPlano}`;
//     return generateObsPlanoSelecionado(linkPDF, ticket.channel);
//   } else {
//     const obsPlanoRedis = await redisClient.get(`Pdf:${cdPlano}`);

//     if (!obsPlanoRedis) {
//       return generateObsPlanoSelecionado(!obsPlanoRedis, ticket.channel);
//     }

//     const linkPDF = await generateLinkPdf(cdPlano, integracao); //`https://seuservidor.com/pdf/${cdPlano}`;
//     return generateObsPlanoSelecionado(linkPDF, ticket.channel);
//   }

//   // return generateObsPlanoSelecionado(obsPlano, ticket.channel);
// }
// export function handlePesquisaExame({ ticket }: ActionHandlerParams) {
//   PREVIOUS_STEPID = ticket.stepChatFlow;
//   return false;
// }
// export function handleSelectProcedimento({
//   ticket,
//   input,
//   sessao,
// }: ActionHandlerParams) {
//   const options = {
//     keys: ["ds_procedimento"],
//     threshold: 0.4, // 0 = exato, 1 = qualquer coisa. 0.3–0.4 é um bom valor.
//     includeScore: true,
//   };
//   const pesquisaProcedimentosResultados = fuseSearch(
//     sessao.listaExames,
//     input,
//     options
//   );
//   if (!pesquisaProcedimentosResultados) {
//     ticket.update({
//       stepChatFlow: PREVIOUS_STEPID,

//       lastInteractionBot: new Date(),
//     });
//     sessao.errosResponse = sessao.errosResponse + 1;
//     return "🤖 O nome do procedimento está muito curto. Tente digitar o nome completo ou uma parte mais significativa dele.";
//   }
//   sessao.errosResponse = 0;
//   return generateProcedimentosMessage(
//     ticket.channel,
//     ticket,
//     pesquisaProcedimentosResultados,
//     PREVIOUS_STEPID!
//   );
// }

// export function handleLoopProcedimentos({
//   ticket,
//   sessao,
//   msg,
//   input,
// }: ActionHandlerParams) {
//   ticket.update({
//     lastInteractionBot: new Date(),
//   });
//   sessao.errosResponse = 0;
//   let medicoSelecionado: any;
//   if (msg.msg.type === "reply_markup") {
//     medicoSelecionado = msg.msg.body.toLowerCase().trim().split("_")[1];
//   }
//   if (msg.msg.type === "list_response") {
//     medicoSelecionado = String(
//       msg.msg.listResponse.singleSelectReply.selectedRowId
//     )
//       .toLowerCase()
//       .trim()
//       .split("_")[1];
//   }
//   if (!sessao.medicosSelecionados) {
//     sessao.medicosSelecionados = {};
//   }

//   const cdModalidade = Number(sessao.ultimoExameSelecionado?.cdModalidade);
//   if (medicoSelecionado) {
//     sessao.medicosSelecionados[cdModalidade] = medicoSelecionado;
//   }
//   return generateMessagemLoopExames(ticket.channel);
//   return `Perfeito! Você deseja agendar mais algum outro exame?
// Caso sim, basta digitar 'Sim'.
// Se não, digite 'Não' para que possamos prosseguir com o agendamento.`;
// }

// export async function handlePreparoAutoAgendamento({
//   ticket,
//   integracao,
//   sessao,
// }: ActionHandlerParams) {
//   ticket.update({
//     lastInteractionBot: new Date(),
//   });

//   const examesUnicos = sessao.examesParaAgendar.filter(
//     (exame, index, self) => index === self.findIndex((e) => e.id === exame.id)
//   );
//   const data = await Promise.all(
//     examesUnicos.map(async (procedimento) => {
//       return await GetPreparoHelper(procedimento, integracao, ticket);
//     })
//   );
//   return generatePreparoAutoAgedamentoMessage(ticket.channel, data);
// }

// export function handleSelectPeriodo({ ticket }: ActionHandlerParams) {
//   ticket.update({
//     botRetries: 0,
//     lastInteractionBot: new Date(),
//   });
//   const periodos = ["Manha", "Tarde", "Noite"];
//   return generatePeriodoMessage(periodos, ticket.channel);
// }
// export const handleIntervalos = ({ msg, ticket }: ActionHandlerParams) => {
//   ticket.update({
//     botRetries: 0,
//     lastInteractionBot: new Date(),
//   });
//   let periodo: any;
//   if (msg.msg.type === "reply_markup") {
//     periodo = msg.msg.body.toLowerCase().trim().split("_")[1];
//   }
//   if (msg.msg.type === "list_response") {
//     periodo = String(msg.msg.listResponse.singleSelectReply.selectedRowId)
//       .toLowerCase()
//       .trim()
//       .split("_")[1];
//   }
//   const intervalos = gerarIntervalosPorPeriodo(periodo);
//   return generateIntervaloHorarioMessage(ticket.channel, intervalos);
// };

// export function handleConfirmarHorarioAutoAgendamento({
//   msg,
//   sessao,
// }: ActionHandlerParams) {
//   let intervaloSelecionado: any;
//   if (msg.msg.type === "reply_markup") {
//     intervaloSelecionado = msg.msg.body.toLowerCase().trim().split("_")[1];
//   }
//   if (msg.msg.type === "list_response") {
//     intervaloSelecionado = String(
//       msg.msg.listResponse.singleSelectReply.selectedRowId
//     )
//       .toLowerCase()
//       .trim()
//       .split("_")[1];
//   }
//   sessao.intervaloSelecionado = intervaloSelecionado;
//   const message = `🤖 Podemos proseguir com a pesquisa de horarios para o intervalo ${intervaloSelecionado}\n
// 1 - Continuar.
// 2 - Cancelar.
// _Digite o número da opção desejada_.`;
//   return message;
// }

// export async function handlePesquisaHorarios({
//   ticket,
//   msg,
//   sessao,
//   integracao,
// }: ActionHandlerParams) {
//   ticket.update({
//     lastInteractionBot: new Date(),
//   });
//   let proximaSemana: any;
//   if (msg.msg.type === "reply_markup") {
//     proximaSemana = msg.msg.body.toLowerCase().trim();
//   }
//   if (msg.msg.type === "list_response") {
//     proximaSemana = String(msg.msg.listResponse.singleSelectReply.selectedRowId)
//       .toLowerCase()
//       .trim();
//   }
//   if (proximaSemana === "next") {
//     const dataBase = parse(sessao.ultimaDataConsulta, "dd/MM/yyyy", new Date());
//     sessao.ultimaDataConsulta = format(addDays(dataBase, 7), "dd/MM/yyyy");
//   } else if (proximaSemana === "mais") {
//     // Se não for next, você pode resetar para a data atual (se quiser)
//     sessao.intervaloSelecionado = adicionarMinutos(
//       sessao.intervaloSelecionado,
//       20
//     );
//   }
//   const now = sessao.ultimaDataConsulta;
//   const dadosParaPesquisa = {
//     tokenPaciente: sessao.dadosPaciente.ds_token,
//     cd_paciente: sessao.dadosPaciente.cd_paciente,
//     dt_data: now,
//     dt_hora: sessao.intervaloSelecionado,
//     dt_hora_fim: "23:59",
//     js_exame: montarJsonAgendaSemanal(sessao),
//   };
//   const pesquisaHorarioResponse = await AgendarExameHelpers.doAgendaSemanal({
//     integracao,
//     dadosPesquisa: dadosParaPesquisa,
//     token: sessao.dadosPaciente.ds_token,
//   });
//   return generateHorariosDisponivelMessage(
//     pesquisaHorarioResponse,
//     ticket.channel
//   );
// }
// export async function handleConfirmarAutoAgendamento({
//   ticket,
//   msg,
//   sessao,
//   integracao,
// }: ActionHandlerParams) {
//   ticket.update({
//     lastInteractionBot: new Date(),
//   });

//   let cd_horario: any;
//   if (msg.msg.type === "reply_markup") {
//     cd_horario = msg.msg.body.split("_")[1];
//   }
//   if (msg.msg.type === "list_response") {
//     cd_horario = String(msg.msg.listResponse.singleSelectReply.selectedRowId)
//       .toLowerCase()
//       .split("_")[1];
//   }
//   const horarioSelecionado = await obterHorarioRedis(cd_horario);
//   sessao.horarioSelecionado = horarioSelecionado;
//   sessao.cdHorario = cd_horario;
//   const dadosDoAgendaHorario = {
//     tokenPaciente: sessao.dadosPaciente.ds_token,
//     cd_paciente: sessao.dadosPaciente.cd_paciente,
//     dt_data: horarioSelecionado.dia,
//     dt_hora: horarioSelecionado.hora,
//     dt_hora_fim: "23:59",
//     js_exame: montarJsonAgendaSemanal(sessao),
//   };
//   const horario = await AgendarExameHelpers.doAgendaHorario({
//     integracao,
//     dadosPesquisa: dadosDoAgendaHorario,
//     token: sessao.dadosPaciente.ds_token,
//   });
//   if (horario) {
//     const dadosAgendamento = {
//       dataHorario: horarioSelecionado,
//       exame: sessao.listaExames
//         .filter((exame) =>
//           sessao.examesParaAgendar.some(
//             (exameAgendar) => +exameAgendar === exame.cd_procedimento
//           )
//         )
//         .map((exame) => exame.ds_procedimento),
//       unidade: sessao.listaUnidades
//         .filter((unidade) => unidade.cd_empresa === +sessao.unidadeSelecionada)
//         .map((empresa) => ({
//           em: empresa.ds_empresa,
//           endereco: empresa.ds_endereco,
//         }))[0],
//       sessao,
//     };
//     return generateConfirmarHorarioDisponivelMessage(dadosAgendamento);
//   }
// }

// export async function handleConcluirAgendamento({
//   ticket,
//   sessao,
//   integracao,
// }: ActionHandlerParams) {
//   ticket.update({
//     lastInteractionBot: new Date(),
//   });

//   const cd_horario = await obterHorarioRedis(sessao.cdHorario);
//   const dadosDoAgendaHorario = {
//     cd_horario: cd_horario.codigos,
//     tokenPaciente: sessao.dadosPaciente.ds_token,
//     cd_paciente: sessao.dadosPaciente.cd_paciente,
//     dt_data: sessao.horarioSelecionado.dia,
//     dt_hora: sessao.horarioSelecionado.hora,
//     dt_hora_fim: "23:59",
//     js_exame: montarJsonAgendaSemanal(sessao),
//   };

//   const responseConcluirAgendamento = await AgendarExameHelpers.doAgendaPost({
//     integracao,
//     dadosPesquisa: dadosDoAgendaHorario,
//   });
//   return generateConcluirAgendamento(responseConcluirAgendamento);
// }

// export async function handlePrecoExame({
//   ticket,
//   integracao,
//   sessao,
//   msg,
// }: ActionHandlerParams) {
//   let exame: any;
//   let medicoExame = false;
//   let precoExame = { nr_vl_particular: "0" };

//   if (msg.msg.type === "reply_markup") {
//     exame = msg.msg.body.toLowerCase().trim().split("_")[1];
//   }
//   if (msg.msg.type === "list_response") {
//     exame = String(msg.msg.listResponse.singleSelectReply.selectedRowId)
//       .toLowerCase()
//       .trim()
//       .split("_")[1];
//   }
//   const dadosExame = sessao.listaExames.find(
//     (exameItem) => Number(exameItem.cd_procedimento) === Number(exame)
//   );

//   const modalidade = dadosExame?.cd_modalidade;
//   // Verifica se essa modalidade já foi usada em exames anteriores
//   // Verifica se a modalidade já foi usada no último exame selecionado
//   const modalidadeJaSelecionada =
//     sessao.ultimoExameSelecionado?.cdModalidade === modalidade;

//   sessao.examesParaAgendar.push(exame);

//   // ver se exame tem opcao de preferencia medica

//   try {
//     const medicos = await ListaMedicosHelper({
//       cdProcedimento: exame,
//       integracao,
//       token: sessao.dadosPaciente.ds_token,
//       cdEmpresa: sessao.unidadeSelecionada,
//     });
//     precoExame = await ConsultaPrecoExameHelper({
//       cdProcedimento: exame,
//       sessao: sessao,
//       integracao,
//     });

//     if (
//       Array.isArray(medicos) &&
//       medicos.length > 0 &&
//       !modalidadeJaSelecionada
//     ) {
//       medicoExame = true;
//       sessao.examesComMedicos.push({
//         cd_procedimento: exame,
//         medicos,
//       });
//       if (!sessao.ultimoExameSelecionado) {
//         sessao.ultimoExameSelecionado = {};
//       }
//       sessao.ultimoExameSelecionado = {
//         cdProcedimento: exame,
//         cdModalidade: modalidade,
//       };
//     }
//   } catch (error) {
//     console.error(`Erro ao buscar médicos para o exame ${exame.nome}`, error);
//   }

//   const valor = parseFloat(precoExame.nr_vl_particular.replace(",", "."));

//   if (!isNaN(valor) && valor > 0) {
//     sessao.valorTotalExames += valor;
//   }

//   return generatePrecoExameMensagem(
//     ticket.channel,
//     precoExame.nr_vl_particular,
//     medicoExame
//   );
// }
// export async function handleListaMedicoExames({
//   sessao,
//   ticket,
// }: ActionHandlerParams) {
//   const exame_agendar = examesUnico(sessao);
//   const medicosPorExame = [];
//   for (const exame of exame_agendar) {
//     const dadosMedicos = sessao.examesComMedicos.find(
//       (item) => Number(item.cd_procedimento) === exame.cd_procedimento
//     );
//     if (dadosMedicos && Array.isArray(dadosMedicos.medicos)) {
//       for (const medico of dadosMedicos.medicos) {
//         medicosPorExame.push({
//           ds_procedimento: exame.ds_procedimento,
//           cd_medico: medico.cd_medico,
//           ds_medico: medico.ds_medico,
//         });
//       }
//     }
//   }

//   return generateListagemMedicoExame(ticket.channel, medicosPorExame);
// }
// export function handlePreferenciaMedica({ msg, sessao }: ActionHandlerParams) {
//   let preferenciaMeidco: any = 0;
//   if (msg.msg.type === "reply_markup") {
//     preferenciaMeidco = msg.msg.body.split("_")[1];
//   }
//   if (msg.msg.type === "list_response") {
//     preferenciaMeidco = String(
//       msg.msg.listResponse.singleSelectReply.selectedRowId
//     )
//       .toLowerCase()
//       .split("_")[1];
//   }
//   const exame = sessao.ultimoExameSelecionado;
//   if (!sessao.medicosSelecionados) {
//     sessao.medicosSelecionados = { id: 0, cdMedico: 0 };
//   }
//   if (!sessao.medicosSelecionados[exame]) {
//     sessao.medicosSelecionados[exame] = preferenciaMeidco;
//   }

//   return "handlePreferenciaMedica";
// }
