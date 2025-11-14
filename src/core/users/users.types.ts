interface SaveUserDTO {
  id?: number;
  name: string;
  email: string;
  password: string;
  tenantId: number;
  profile: string;
  queues?: number[];
}

