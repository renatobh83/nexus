import { Ticket } from "@prisma/client";
import { getFastifyApp } from "../../api";
import {
  SemEmpresaAssociadoWpp,
  SemEmpresaAssociadoTbot,
  TemplateMessage,
} from "../../api/helpers/Templates/optionsListMessagens";
import {
  TemplateChamadoSelecaoTbot,
  TemplateEmpresaSelecaoTbot,
} from "../../api/helpers/Templates/Telegram";
import {
  TemplateChamadoSelecaoWpp,
  TemplateEmpresaSelecaoWpp,
} from "../../api/helpers/Templates/WhatsApp";
import { getCache, REDIS_KEYS, setCache } from "../../ultis/redisCache";

// 1. A função deve ser async para usar await
export const flows = async (action: string, ticket: Ticket, msg: any) => {
  console.log(action);
  switch (action.toLocaleLowerCase().trim()) {
    case "consultar":
      const empresasForContato =
        await getFastifyApp().services.empresaService.EmpresasContato(
          ticket.contactId
        );

      if (empresasForContato.length === 0) {
        if (ticket.channel === "whatsapp") {
          return SemEmpresaAssociadoWpp([
            {
              rowId: "suporte",
              title: "Falar no suporte.",
              description: "🏷️ Falar no suporte.",
            },
            {
              rowId: "3",
              title: "Finalizar atendimento.",
              description: "❌ Finalizando o seu atendimento.",
            },
          ]);
        } else if (ticket.channel === "telegram") {
          const rows = [
            [
              {
                callback_data: "suporte",
                text: "🏷️ Falar no suporte",
              },
            ],
          ];
          rows.push([
            {
              callback_data: "3",
              text: "❌ Finalizar Atendimento",
            },
          ]);

          return SemEmpresaAssociadoTbot(rows);
        }
      } else if (empresasForContato.length > 1) {
        if (ticket.channel === "whatsapp") {
          return TemplateEmpresaSelecaoWpp(empresasForContato);
        } else if (ticket.channel === "telegram") {
          return TemplateEmpresaSelecaoTbot(empresasForContato);
        }
      }
      break;
    case "empresaselecionada":
      if (ticket.channel === "whatsapp") {
        const idEmpresa =
          msg.msg.listResponse.singleSelectReply.selectedRowId.split("_")[1];
        const chamadosRecente =
          await getFastifyApp().services.chamadoService.chamadosEmpresaContato(
            parseInt(idEmpresa),
            ticket.contactId
          );
        return TemplateChamadoSelecaoWpp(chamadosRecente);
      } else if (ticket.channel === "telegram") {
        const idEmpresa = msg.msg.body.split("_")[1];
        const chamados =
          await getFastifyApp().services.chamadoService.chamadosEmpresaContato(
            parseInt(idEmpresa),
            ticket.contactId
          );
        return TemplateChamadoSelecaoTbot(chamados);
      }
      break;
    case "consultachamado":
      if (!msg.msg) {
        const PREVIOUS_STEPID = await getCache(
          REDIS_KEYS.previousStepId(ticket.id)
        );
        await getFastifyApp().services.ticketService.updateTicket(ticket.id, {
          stepChatFlow: PREVIOUS_STEPID!,
          botRetries: ticket.botRetries! + 1,
          lastInteractionBot: new Date(),
        });
      }
      await setCache(REDIS_KEYS.previousStepId(ticket.id), ticket.stepChatFlow);
      const chamadoId =
        msg.msg.listResponse?.singleSelectReply.selectedRowId.split("_")[1] ||
        msg.msg.body.split("_")[1];
      const chamadoDetails =
        await getFastifyApp().services.chamadoService.findById(
          parseInt(chamadoId)
        );
      return TemplateMessage(chamadoDetails);
      break;
  }
};
