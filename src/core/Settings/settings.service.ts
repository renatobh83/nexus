import { AppError } from "../../errors/errors.helper";
import { SettingsRepository } from "./settings.repository";

export class SettingsService {
  private settginsRepository: SettingsRepository;

  constructor() {
    this.settginsRepository = new SettingsRepository();
  }

  async findAllSettings() {
    return this.settginsRepository.findMany();
  }
  async updateSetting(key: string, data: any) {
    const setting = await this.settginsRepository.findFirst({
      key,
    });
    if (!setting) {
      throw new AppError("ERR_NO_SETTING_FOUND", 404);
    }
    const settingUpdate = await this.settginsRepository.update(
      key,
      data,
      data.tenantId
    );
    return settingUpdate;
  }
}
