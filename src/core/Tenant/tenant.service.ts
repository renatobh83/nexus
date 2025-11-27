import { Prisma } from "@prisma/client";
import { TenantRepository } from "./tenant.repository";

interface Request {
  address?: object;
  dadosNfe?: object;
  name: string;
  tenantId: number;
}

export class TenantService {
  private tenantRepository: TenantRepository;

  constructor() {
    this.tenantRepository = new TenantRepository();
  }
  async showBussinesHours(id: number) {
    const tenant = await this.tenantRepository.findById(id, {
      businessHours: true,
      messageBusinessHours: true,
    });
    return {
      businessHours: tenant?.businessHours,
      messageBusinessHours: tenant?.messageBusinessHours,
    };
  }
  async dadosNotaFiscal(id: number) {
    const tenant = await this.tenantRepository.findById(id, {
      address: true,
      dadosNfe: true,
      name: true,
    });

    return tenant;
  }
  async updateDadosNotafiscal(id: number, data: Request) {
    const { tenantId, ...restData } = data;

    const dataForPrisma: any = {
      ...restData,
    };
    await this.tenantRepository.update(id, dataForPrisma, {
      address: true,
      dadosNfe: true,
      name: true,
    });
  }
  async updateBusinessHours(id: number, data: any) {
    const updated = await this.tenantRepository.update(
      id,
      { businessHours: data },
      {
        businessHours: true,
      }
    );
    return updated;
  }
  async updateMessageBusinessHours(id: number, data: any) {
    const updated = await this.tenantRepository.update(
      id,
      { messageBusinessHours: data },
      {
        messageBusinessHours: true,
      }
    );
    return updated;
  }
}
