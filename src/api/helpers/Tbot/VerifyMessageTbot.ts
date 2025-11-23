import { Contact, Ticket } from "@prisma/client";
import { Context } from "telegraf";

export const VerifyMessageTbot = async (
  ctx: Context | any,
  fromMe: boolean,
  ticket: Ticket,
  contact: Contact
): Promise<void> => {
    console.log(ctx)
}