import {
  Step,
  StepCondition,
  ConditionType,
} from "../../core/Tickets/tickets.type";

/**
 * Verifica se a mensagem do usuário é uma resposta válida para as condições do passo atual do fluxo.
 * @param msg A mensagem recebida.
 * @param step O passo atual do ChatFlow do ticket.
 * @returns `true` se a resposta for válida, `false` caso contrário.
 */
export const isValidFlowAnswer = (msg: any, step: Step): boolean => {
  // Extrai o corpo da mensagem de forma padronizada
  const getBody = (m: any): string => {
    if (m.type === "reply_markup") return m.body.toLowerCase().trim();
    if (m.type === "list_response")
      return String(m.listResponse.singleSelectReply.selectedRowId)
        .toLowerCase()
        .trim();
    return String(m.body).toLowerCase().trim();
  };

  const messageBody = getBody(msg);
  const conditions = step.data.conditions;

  // Procura por uma condição que corresponda à mensagem do usuário.
  const foundCondition = conditions.find((condition: StepCondition) => {
    // Ignora condições automáticas, pois elas não dependem da entrada do usuário.
    if (condition.type === ConditionType.Automatic) {
      return false;
    }

    // // A condição 'UserSelection' pode ser um fallback, mas aqui queremos uma correspondência explícita.
    // // Vamos considerar que ela não valida uma resposta específica, a menos que não haja outras.
    if (condition.type === ConditionType.UserSelection) {
      return false; // Normalmente, não valida uma resposta específica.
    }

    // Verifica se a mensagem corresponde a alguma das palavras-chave da condição.
    return condition.condition?.some((c: any) =>
      messageBody.startsWith(String(c).toLowerCase().trim())
    );
  });

  // Se uma condição correspondente foi encontrada, a resposta é válida.
  return !!foundCondition;
};
