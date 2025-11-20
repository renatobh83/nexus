export function validarCPF(_cpf: string) {
  const cpf = _cpf.replace(/\D/g, ""); // Remove caracteres não numéricos

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false; // Verifica se o CPF tem 11 dígitos e não é uma sequência repetida
  }

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += Number.parseInt(cpf.charAt(i)) * (10 - i);
  }

  let primeiroDigito = 11 - (soma % 11);
  if (primeiroDigito >= 10) primeiroDigito = 0;

  if (primeiroDigito !== Number.parseInt(cpf.charAt(9))) {
    return false;
  }

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += Number.parseInt(cpf.charAt(i)) * (11 - i);
  }

  let segundoDigito = 11 - (soma % 11);
  if (segundoDigito >= 10) segundoDigito = 0;

  return segundoDigito === Number.parseInt(cpf.charAt(10));
}
