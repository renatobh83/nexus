import { Prisma } from "@prisma/client";
import { ApiExternaRepository } from "./apiExterna.repository";
import { AppError } from "../../errors/errors.helper";
import { getFastifyApp } from "../../api";
import { ApiData } from "./apiExterna.controller";

export class ApiExternaService {
  private apiExternaRepository: ApiExternaRepository;

  constructor() {
    this.apiExternaRepository = new ApiExternaRepository();
  }

  async findOne(where: Prisma.ApiConfigWhereInput) {
    return await this.apiExternaRepository.findWhere(where);
  }
  async messageApiToJob(whereApi: Prisma.ApiConfigWhereInput, data: any) {
    const apiConfig = await this.findOne(whereApi);
    if (!apiConfig) {
      throw new AppError("ERR_SESSION_NOT_AUTH_TOKEN", 403);
    }
    const messageData = {
      apiId: whereApi.id,
      apiConfig,
      ...data,
      sessionId: whereApi.sessionId,
      tenantId: whereApi.tenantId,
    };
    // TODO criar JOB
  }
  async createApiConfig({
    authToken,
    name,
    sessionId,
    isActive,
    urlMessageStatus,
    urlServiceStatus,
    userId,
    tenantId,
    id,
  }: ApiData) {
    const payload = {
      tenantId,
      profile: "ApiExterna",
      sessionId,
    };

    const token = getFastifyApp().jwt.sign(payload, { expiresIn: "10d" });
    const dataForPrisma = {
      name,
      urlMessageStatus,
      urlServiceStatus,
      isActive,
      authToken,
      token,
    } as any;

    dataForPrisma.user = {
      connect: { id: userId },
    };
    dataForPrisma.tenant = {
      connect: { id: tenantId },
    };
    dataForPrisma.session = {
      connect: { id: sessionId },
    };

    if (!id) {
      const api = await this.apiExternaRepository.create(dataForPrisma);
      return api;
    } else {
      const api = await this.apiExternaRepository.update(id, dataForPrisma);
      return api;
    }
  }

  async listaApis() {
    return await this.apiExternaRepository.findAll();
  }
  async deleteApi(id: string): Promise<void> {
    await this.apiExternaRepository.delete(id);
  }
  async renewToken(apiId: string, params: ApiData) {
    const { tenantId, userId, sessionId, ...restParams } = params;
    const payload = {
      tenantId,
      profile: "ApiExterna",
      sessionId,
    };
    const token = getFastifyApp().jwt.sign(payload, { expiresIn: "10d" });
    const apiUpdated = await this.apiExternaRepository.update(apiId, {
      ...restParams,
      token,
    });
    return apiUpdated;
  }
}
