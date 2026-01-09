import { AppError } from "../../../errors/errors.helper";
import { getApiInstance } from "./apiInstance";

interface ConsultaPacienteProps {
  email: string;
  integracao: any;
  dtNascimento: string;
}

export const RecuperarAcesso = async ({
  integracao,
  email,
  dtNascimento,
}: ConsultaPacienteProps) => {
  try {
    const url = `doPacientePassword`;
    const URL_FINAL = `${integracao.config_json.baseUrl}${url}`;
    const body = new URLSearchParams();
    body.append("ds_email", email);
    body.append("dt_nascimento", dtNascimento);
    const instanceApi = await getApiInstance(integracao);

    const { data } = await instanceApi.post(URL_FINAL, body);

    return data;
  } catch (error: any) {
    throw new AppError(error, 500);
  }
};
