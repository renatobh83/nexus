type UserWithNestedQueues = {
  queues: {
    queue: {
      id: number;
      queue: string;
    } | null;
  }[];
  // Adicione outras propriedades do usuário que você usa
  [key: string]: any;
};

// Este tipo representa o resultado final que você quer
type UserWithFlatQueues = Omit<UserWithNestedQueues, "queues"> & {
  filas: {
    id: number;
    queue: string;
  }[];
};

export function transformUserQueues(user: UserWithNestedQueues): any {
  const { queues, ...restOfUser } = user;

  const flatQueues = (queues || [])
    .map((uq) => (uq.queue ? { id: uq.queue.id, queue: uq.queue.queue } : null))
    .filter(Boolean);

  return {
    ...restOfUser,
    queues: flatQueues,
  };
}
