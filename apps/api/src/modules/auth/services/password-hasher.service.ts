import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordHasherService {
  hash(value: string) {
    return argon2.hash(value);
  }

  verify(hash: string, rawValue: string) {
    return argon2.verify(hash, rawValue);
  }
}
