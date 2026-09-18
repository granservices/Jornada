import { Role, UserStatus } from '@prisma/client';
import { FormsController } from './forms.controller';

describe('FormsController requests contract', () => {
  it('forwards an authenticated response submission to QuickForms', () => {
    const requests = { submitResponse: jest.fn().mockReturnValue({ ok: true }) };
    const controller = new FormsController({} as never, {} as never, requests as never);
    const user = {
      id: 'worker-1', email: 'worker@test.local', employeeId: 'EMP-1',
      roles: [Role.EMPLOYEE], status: UserStatus.ACTIVE,
    };

    const result = controller.submitResponse(user, 'request-1', { values: { choice: 'yes' } });

    expect(requests.submitResponse).toHaveBeenCalledWith(user, 'request-1', { choice: 'yes' });
    expect(result).toEqual({ ok: true });
  });
});
