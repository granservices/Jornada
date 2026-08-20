import { Body, Controller, HttpCode, Ip, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiAcceptedResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Cria uma conta e abre uma sessao inicial.' })
  @ApiCreatedResponse({ description: 'Conta criada com sucesso.' })
  register(
    @Body() dto: RegisterDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
  ) {
    return this.authService.register(dto, {
      ipAddress,
      userAgent: request.headers['user-agent'],
    });
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Autentica um usuario por email e senha.' })
  @ApiOkResponse({ description: 'Login realizado com sucesso.' })
  login(
    @Body() dto: LoginDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
  ) {
    return this.authService.login(dto, {
      ipAddress,
      userAgent: request.headers['user-agent'],
    });
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renova a sessao a partir do refresh token.' })
  @ApiOkResponse({ description: 'Tokens renovados com sucesso.' })
  refresh(
    @Body() dto: RefreshSessionDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
  ) {
    return this.authService.refresh(dto, {
      ipAddress,
      userAgent: request.headers['user-agent'],
    });
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoga a sessao associada ao refresh token.' })
  @ApiOkResponse({ description: 'Logout realizado com sucesso.' })
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto);
  }

  @Post('forgot-password')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @ApiOperation({ summary: 'Solicita redefinicao de senha.' })
  @ApiAcceptedResponse({ description: 'Solicitacao recebida.' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @ApiOperation({
    summary: 'Redefine a senha a partir do token de recuperacao.',
  })
  @ApiOkResponse({ description: 'Senha redefinida com sucesso.' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
