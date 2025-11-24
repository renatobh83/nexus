export function detectMediaType(mimetype = "") {
  if (!mimetype) return "unknown";

  const type = mimetype.split("/")[0];
  const subtype = mimetype.split("/")[1] || "";

  if (type === "image") return "image";
  if (type === "audio") return "audio";
  if (type === "video") return "video";
  if (type === "text") return "text";

  // Documentos e arquivos de escritório
  if (
    mimetype.startsWith("application/pdf") ||
    mimetype.includes("word") ||
    mimetype.includes("excel") ||
    mimetype.includes("presentation") ||
    mimetype.includes("opendocument") ||
    mimetype.includes("rtf")
  ) {
    return "document";
  }

  // Compactados ou binários
  if (
    mimetype.includes("zip") ||
    mimetype.includes("rar") ||
    mimetype.includes("7z") ||
    mimetype.includes("tar") ||
    mimetype.includes("octet-stream")
  ) {
    return "archive";
  }

  // Fallback
  return type || "unknown";
}
