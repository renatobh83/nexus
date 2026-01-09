import Fuse from "fuse.js";

export const fuseSearch = (lista: any[], value: string, options: any) => {
  if (typeof value === "string" && value.length >= 4) {
    const fuse = new Fuse(lista, options);
    const resultado = fuse
      .search(value)
      .map((result: { item: any }) => result.item);

    return resultado;
  }
  return false;
};
