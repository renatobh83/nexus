import { LogTicket } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class LogTicketRepository {
  findById(id: number): Promise<LogTicket | null> {
    return prisma.logTicket.findFirst({ where: { id: id } });
  }
  create(data: any): Promise<LogTicket> {
    return prisma.logTicket.create({ data: data });
  }
  //   findAll(): Promise<MinhaEntidade[]>;
  //   update(id: string, data: Partial<MinhaEntidade>): Promise<MinhaEntidade>;
  //   delete(id: string): Promise<void>;
}
