import { Injectable } from '@nestjs/common';
import {
  SupportNotificationPayload,
  SupportNotificationPort,
} from '../ports/support-notification.port';

@Injectable()
export class NoopSupportNotificationAdapter implements SupportNotificationPort {
  async notifyCaseUpdate(_payload: SupportNotificationPayload) {
    return undefined;
  }
}
