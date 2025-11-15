import CryptoJS from 'crypto-js';

const getSecretKey = (): CryptoJS.lib.WordArray => {
  const secretKey = process.env.CHAT_SECRET;
  if (!secretKey || secretKey.length !== 64) {
    throw new Error('CHAT_SECRET deve ser definido no .env e ter 64 caracteres hexadecimais (32 bytes)');
  }
  return CryptoJS.enc.Hex.parse(secretKey);
};

/**
 * Verifica se um texto já está no formato criptografado (iv:encrypted).
 */
export const isEncrypted = (text: string): boolean => {
  return typeof text === 'string' && text.includes(':');
};

/**
 * Criptografa um texto usando AES.
 */
export const encrypt = (text: string): string => {
  const key = getSecretKey();
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
};

/**
 * Descriptografa um texto criptografado com AES.
 */
export const decrypt = (encryptedText: string): string => {
  if (!isEncrypted(encryptedText)) {
    // Se o texto não parece criptografado, retorna como está para evitar erros.
    return encryptedText;
  }
  const key = getSecretKey();
  const [ivHex, encrypted] = encryptedText.split(':');
  if (!ivHex || !encrypted) {
    return encryptedText; // Retorna o texto original se o formato for inválido
  }
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
};
