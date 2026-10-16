import { Role, UserStatus } from '@prisma/client';
import type { AuditService } from '../../../common/audit/audit.service';
import type { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import type { DomainEventOutboxService } from '../../../common/events/domain-event-outbox.service';
import type { PrismaService } from '../../../database/prisma.service';
import type { AuthTokenService } from './auth-token.service';
import type { PasswordHasherService } from './password-hasher.service';
import type { TransactionalEmailService } from './transactional-email.service';
import { AuthUserProvisioningService } from './auth-user-provisioning.service';

describe('AuthUserProvisioningService', () => {
  const admin: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@granservices.com.br',
    employeeId: null,
    roles: [Role.ADMIN],
    status: UserStatus.ACTIVE,
  };

  let prisma: {
    application: { findMany: jest.Mock };
    user: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock };
    administrativeInvitation: { findUnique: jest.Mock; updateMany: jest.Mock; update: jest.Mock; create: jest.Mock };
    authSession: { updateMany: jest.Mock };
    userApplicationAccess: { create: jest.Mock };
    userApplicationRole: { create: jest.Mock };
    auditLog: { create: jest.Mock };
    domainEventOutbox: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let transactionalEmail: {
    assertCanDeliverInvitations: jest.Mock;
    sendAdministrativeInvitation: jest.Mock;
  };
  let service: AuthUserProvisioningService;

  beforeEach(() => {
    prisma = {
      application: { findMany: jest.fn() },
      user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
      administrativeInvitation: { findUnique: jest.fn(), updateMany: jest.fn(), update: jest.fn(), create: jest.fn() },
      authSession: { updateMany: jest.fn() },
      userApplicationAccess: { create: jest.fn() },
      userApplicationRole: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      domainEventOutbox: { upsert: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(prisma),
      ),
    };

    prisma.application.findMany.mockResolvedValue([
      { id: 'app-jornada', code: 'JORNADA' },
      { id: 'app-Tickets', code: 'TICKETS' },
    ]);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-1' });
    prisma.administrativeInvitation.create.mockResolvedValue({
      id: 'invite-1',
      expiresAt: new Date('2026-10-30T10:00:00.000Z'),
    });
    transactionalEmail = {
      assertCanDeliverInvitations: jest.fn(),
      sendAdministrativeInvitation: jest.fn().mockResolvedValue({ status: 'PREVIEW' }),
    };

    service = new AuthUserProvisioningService(
      prisma as unknown as PrismaService,
      {
        recordWith: jest.fn(),
      } as unknown as AuditService,
      {
        recordWith: jest.fn(),
      } as unknown as DomainEventOutboxService,
      {
        generateOpaqueToken: jest.fn().mockReturnValue('raw-invite-secret'),
        hashOpaqueToken: jest.fn().mockReturnValue('hashed-invite-secret'),
      } as unknown as AuthTokenService,
      {
        hash: jest.fn().mockResolvedValue('new-password-hash'),
      } as unknown as PasswordHasherService,
      transactionalEmail as unknown as TransactionalEmailService,
    );
  });

  it('creates a pending account with explicit contextual grants and a queued invitation', async () => {
    const response = await service.invite(admin, {
      email: '  pessoa@example.com ',
      fullName: ' Pessoa Convidada ',
      employeeId: ' GRN-001 ',
      reason: 'ONBOARDING',
      applications: [
        { code: 'JORNADA', roles: ['MEMBER'], isDefault: true },
        { code: 'TICKETS', roles: ['REQUESTER'], isDefault: false },
      ],
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'pessoa@example.com',
          status: 'PENDING',
          passwordHash: null,
          roles: [],
        }),
      }),
    );
    expect(prisma.userApplicationAccess.create).toHaveBeenCalledTimes(2);
    expect(prisma.userApplicationRole.create).toHaveBeenCalledTimes(2);
    expect(prisma.administrativeInvitation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          tokenHash: 'hashed-invite-secret',
          createdByUserId: 'admin-1',
        }),
      }),
    );
    expect(response).toEqual({
      item: {
        invitationId: 'invite-1',
        userId: 'user-1',
        email: 'pessoa@example.com',
        status: 'PENDING',
        deliveryStatus: 'PREVIEW',
        expiresAt: '2026-10-30T10:00:00.000Z',
        previewToken: 'raw-invite-secret',
      },
    });
    expect(transactionalEmail.assertCanDeliverInvitations).toHaveBeenCalled();
    expect(transactionalEmail.sendAdministrativeInvitation).toHaveBeenCalledWith({
      to: 'pessoa@example.com',
      fullName: 'Pessoa Convidada',
      token: 'raw-invite-secret',
      expiresAt: new Date('2026-10-30T10:00:00.000Z'),
    });
  });

  it('creates an invitation for a catalog application that uses default contextual roles', async () => {
    prisma.application.findMany.mockResolvedValue([
      { id: 'app-crew', code: 'CREW_OPS' },
    ]);

    await service.invite(admin, {
      email: 'crew@example.com',
      fullName: 'Pessoa Crew',
      reason: 'ONBOARDING',
      applications: [
        { code: 'CREW_OPS', roles: ['MEMBER'], isDefault: true },
      ],
    });

    expect(prisma.userApplicationRole.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationId: 'app-crew',
        roleCode: 'MEMBER',
      }),
    });
  });

  it('activates a pending account once when its valid invitation is accepted', async () => {
    prisma.administrativeInvitation.findUnique.mockResolvedValue({
      id: 'invite-1',
      userId: 'user-1',
      expiresAt: new Date('2026-10-30T10:00:00.000Z'),
      consumedAt: null,
      invalidatedAt: null,
      user: { id: 'user-1', status: 'PENDING', email: 'pessoa@example.com' },
    });
    prisma.administrativeInvitation.updateMany.mockResolvedValue({ count: 1 });

    const response = await service.acceptInvitation({
      token: 'raw-invite-secret',
      password: 'NovaSenha@123',
    });

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.administrativeInvitation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'invite-1', consumedAt: null }),
        data: expect.objectContaining({ consumedAt: expect.any(Date) }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          passwordHash: 'new-password-hash',
          emailVerifiedAt: expect.any(Date),
        }),
      }),
    );
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', revokedAt: null },
        data: expect.objectContaining({ revokedReason: 'invitation-accepted' }),
      }),
    );
    expect(response).toEqual({ userId: 'user-1' });
  });

  it('blocks an account, revokes sessions and records the administrative reason', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'pessoa@example.com',
      status: 'ACTIVE',
      roles: [],
    });

    await service.changeAccountStatus(admin, 'user-1', {
      status: 'BLOCKED',
      reason: 'SECURITY',
      reasonComment: 'Dispositivo reportado como perdido.',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { status: 'BLOCKED' },
    });
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', revokedAt: null },
        data: expect.objectContaining({ revokedReason: 'account-blocked' }),
      }),
    );
  });

  it('revokes active sessions without changing the account state', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'pessoa@example.com',
      status: 'ACTIVE',
      roles: [],
    });

    await service.revokeSessions(admin, 'user-1', {
      reason: 'SECURITY',
      reasonComment: 'Troca preventiva de dispositivo.',
    });

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', revokedAt: null },
        data: expect.objectContaining({ revokedReason: 'administrative-session-revocation' }),
      }),
    );
  });

  it('invalidates the active invitation before queuing a replacement', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'pessoa@example.com',
      status: 'PENDING',
      roles: [],
      person: { fullName: 'Pessoa Convidada' },
    });
    prisma.administrativeInvitation.create.mockResolvedValue({
      id: 'invite-2',
      expiresAt: new Date('2026-09-10T10:00:00.000Z'),
    });

    const response = await service.resendInvitation(admin, 'user-1', {
      reason: 'ACCESS_CORRECTION',
    });

    expect(prisma.administrativeInvitation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1', consumedAt: null, invalidatedAt: null }),
        data: expect.objectContaining({ invalidatedAt: expect.any(Date) }),
      }),
    );
    expect(response.item).toEqual(
      expect.objectContaining({ invitationId: 'invite-2', userId: 'user-1', status: 'PENDING' }),
    );
    expect(transactionalEmail.sendAdministrativeInvitation).toHaveBeenCalledWith({
      to: 'pessoa@example.com',
      fullName: 'Pessoa Convidada',
      token: 'raw-invite-secret',
      expiresAt: new Date('2026-09-10T10:00:00.000Z'),
    });
  });
});
