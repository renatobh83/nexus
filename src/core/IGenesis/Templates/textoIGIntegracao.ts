export const bodyMessage = (
  randomGreeting: string,
  plural: string,
  ticket: { atendimentoData: any },
  horarioTexto: string
) => {
  return `${randomGreeting}
Nós, da *Clínica Lume*, temos um importante lembrete pra você:
🗓 Você tem ${plural} na nossa clínica.
Seu atendimento está agendado para o dia *${ticket.atendimentoData}* ${horarioTexto}.
⚠ *Importante*:
  - Paciente deverá apresentar pedido médico, carteira do convênio e documento de identificação com foto.
  - Trazer todos os exames anteriores realizados da área a ser examinada.`;
};

export const agendamentoConfirmadoComPreparo = `Seu agendamento foi confirmado com sucesso!

🏥 Para garantir que tudo ocorra bem, confira as instruções de preparo no arquivo anexado.`;
export const agendamentoConfirmadoSemPreparo = `Seu agendamento foi confirmado com sucesso!

Identificamos que um dos seus agendamentos não possui instruções de preparo.`;

export const respostaInvalidaConfirmacao =
  "Resposta inválida. Por favor, responda apenas com uma das opções da lista.";

export const menssagemFinalConfirmacao = `O processo de confirmação foi concluído com sucesso.
Caso tenha alguma dúvida ou precise de mais informações, entre em contato com a nossa central de atendimento.
Estamos à disposição para ajudá-lo!`;

export const agendamentoCancelado =
  "Seu exame foi cancelado com sucesso. Se precisar reagendar, entre em contato com nossa central de atendimento.";

export const erroConfirmacao = `Infelizamente não conseguimos confirmar o exame selecionado.
Favor entrar em contato com a nossa central para confirma o seu exame, estamos à disposição.`;
