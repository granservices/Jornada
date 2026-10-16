import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { TransactionalEmailService } from './transactional-email.service';

describe('TransactionalEmailService', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  it('uses preview delivery outside production when SMTP is not configured', async () => {
    process.env.NODE_ENV = 'test';
    const service = new TransactionalEmailService(
      new ConfigService({ JORNADA_PUBLIC_BASE_URL: 'http://localhost:3006' }),
    );

    expect(() => service.assertCanDeliverInvitations()).not.toThrow();
    await expect(
      service.sendAdministrativeInvitation({
        to: 'pessoa@example.com',
        fullName: 'Pessoa Convidada',
        token: 'raw-token',
        expiresAt: new Date('2026-10-30T10:00:00.000Z'),
      }),
    ).resolves.toEqual({ status: 'PREVIEW' });
  });

  it('blocks production invitation delivery when SMTP is incomplete', () => {
    process.env.NODE_ENV = 'production';
    const service = new TransactionalEmailService(
      new ConfigService({ JORNADA_PUBLIC_BASE_URL: 'https://jornada.granhub.com.br' }),
    );

    expect(() => service.assertCanDeliverInvitations()).toThrow(
      ServiceUnavailableException,
    );
  });

  it('sends an invitation through the configured SMTP transporter', async () => {
    process.env.NODE_ENV = 'production';
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'message-1' });
    const createTransport = jest
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue({ sendMail } as never);
    const service = new TransactionalEmailService(
      new ConfigService({
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: 465,
        SMTP_SECURE: true,
        SMTP_USER: 'mailer@example.com',
        SMTP_PASS: 'smtp-secret',
        SMTP_FROM: 'Neo Jornada <mailer@example.com>',
        JORNADA_PUBLIC_BASE_URL: 'https://jornada.example.com',
      }),
    );

    await expect(
      service.sendAdministrativeInvitation({
        to: 'pessoa@example.com',
        fullName: 'Pessoa Convidada',
        token: 'raw-token',
        expiresAt: new Date('2026-10-30T10:00:00.000Z'),
      }),
    ).resolves.toEqual({ status: 'SENT' });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        pool: true,
        auth: {
          user: 'mailer@example.com',
          pass: 'smtp-secret',
        },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Neo Jornada <mailer@example.com>',
        to: 'pessoa@example.com',
        subject: 'Convite para acessar o Neo Jornada',
        text: expect.stringContaining(
          'https://jornada.example.com/convite?token=raw-token',
        ),
        html: expect.stringContaining('Pessoa Convidada'),
      }),
    );
  });
});
