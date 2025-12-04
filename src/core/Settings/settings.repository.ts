import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../errors/errors.helper";

export class SettingsRepository {
  async findFirst(where: Prisma.SettingWhereInput) {
    return prisma.setting.findFirst({ where });
  }
  async findMany(where?: Prisma.SettingWhereInput) {
    return prisma.setting.findMany({ where });
  }
  async update(key: string, data: Prisma.SettingCreateInput, tenantId: string) {
    return prisma.setting.update({
      where: {
        key_tenantId: {
          key,
          tenantId: parseInt(tenantId),
        },
      },
      data: {
        value: data.value,
      },
    });
  }
}
