interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  tenantId: number;
  profile: string;
  queues?: number[];
}
