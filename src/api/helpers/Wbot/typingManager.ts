const typingStatus = new Map<string, NodeJS.Timeout>();

export function setTyping(ticketId: string, duration = 3000) {
  // Se já estiver "digitando", não faz nada
  if (typingStatus.has(ticketId)) return false;

  // Marca como "digitando" e define um tempo para liberar
  const timeout = setTimeout(() => {
    typingStatus.delete(ticketId);
  }, duration);

  typingStatus.set(ticketId, timeout);
  return true;
}

export function clearTyping(ticketId: string) {
  const timeout = typingStatus.get(ticketId);
  if (timeout) clearTimeout(timeout);
  typingStatus.delete(ticketId);
}
