export function getFullMediaUrl(filename: string | null): string | null {
  if (!filename) {
    return null;
  }
  const { MEDIA_URL, NODE_ENV, PROXY_PORT } = process.env;

  // Garante que a URL base existe
  if (!MEDIA_URL) {
    console.error("Variável de ambiente BACKEND_URL não definida!");
    return null; // Ou lança um erro
  }

  // Lógica idêntica à do seu getter no Sequelize
  if (NODE_ENV === "development" && PROXY_PORT) {
    return `${MEDIA_URL}:${PROXY_PORT}/public/${filename}`;
  } else {
    return `${MEDIA_URL}/public/${filename}`;
  }
}
