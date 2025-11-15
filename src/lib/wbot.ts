import { create, defaultOptions, Whatsapp } from "wbotconnect";
import path from "node:path";
import fs, { promises } from "node:fs";
import { AppError } from "../errors/errors.helper";
import { logger } from "../ultis/logger";
import { getIO } from "./socket";

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
        ) => {
          const matches = base64Qrimg.match(
            /^data:([A-Za-z-+/]+);base64,(.+)$/
          );
          if (!matches || matches.length !== 3) {
            throw new Error("Invalid input string");
          }
          logger.info(
            `Session QR CODE: ${`wbot-${whatsapp.id}`}-ID: ${whatsapp.id}-${whatsapp.status
            }`
          );
          await whatsapp.update({
            qrcode: extrairParteWhatsApp(urlCode),
            status: "qrcode",
            retries: attempts,
          });
          const response = {
            type: matches[1],
            data: Buffer.from(matches[2], "base64"),
          };
          fs.writeFile(qrCodePath, response.data, "binary", (err) => {
            if (err) {
              console.error("Erro ao salvar QR Code:", err);
            }
          });
          io.emit(`${tenantId}:whatsappSession`, {
            action: "update",
            session: whatsapp,
          });
        }
        ,
        statusFind: async (statusSession: string) => {
          if (statusSession === "autocloseCalled") {
            whatsapp.update({
              status: "DISCONNECTED",
              qrcode: "",
              retries: 0,
              phone: "",
              session: "",
              pairingCode: "",
            });
            io.emit(`${tenantId}:whatsappSession`, {
              action: "close",
              session: whatsapp,
            });
          }
          if (statusSession === "qrReadFail") {
            logger.error(`Session: ${sessionName}-AUTHENTICATION FAILURE`);
            if (whatsapp.retries > 1) {
              await whatsapp.update({
                retries: 0,
                session: "",
              });
            }
            const retry = whatsapp.retries;
            await whatsapp.update({
              status: "DISCONNECTED",
              retries: retry + 1,
            });
            io.emit(`${tenantId}:whatsappSession`, {
              action: "update",
              session: whatsapp,
            });
          }
          if (
            statusSession === "desconnectedMobile" ||
            statusSession === "browserClose"
          ) {
            const sessionIndex = sessions.findIndex(
              (s) => Number(s.id) === Number(whatsapp.id)
            );

            if (sessionIndex !== -1) {
              whatsapp.update({
                status: "DISCONNECTED",
                qrcode: "",
                retries: 0,
                phone: "",
                session: "",
                pairingCode: "",
              });
              io.emit(`${tenantId}:whatsappSession`, {
                action: "update",
                session: whatsapp,
              });
              sessions.splice(sessionIndex, 1);
            }
          }
          if (statusSession === "inChat") {
            if (fs.existsSync(qrCodePath)) {
              fs.unlink(qrCodePath, () => { });
            }
          }
          if (statusSession === "serverClose") {
            const sessionIndex = sessions.findIndex(
              (s) => Number(s.id) === Number(whatsapp.id)
            );

            if (sessionIndex !== -1) {
              whatsapp.update({
                status: "DISCONNECTED",
                qrcode: "",
                retries: 0,
                phone: "",
                session: "",
                pairingCode: "",
              });
              io.emit(`${tenantId}:whatsappSession`, {
                action: "update",
                session: whatsapp,
              });
              sessions.splice(sessionIndex, 1);
            }
          }
        },
        catchLinkCode: async (code: string) => {
          await whatsapp.update({
            pairingCode: code,
            status: "qrcode",
            retries: 0,
          });
          io.emit(`${tenantId}:whatsappSession`, {
            action: "update",
            session: whatsapp,
          })

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

 const removeWbot = async (whatsappId: number): Promise<void> => {
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
