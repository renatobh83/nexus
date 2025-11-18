import { Prisma } from "@prisma/client";
import { EmpresaRepository } from "./emrpesa.repository";
import { AppError } from "../../errors/errors.helper";

export class EmpresaService {
  private empresaRepository: EmpresaRepository;

  constructor() {
    this.empresaRepository = new EmpresaRepository();
  }

  async finalAllCompany(include?: Prisma.EmpresaInclude) {
    const companies = await this.empresaRepository.findAll(include);
    return companies;
  }
  async findyCompanyByid(where: Prisma.EmpresaWhereInput) {
    const company = await this.empresaRepository.findById(where);
    return company;
  }
  async createCompany(data: Prisma.EmpresaCreateInput) {
    const isExistsIdentifier = await this.empresaRepository.findById({
      identifier: data.identifier,
    });
    if (isExistsIdentifier) {
      throw new AppError("ERR_IDENTIFIER_ALREADY_EXISTS", 409);
    }

    const newCompany = await this.empresaRepository.create(data);
    return newCompany;
  }
  async deleteCompany(emrpesaId: string) {
    await this.empresaRepository.delete(emrpesaId);
    return true;
  }
  async updateCompany(dto: any) {
    const { id, ...restDto } = dto;
    const company = await this.empresaRepository.update(dto.id, restDto);
    return company;
  }
}
