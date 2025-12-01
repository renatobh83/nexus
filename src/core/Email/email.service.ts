import { Prisma } from "@prisma/client";
import { EmailRepository } from "./email.repository";
import { EmailOptions } from "./email.types";
import { gerarTemplateEmail, gerarTemplateEmailAnexo } from "./email.utils";

export class EmailService {
  private emailRepository: EmailRepository;

  constructor() {
    this.emailRepository = new EmailRepository();
  }

  async listEmails(where?: Prisma.EmailWhereInput) {
    return await this.emailRepository.findAll(where);
  }
  async findOne(where?: Prisma.EmailWhereInput) {
    return await this.emailRepository.findOne(where);
  }
  async createEmail(data: any) {
    const { tenantId, ...restData } = data;
    const dataForPrisma: any = {
      ...restData,
    };
    dataForPrisma.tenant = {
      connnect: { id: tenantId },
    };
    return await this.emailRepository.create(dataForPrisma);
  }
  async updateEmail(id: number, data: Prisma.EmailUpdateInput) {
    return await this.emailRepository.update(id, data);
  }

  async sendEmail({
    to,
    subject,
    text,
    html,
    attachmentUrl,
    tenantId,
    isForgot,
  }: EmailOptions) {
    if (isForgot) {
      const mailOptions = {
        tenantId,
        to,
        subject,
        text,
        html,
        attachmentUrl,
      };
      //   await addJob("SendEmail", mailOptions);
      return;
    }
    if (Array.isArray(to)) {
      const emailsParaEnviar: any[] = []; // Armazena as opções de email

      to.forEach((para, index) => {
        const user = html.username[index]; // Pega o usuário correspondente ao índice do email

        if (user) {
          const mailOptions = {
            tenantId,
            to: para,
            subject,
            text,
            html: attachmentUrl
              ? gerarTemplateEmailAnexo(html, user)
              : gerarTemplateEmail(html, user), // Usa o nome correto
            attachmentUrl,
          };

          emailsParaEnviar.push(mailOptions);
        }
      });

      // Enviar os emails (descomentar para usar)
      //   emailsParaEnviar.forEach((options) => addJob("SendEmail", options));
    } else {
      const mailOptions = {
        tenantId,
        to,
        subject,
        text,
        html:
          html === "teste"
            ? "Este e-mail é de teste"
            : attachmentUrl
            ? gerarTemplateEmailAnexo(html, html.username)
            : gerarTemplateEmail(html, html.username),
        attachmentUrl,
      };
      //   await addJob("SendEmail", mailOptions);
    }
  }
}
