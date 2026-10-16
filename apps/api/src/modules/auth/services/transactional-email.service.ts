import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

type InvitationDeliveryStatus = 'SENT' | 'PREVIEW';

@Injectable()
export class TransactionalEmailService {
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  assertCanDeliverInvitations() {
    if (this.hasSmtpConfig() || process.env.NODE_ENV !== 'production') {
      return;
    }

    throw new ServiceUnavailableException(
      'Envio de email nao configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS.',
    );
  }

  async sendAdministrativeInvitation(input: {
    to: string;
    fullName: string;
    token: string;
    expiresAt: Date;
  }): Promise<{ status: InvitationDeliveryStatus }> {
    if (!this.hasSmtpConfig()) {
      return { status: 'PREVIEW' };
    }

    const acceptUrl = this.buildAcceptInvitationUrl(input.token);
    const appName = 'Neo Jornada';

    await this.getTransporter().sendMail({
      from: this.getFromAddress(),
      to: input.to,
      subject: 'Convite para acessar o Neo Jornada',
      text: [
        `Ola, ${input.fullName}.`,
        '',
        'Sua conta no Neo Jornada foi criada. Acesse o link abaixo para definir sua senha:',
        acceptUrl,
        '',
        `Este convite expira em ${this.formatDate(input.expiresAt)}.`,
        'Se voce nao esperava este convite, ignore esta mensagem.',
      ].join('\n'),
      html: this.buildInvitationHtml({
        appName,
        fullName: input.fullName,
        acceptUrl,
        expiresAt: input.expiresAt,
      }),
    });

    return { status: 'SENT' };
  }

  private hasSmtpConfig() {
    return Boolean(
      this.config.get<string>('SMTP_HOST') &&
        this.config.get<string>('SMTP_USER') &&
        this.config.get<string>('SMTP_PASS'),
    );
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.getOrThrow<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT') ?? 465;
    const secure = this.config.get<boolean>('SMTP_SECURE') ?? port === 465;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      pool: true,
      auth: {
        user: this.config.getOrThrow<string>('SMTP_USER'),
        pass: this.config.getOrThrow<string>('SMTP_PASS'),
      },
      tls: {
        servername: host,
      },
    });

    return this.transporter;
  }

  private getFromAddress() {
    return (
      this.config.get<string>('SMTP_FROM') ||
      `"Neo Jornada" <${this.config.getOrThrow<string>('SMTP_USER')}>`
    );
  }

  private buildAcceptInvitationUrl(token: string) {
    const baseUrl = this.config.getOrThrow<string>('JORNADA_PUBLIC_BASE_URL');
    const url = new URL('/convite', baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private buildInvitationHtml(input: {
    appName: string;
    fullName: string;
    acceptUrl: string;
    expiresAt: Date;
  }) {
    const fullName = this.escapeHtml(input.fullName);
    const acceptUrl = this.escapeHtml(input.acceptUrl);

    return [
      '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#17202a">',
      `<h1 style="font-size:20px;margin:0 0 16px">Convite para acessar o ${input.appName}</h1>`,
      `<p>Ola, ${fullName}.</p>`,
      '<p>Sua conta foi criada. Defina sua senha pelo link abaixo.</p>',
      `<p><a href="${acceptUrl}" style="display:inline-block;background:#9f2635;color:#fff;padding:12px 16px;text-decoration:none;border-radius:4px">Definir senha</a></p>`,
      `<p>Este convite expira em ${this.escapeHtml(this.formatDate(input.expiresAt))}.</p>`,
      '<p>Se voce nao esperava este convite, ignore esta mensagem.</p>',
      '</div>',
    ].join('');
  }

  private formatDate(date: Date) {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(date);
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
