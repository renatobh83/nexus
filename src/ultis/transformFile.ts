import fs from "fs/promises";
import path from "path";

import mime from "mime-types";

// Função para sanitizar o nome do arquivo
function sanitizeFilename(filename: string): string {
  return filename
    .normalize("NFD") // remove acentos
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_"); // troca espaços e símbolos por _
}

export async function transformFile(file: {
  path: string;
  filename: string;
  buffer?: Buffer;
}) {
  // Lê o conteúdo do arquivo como Buffer
  const buffer = file.buffer ? file.buffer : await fs.readFile(file.path!);

  // Extrai extensão
  const ext = path.extname(file.filename); // ex: .pdf
  const base = path.basename(file.filename, ext);

  // Cria novo nome do arquivo
  const newFilename = `${sanitizeFilename(base)}`;

  // Detecta mimetype pela extensão
  const mimetype = mime.lookup(ext) || "application/octet-stream";

  return {
    filename: newFilename,
    mimetype,
    buffer,
  };
}
