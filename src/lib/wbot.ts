import { create, defaultOptions, Whatsapp } from "wbotconnect";
import path from "node:path";
import fs, { promises } from "node:fs";
import { AppError } from "../errors/errors.helper";
import { logger } from "../ultis/logger";
import { getIO } from "./socket";
import { FastifyInstance } from "fastify";
import { WhatsappService } from "../core/whatsapp/whatsapp.service";
import { wbotMessageListener } from "../api/helpers/Wbot/wbotMessageListener";

export interface Session extends Whatsapp {
  id: number;
  tenantId: number
}

const sessions: Session[] = [];
let sessionName: string;
let tenantId: string;
let whatsappSession: any;

// Função auxiliar para extrair o código do URL do QR
function extractQrCode(url: string): string | null {
  if (!url) return null;
  return url.replace(/^https:\/\/wa\.me\/settings\/linked_devices#/, "");
}

/**
 * Inicia uma sessão do wbotconnect para uma determinada conexão de WhatsApp.
 * Esta função configura os callbacks da biblioteca e delega as atualizações de estado
 * para o WhatsappService, mantendo a lógica de negócio separada.
 *
 * @param whatsapp - O objeto da conexão de WhatsApp vindo do banco de dados.
 * @param whatsappService - A instância do serviço para persistir as mudanças.
 * @returns Uma Promise que resolve para a instância do cliente wbot.
 */
export const initWbot = async (
  whatsapp: any,
  whatsappService: WhatsappService
): Promise<Session> => {
  const io = getIO();
  let wbot: Session;
  tenantId = whatsapp.tenantId;
  whatsappSession = whatsapp;
  sessionName = whatsapp.name;

  const qrCodePath = path.join(
    __dirname,
    "..",
    "..",
    "public",
    `qrCode-${whatsapp.id}.png`
  );

  try {
    const options = {
      logQR: true,
      headless: true,
      phoneNumber: whatsapp.pairingCodeEnabled ? whatsapp.wppUser : null,
      puppeteerOptions: {
        userDataDir: "./userDataDir/" + whatsapp.name,
      },
    };
    const mergedOptions = { ...defaultOptions, ...options };
    wbot = (await create(
      Object.assign({}, mergedOptions, {
        catchQR: async (
          base64Qrimg: any,
          asciiQR: any,
          attempts: any,
          urlCode: any
        ) => {
          const qrCode = extractQrCode(urlCode);
          if (qrCode) {
            // Delega a lógica para o serviço
            await whatsappService.handleQrCode(
              whatsapp.id,
              whatsapp.tenantId,
              qrCode,
              attempts
            );
          }
          // const matches = base64Qrimg.match(
          //   /^data:([A-Za-z-+/]+);base64,(.+)$/
          // );
          // if (!matches || matches.length !== 3) {
          //   throw new Error("Invalid input string");
          // }
          // logger.info(
          //   `Session QR CODE: ${`wbot-${whatsapp.id}`}-ID: ${whatsapp.id}-${whatsapp.status
          //   }`
          // );
          // await app.services.whatsappService.update(whatsapp.id, whatsapp.tenantId,{
          //   qrcode: extrairParteWhatsApp(urlCode),
          //   status: "qrcode",
          //   retries: attempts,
          // });
          // const response = {
          //   type: matches[1],
          //   data: Buffer.from(matches[2], "base64"),
          // };
          // fs.writeFile(qrCodePath, response.data, "binary", (err) => {
          //   if (err) {
          //     console.error("Erro ao salvar QR Code:", err);
          //   }
          // });
          // io.emit(`${tenantId}:whatsappSession`, {
          //   action: "update",
          //   session: whatsapp,
          // });
        },
        statusFind: async (statusSession: any) => {
          console.log(
            `INFO: Status da sessão '${whatsapp.name}': ${statusSession}`
          );
          switch (statusSession) {
            case "autocloseCalled":
            case "desconnectedMobile":
            case "browserClose":
            case "serverClose":
              // Todos esses status levam a uma desconexão.
              await whatsappService.handleDisconnected(
                whatsapp.id,
                whatsapp.tenantId
              );
              // Lógica para remover a sessão do array local e limpar arquivos pode ser chamada aqui.
              break;

            case "inChat":
              // Se a sessão está conectada, remove o arquivo do QR Code.
              if (fs.existsSync(qrCodePath)) {
                fs.unlink(qrCodePath, () => {});
              }
              break;

            // Outros status podem ser tratados aqui se necessário.
          }
        },

        catchLinkCode: async (code: any) => {
          await whatsappService.handlePairingCode(
            whatsapp.id,
            whatsapp.tenantId,
            code
          );
        },
      })
    )) as unknown as Session;
    const sessionIndex = sessions.findIndex((s) => s.id === whatsapp.id);
    if (sessionIndex === -1) {
      wbot.id = whatsapp.id;
      wbot.tenantId= parseInt(tenantId)
      sessions.push(wbot);
    } else {
      sessions[sessionIndex] = wbot;
    }
    start(wbot, io, whatsappService);
    return wbot;
  } catch (error) {
    removeSession(whatsappSession.name);
    throw new AppError("ERR_INICIAR_SESSAO_WPWEB", 403);
  }
};
async function waitForApiValue(apiCall: Session, interval = 1000) {
  return new Promise((resolve, reject) => {
    const checkValue = async () => {
      try {
        const profileSession = await apiCall.getProfileName();

        const wbotVersion = await apiCall.getWAVersion();
        const number = await apiCall.getWid();
        const result = {
          wbotVersion,
          profileSession,
          number,
        };

        if (result !== null) {
          resolve(result); // Retorna o valor assim que não for null
        } else {
          setTimeout(checkValue, interval); // Recheca após o intervalo
        }
      } catch (error) {
        reject(error); // Rejeita a promise em caso de erro
      }
    };
    checkValue(); // Inicia a verificação
  });
}

const start = async (client: Session, io: any, service: WhatsappService) => {
  try {
    const isReady = await client.isAuthenticated();

    if (isReady) {
      logger.info(`Session: ${sessionName} AUTHENTICATED`);
      client.startTyping;
      const profileSession = await waitForApiValue(client, 1000);

      await service.handleConnected(
        whatsappSession.id,
        whatsappSession.tenantId,
        profileSession,
        whatsappSession.name
      );

      // io.emit(`${tenantId}:whatsappSession`, {
      //   action: "update",
      //   session: whatsappSession,
      // });
      // io.emit(`${tenantId}:whatsappSession`, {
      //   action: "readySession",
      //   session: whatsappSession,
      // });
      
      wbotMessageListener(client);
    }
  } catch (_error) {}
};

export async function removeSession(session: string) {
  try {
    // Defina o caminho da pasta com base no sessionId
    const sessionPath = path.join(
      __dirname,
      "..",
      "..",
      "userDataDir",
      session
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await promises.access(sessionPath);
    fs.rmSync(sessionPath, { recursive: true, force: true });
  } catch (error) {
    console.log(error);
  }
}

export const removeWbot = async (whatsappId: number): Promise<void> => {
  try {
    const io = getIO();
    const sessionIndex = sessions.findIndex((s) => s.id === whatsappId);

    if (sessionIndex !== -1) {
      const wbot = sessions[sessionIndex];
      await wbot.waPage.close();
      removeSession(whatsappSession.name);
      whatsappSession.update({
        status: "DISCONNECTED",
        qrcode: "",
        retries: 0,
        phone: "",
        session: "",
        pairingCode: "",
      });
      io.emit(`${tenantId}:whatsappSession`, {
        action: "update",
        session: whatsappSession,
      });
      sessions.splice(sessionIndex, 1);
    }
  } catch (error) {
    console.log(error);
  }
};

function extrairParteWhatsApp(str: string) {
  if (!str) return null;
  // remove o prefixo da URL, se existir
  return str.replace(/^https:\/\/wa\.me\/settings\/linked_devices#/, "");
}
