import type {
  IncomingCall,
  Whatsapp,
  Contact as WbotContact,
} from "wbotconnect";
import { getFastifyApp } from "../..";

interface Session extends Whatsapp {
  id: number;
}

export const VerifyCall = async (
  call: IncomingCall,
  wbot: Session
): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const messageDefault =
        "As chamadas de voz e vídeo estão desabilitas para esse WhatsApp, favor enviar uma mensagem!";

      let settings: any =
        await getFastifyApp().services.settingsService.findAllSettings({
          key: {
            in: ["rejectCalls", "callRejectMessage"],
          },
        });

      const rejectCalls =
        settings.find((s: { key: string }) => s.key === "rejectCalls")
          ?.value === "enabled" || false;

      const callRejectMessage =
        settings.find((s: { key: string }) => s.key === "callRejectMessage")
          ?.value || messageDefault;

      // const tenantId = settings.find(
      //   (s: { key: string }) => s.key === "rejectCalls"
      // )?.tenantId;

      if (!rejectCalls) {
        resolve();
        return;
      }

      wbot.rejectCall(call.id);

      if (!call.peerJid) return;

      wbot.sendText(call.peerJid, callRejectMessage);
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};
