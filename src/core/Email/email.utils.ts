const formatDate = (dateString: string) => {
  if (!dateString) return;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(dateString));
};

export const gerarTemplateEmail = (
  data: {
    comentario: string;
    chamado: any;
    assunto: any;
    tecnico: string;
    username: string;
  },
  user: { user: string }
) => {
  const comentario = data?.comentario;
  const idChamado = data?.chamado;
  const assunto = data?.assunto;
  const tecnico = data.tecnico;

  return `
    <html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
     <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellspacing="0" cellpadding="0" style="background: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <tr>
                        <td align="center" style="font-size: 18px; font-weight: bold; padding-bottom: 10px;">Detalhes do Chamado</td>
                    </tr>
                    <tr>
                        <td style="font-size: 14px; line-height: 1.6;">
                    <p>Olá ${user},</p>
                    <p>Seu chamado foi atualizado com as seguintes informações:</p>
                    <p><strong>ID do Chamado:</strong> ${idChamado}</p>
                    <p><strong>Assunto:</strong> ${assunto}</p>
                    <p><strong>Técnico Responsável:</strong> ${tecnico}</p>
                     <table width="100%" style="background: #f9f9f9; border-left: 4px solid #007bff; padding: 10px; margin-bottom: 10px;">
                    <tr><td>${
                      comentario.replace(/\n/g, "<br>") ||
                      "Nenhum comentário disponível"
                    }</td>
                    </tr>
                    </table>
                    <p>Caso tenha alguma dúvida ou precise de mais informações, estamos à disposição.</p>
                    <p>Atenciosamente,</p>
                    <p><strong>[Nome da Equipe/Suporte]</strong></p>
                  </td>
        </tr>
            <tr>
                        <td align="center" style="font-size: 12px; color: #555; padding-top: 15px; border-top: 1px solid #ddd;">
                            Este é um e-mail automático, por favor, não responda.
                        </td>
                    </tr>
    </table>
            </body>
        </html>
    `;
};

export const gerarTemplateEmailAnexo = (
  data: {
    chamado: any;
    assunto: any;
    tecnico: string;
    username: string;
    mensagem: string;
  },
  user: { user: string }
) => {
  const idChamado = data?.chamado;
  const assunto = data?.assunto;
  const tecnico = data.tecnico;

  return `
    <html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
     <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellspacing="0" cellpadding="0" style="background: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <tr>
                        <td align="center" style="font-size: 18px; font-weight: bold; padding-bottom: 10px;">Detalhes do Chamado</td>
                    </tr>
                    <tr>
                        <td style="font-size: 14px; line-height: 1.6;">
                    <p>Olá ${user},</p>
                    <p>Seu chamado foi atualizado com as seguintes informações:</p>
                    <p><strong>ID do Chamado:</strong> ${idChamado}</p>
                    <p><strong>Assunto:</strong> ${assunto}</p>
                    <p><strong>Técnico Responsável:</strong> ${tecnico}</p>
                     <table width="100%" style="background: #f9f9f9; border-left: 4px solid #007bff; padding: 10px; margin-bottom: 10px;">
                    <tr><td>${data.mensagem}</td>
                    </tr>
                    </table>
                    <p>Caso tenha alguma dúvida ou precise de mais informações, estamos à disposição.</p>
                    <p>Atenciosamente,</p>
                    <p><strong>[Nome da Equipe/Suporte]</strong></p>
                  </td>
        </tr>
            <tr>
                        <td align="center" style="font-size: 12px; color: #555; padding-top: 15px; border-top: 1px solid #ddd;">
                            Este é um e-mail automático, por favor, não responda.
                        </td>
                    </tr>
    </table>
            </body>
        </html>
    `;
};

export const gerarTemplateEmailOpen = (
  data: { descricao: string; id: any; assunto: any },
  user: { user: string }
) => {
  const descricao = data?.descricao;
  const idChamado = data?.id;
  const assunto = data?.assunto;

  return `
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
     <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellspacing="0" cellpadding="0" style="background: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <tr>
                        <td align="center" style="font-size: 18px; font-weight: bold; padding-bottom: 10px;">Chamado Registrado</td>
                    </tr>
                    <tr>
                        <td style="font-size: 14px; line-height: 1.6;">
           <p>Olá ${user},</p>
            <p>Seu chamado foi registrado com sucesso!</p>
            <p><strong>ID do Chamado:</strong> ${idChamado}</p>
            <p><strong>Assunto:</strong> ${assunto}</p>
            <p><strong>Descrição:</strong></p>
            <p>${descricao.replace(/\n/g, "<br>")}</p>
            <p>Em breve, nossa equipe entrará em contato para resolver sua solicitação.</p>
            <p>Atenciosamente,</p>
            <p><strong>[Nome da Equipe/Suporte]</strong></p>
         </td>
        </tr>
            <tr>
                        <td align="center" style="font-size: 12px; color: #555; padding-top: 15px; border-top: 1px solid #ddd;">
                            Este é um e-mail automático, por favor, não responda.
                        </td>
                    </tr>
    </table>
</body>
</html>

    `;
};

export const gerarTemplateEmailClose = (
  data: {
    comentarios: any[];
    descricao: string;
    chamado: any;
    assunto: any;
    createdAt: string;
    closedAt: string;
  },
  user: { user: string },
  conclusao: string
) => {
  const comentarios = data?.comentarios;
  const assunto = data?.assunto;
  const aberturaChamado = formatDate(data.createdAt);
  const fechamentoChamado = formatDate(data.closedAt);

  return `
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellspacing="0" cellpadding="0" style="background: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <tr>
                        <td align="center" style="font-size: 18px; font-weight: bold; padding-bottom: 10px;">Chamado Concluído</td>
                    </tr>
                    <tr>
                        <td style="font-size: 14px; line-height: 1.6;">
                            <p>Olá ${user},</p>
                            <p>Seu chamado foi encerrado com as seguintes informações:</p>
                            <p><strong>Assunto:</strong> ${assunto}</p>
                            <p><strong>Comentários Durante o Atendimento:</strong></p>
                            ${
                              comentarios && comentarios.length > 0
                                ? comentarios
                                    .filter(
                                      (c) =>
                                        c.emailEnviadoEm || c.mensagemEnviadoEm
                                    )
                                    .map(
                                      (comentario) => `
                <table width="100%" style="background: #f9f9f9; border-left: 4px solid #007bff; padding: 10px; margin-bottom: 10px;">
                                            <tr>
                                                <td style="font-size: 12px; color: #777;">📅 ${
                                                  comentario.date
                                                }</td>
                                            </tr>
                                            <tr>
                                                <td style="font-weight: bold;">${
                                                  comentario.author
                                                }</td>
                                            </tr>
                                            <tr>
                                                <td>${comentario.comentario.replace(
                                                  /\n/g,
                                                  "<br>"
                                                )}</td>
                                            </tr>
                                        </table>
                                    `
                                    )
                                    .join("")
                                : "<p>Nenhum comentário disponível</p>"
                            }
                            <p><strong>Conclusão:</strong></p>
                            <p>${
                              conclusao.replace(/\n/g, "<br>") ||
                              "Nenhuma conclusão fornecida"
                            }</p>
                            <p><strong>Abertura chamado:</strong> ${aberturaChamado}</p>
                            <p><strong>Concluído em:</strong> ${fechamentoChamado}</p>
                            <p>Agradecemos por entrar em contato conosco. Caso tenha novas dúvidas, estamos à disposição.</p>
                            <p>Atenciosamente,</p>
                            <p><strong>[Nome da Equipe/Suporte]</strong></p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="font-size: 12px; color: #555; padding-top: 15px; border-top: 1px solid #ddd;">
                            Este é um e-mail automático, por favor, não responda.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

`;
};
