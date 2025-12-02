import { pupa } from "../../ultis/pupa";

export const buildMessageBody = (template: string, ticket: any): string => {
  return pupa(template || "", {
    name: ticket?.contact?.name ?? "",
    email: ticket?.contact?.email ?? "",
    phoneNumber: ticket?.contact?.number ?? "",
    user: ticket?.user?.name ?? "",
    userEmail: ticket?.user?.email ?? "",
  });
};
