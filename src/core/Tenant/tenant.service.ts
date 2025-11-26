import { TenantRepository } from "./tenant.repository";

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
}
