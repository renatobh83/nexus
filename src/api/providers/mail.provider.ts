import nodemailer from "nodemailer";
import { getFastifyApp } from "..";

export const createTransporter = async (tenantId: number) => {
  try {
    // Buscar as configurações do SMTP no banco de dados

    const emailConfig = await getFastifyApp().services.emailService.findOne({
      tenantId,
    });

    if (!emailConfig) {
      throw new Error("Configuração de e-mail não encontrada.");
    }

    // Criar o transporter com os dados do banco
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtp,
      port: emailConfig.portaSMTP,
      secure: emailConfig.ssl, // Se for true, usa SSL; se false, usa TLS
      auth: {
        user: emailConfig.email,
        pass: emailConfig.senha,
      },
      pool: true, // Ativa o pool de conexões
      maxConnections: 5, // Número máximo de conexões simultâneas
      maxMessages: 100, // Número máximo de e-mails por conexão
      tls: {
        rejectUnauthorized: false, // Pode ser alterado para true em produção se o certificado for confiável
      },
    });

    return { transporter, emailConfig };
  } catch (error) {
    console.error("Erro ao criar transporter:", error);
    throw error;
  }
};
