import { create, defaultOptions, Whatsapp } from "wbotconnect";
import path from "node:path";
import fs, { promises } from "node:fs";
import { AppError } from "../errors/errors.helper";

interface Session extends Whatsapp {
  id: number;
}

const sessions: Session[] = [];
let sessionName: string;
let tenantId: string;
let whatsappSession: any;
/**
 * Funcao Responsavel por iniciar a conexao com o whatsapp web
 * @param whatsapp
 * @returns Promisse<whatsapp> retorna uma instancia do cliente whatsapp
 */
export const initWbot = async (whatsapp: any): Promise<Session> => {
  let wbot: Session;
  whatsappSession = whatsapp;
  try {
    const options = {
      logQR: false,
      headless: false,
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
        ) => {},
        statusFind: (statusSession: string) => {
          console.log(statusSession);
        },
        catchLinkCode: (code: string) => {
          console.log(code);
        },
      })
    )) as unknown as Session;
    const sessionIndex = sessions.findIndex((s) => s.id === whatsapp.id);
    if (sessionIndex === -1) {
      wbot.id = whatsapp.id;
      sessions.push(wbot);
    } else {
      sessions[sessionIndex] = wbot;
    }
    return wbot;
  } catch (error) {
    console.log(whatsappSession);
    removeSession(whatsappSession.name);
    throw new AppError("ERR_INICIAR_SESSAO_WPWEB", 403);
  }
};

async function removeSession(session: string) {
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
    // const io = getIO();
    const sessionIndex = sessions.findIndex((s) => s.id === whatsappId);
    if (sessionIndex !== -1) {
      const wbot = sessions[sessionIndex];
      await wbot.waPage.close();
      removeSession(whatsappSession.name);
      //   whatsappSession.update({
      //     status: "DISCONNECTED",
      //     qrcode: "",
      //     retries: 0,
      //     phone: "",
      //     session: "",
      //     pairingCode: "",
      //   });
      //   io.emit(`${tenantId}:whatsappSession`, {
      //     action: "update",
      //     session: whatsappSession,
      //   });
      sessions.splice(sessionIndex, 1);
    }
  } catch (error) {
    console.log(error);
  }
};
