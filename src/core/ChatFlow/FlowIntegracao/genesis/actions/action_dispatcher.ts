import { Ticket } from "@prisma/client";
import { SessaoUsuario } from "../../../../IGenesis/types";
import * as ActionHandlers from "./action_handlers";

interface DispatcherParams {
  action: string;
  integracao: any;
  ticket: Ticket;
  msg: any;
  sessao: SessaoUsuario;
  input: string;
}

export async function dispatchAction({
  action,
  integracao,
  ticket,
  msg,
  sessao,
  input,
}: DispatcherParams) {
  switch (action) {
    case "Inicio":
      return ActionHandlers.handleInicioNode({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });
    case "consulta":
      return ActionHandlers.handleConsulta({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });
    case "recuperar":
      return ActionHandlers.handleRecuperar({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });

    case "solicitarSenha":
      return ActionHandlers.handleSolicitarSenha({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });
    case "servicoescolhido":
      return ActionHandlers.handleServicoEscolhido({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });
    // case "linkcadastro":
    //   return ActionHandlers.handleLinkCadastro({
    //     integracao,
    //     ticket,
    //     msg,
    //     sessao,
    //     input,
    //   });
    case "agendamentos":
      return ActionHandlers.handleAgendamentos({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });
    case "laudo":
      return ActionHandlers.handleLaudo({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });

    case "laudopdf":
      return ActionHandlers.handleLaudoPdf({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });
    case "preparo":
      return ActionHandlers.handlePreparo({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });
    case "sendpreparo":
      return ActionHandlers.handleSendPreparo({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });
    case "confirmar":
      return ActionHandlers.handleConfirmarExame({
        ticket,
        integracao,
        input,
        msg,
        sessao,
      });
    case "agendar":
    case "marcar":
    case "agendamento":
      return ActionHandlers.handleAgendamentoExame({
        ticket,
        integracao,
        input,
        msg,
        sessao,
      });
    case "selecionarPlano":
      return ActionHandlers.handleSelecionarUnidade({
        ticket,
        integracao,
        input,
        msg,
        sessao,
      });
    case "getPlano":
      return ActionHandlers.handleGetPlanos({
        ticket,
        integracao,
        input,
        msg,
        sessao,
      });

    case "Obsplano":
      return ActionHandlers.handleObsPlanoSelecionado({
        ticket,
        integracao,
        input,
        msg,
        sessao,
      });
    case "pesquisaexame":
      return ActionHandlers.handlePesquisaExame({
        ticket,
        integracao,
        input,
        msg,
        sessao,
      });
    case "procedimento":
      return ActionHandlers.handleSelectProcedimento({
        ticket,
        integracao,
        input,
        msg,
        sessao,
      });
    case "loop":
      return ActionHandlers.handleLoopProcedimentos({
        ticket,
        integracao,
        input,
        msg,
        sessao,
      });

    case "precoexame":
      return ActionHandlers.handlePrecoExame({
        ticket,
        integracao,
        input,
        msg,
        sessao,
      });
    case "examesmedico":
      return ActionHandlers.handleListaMedicoExames({
        ticket,
        integracao,
        input,
        msg,
        sessao,
      });
    case "preparoAgendamento":
      return ActionHandlers.handlePreparoAutoAgendamento({
        ticket,
        integracao,
        input,
        msg,
        sessao,
      });
    case "periodo":
      return ActionHandlers.handleSelectPeriodo({
        input,
        integracao,
        msg,
        sessao,
        ticket,
      });
    case "intervalo":
      return ActionHandlers.handleIntervalos({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });
    case "confirmaintervalo":
      return ActionHandlers.handleConfirmarHorarioAutoAgendamento({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });
    case "pesquisaHorarios":
      return ActionHandlers.handlePesquisaHorarios({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });
    case "confirmarHorario":
      return ActionHandlers.handleConfirmarAutoAgendamento({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });
    case "concluiragendamento":
      return ActionHandlers.handleConcluirAgendamento({
        integracao,
        ticket,
        msg,
        sessao,
        input,
      });
    default:
      return "Ação desconhecida.";
  }
}
