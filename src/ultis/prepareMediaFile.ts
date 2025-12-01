import path from "path";

export function prepareMediaFile(file: any): { url: string; type: string } {
  const { filename } = file; // Nomes corretos dos campos

  const { MEDIA_URL } = process.env;

  let url = `${MEDIA_URL}/public/attachments/${filename}`;

  const type = path.extname(filename).replace(".", "");
  return { url, type };
}
