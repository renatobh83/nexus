import { EmpresaContrato, Prisma } from "@prisma/client";
import { ContratoServiceProps, EmpresaRepository } from "./emrpesa.repository";
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
  async insertOrUpdateContrato({
    dataContrato,
    empresaId,
    tenantId,
    totalHoras,
  }: ContratoServiceProps): Promise<EmpresaContrato> {
    // 1. Tenta encontrar o contrato existente
    const contratoUpdate = await this.empresaRepository.findByDateAndEmpresaId(
      dataContrato,
      empresaId
    );

    // 2. Se o contrato for encontrado, atualiza
    if (contratoUpdate) {
      const updatedContrato = await this.empresaRepository.updateContrato(
        contratoUpdate.id,
        { totalHoras }
      );
      return updatedContrato;
    }

    // 3. Se não for encontrado, cria um novo
    const newContrato = await this.empresaRepository.createContrato({
      dataContrato,
      tenantId,
      empresaId,
      totalHoras,
    });

    return newContrato;
  }
  async contatosEmpresa(empresaId: number) {
    return this.empresaRepository.findContatoByEmpresa(empresaId);
  }

  async updateContatoEmpresa(emrpesaId: number, dataSetContatos: []) {
    return this.empresaRepository.updateContatoEmpresa(
      emrpesaId,
      dataSetContatos
    );
  }
}
