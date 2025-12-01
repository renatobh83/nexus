export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: any;
  tenantId?: number;
  attachmentUrl?: string;
  isForgot?: boolean;
}
