import { getFastifyApp } from "..";
import { getIO } from "../../lib/socket";
import { initTbot } from "../../lib/tbot";
import { initWbot } from "../../lib/wbot";

export const StartConnectionSession = async (whatsapp: any): Promise<void> => {
  const app = getFastifyApp();
  try {
    if (whatsapp.type === "whatsapp") {
      app.services.whatsappService.update(whatsapp.id, whatsapp.tenantId, {
        status: "OPENING",
      });
      const io = getIO();
      io.emit(`${whatsapp.tenantId}:whatsappSession`, {
        action: "update",
        session: whatsapp,
      });
      await initWbot(whatsapp, app.services.whatsappService);
      // wbotMonitor(wbot, whatsapp);
    }
    if (whatsapp.type === "telegram") {
      app.services.whatsappService.update(whatsapp.id, whatsapp.tenantId, {
        status: "OPENING",
      });
      const io = getIO();
      io.emit(`${whatsapp.tenantId}:whatsappSession`, {
        action: "update",
        session: whatsapp,
      });
      console.log("tele")
        // const tbot = await initTbot(whatsapp, app.services.whatsappService);
    // tbotMessageListener(tbot);
      // tbot.on("message", async (ctx) => {
      //   console.log(ctx)
      // })
      // StartTbotSession(whatsapp);
    }
  } catch (error) {
    console.log(error);
  }
};
