import { AppError } from "../../errors/errors.helper";
import { IntegracoesRepository } from "./integracoes.repository";

export class IntegracoesService {
  private integracoesRepository: IntegracoesRepository;
  constructor() {
    this.integracoesRepository = new IntegracoesRepository();
  }

  async listarIntegracoes() {
    return this.integracoesRepository.findAll();
  }
  async createIntegracao(data: any) {
    const { tenantId, config_json, ...restData } = data;
    const dataForPrisma: any = {
      ...restData,
      config_json,
    };
    dataForPrisma.tenant = {
      connect: { id: tenantId },
    };
    const integracaoExists = await this.integracoesRepository.findOne({
      name: data.name,
      tenantId: tenantId,
    });
    if (integracaoExists) {
      throw new AppError("QUEUE_ALREADY_EXISTS", 501);
    }
    if (typeof config_json === "string") {
      dataForPrisma.config_json = JSON.parse(config_json);
    }

    if (
      !dataForPrisma.config_json ||
      typeof dataForPrisma.config_json !== "object"
    ) {
      throw new AppError("JSON_INVALID", 400);
    }
    const integracao = await this.integracoesRepository.create(dataForPrisma);
    return integracao;
  }

  async updateIntegracao(data: any) {
    const { id, config_json, name, tenantId } = data;

    let json = config_json;
    const integracaoExists = await this.integracoesRepository.findOne({
      name: name,
      tenantId: tenantId,
      id: {
        not: parseInt(id),
      },
    });
    if (integracaoExists) {
      throw new AppError("QUEUE_ALREADY_EXISTS", 501);
    }
    if (typeof config_json === "string") {
      json = JSON.parse(config_json);
    }

    if (!json || typeof json !== "object") {
      throw new AppError("JSON_INVALID", 404);
    }
    const integracao = await this.integracoesRepository.update(parseInt(id), {
      name,
      config_json: json,
    });

    return integracao;
  }
  async deleteIntegracao(id: number) {
    await this.integracoesRepository.delete(id);
  }
}
