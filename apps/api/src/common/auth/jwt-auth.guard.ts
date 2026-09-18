import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAccessTokenService } from './jwt-access-token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtAccessTokenService: JwtAccessTokenService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<
      Request & { user?: Awaited<ReturnType<JwtAccessTokenService['verifyToken']>> }
    >();

    request.user = await this.jwtAccessTokenService.verifyBearerHeader(
      request.headers.authorization,
    );

    return true;
  }
}
