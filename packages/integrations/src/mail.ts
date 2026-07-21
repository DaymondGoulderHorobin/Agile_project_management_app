import nodemailer, { type Transporter } from "nodemailer";

export type MailMessage = Readonly<{
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Readonly<Record<string, string>>;
}>;

export interface Mailer {
  send(message: MailMessage): Promise<{ messageId: string }>;
}

export class SmtpMailer implements Mailer {
  readonly #transporter: Transporter;

  public constructor(private readonly from: string, transport: Parameters<typeof nodemailer.createTransport>[0]) {
    this.#transporter = nodemailer.createTransport(transport);
  }

  public async send(message: MailMessage): Promise<{ messageId: string }> {
    const result = await this.#transporter.sendMail({ from: this.from, ...message, headers: message.headers });
    return { messageId: String(result.messageId) };
  }
}

export class MemoryMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  public async send(message: MailMessage): Promise<{ messageId: string }> {
    this.sent.push(structuredClone(message));
    return { messageId: `memory-${this.sent.length}` };
  }
}

export function guestInvitationMail(input: {
  recipient: string;
  inviterName: string;
  projectName: string;
  invitationUrl: string;
  expiresAt: Date;
}): MailMessage {
  return {
    to: input.recipient,
    subject: `${input.inviterName} invited you to ${input.projectName} in Tracework`,
    text: [
      `${input.inviterName} invited you to contribute to ${input.projectName}.`,
      "Open your secure invitation to go directly to your next assigned question or review.",
      input.invitationUrl,
      `This link expires ${input.expiresAt.toISOString()}.`,
      "Do not enter identifiable patient information.",
    ].join("\n\n"),
    headers: { "X-Tracework-Message": "guest-invitation" },
  };
}
