import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { getRequestContext } from '../../common/http/request-context';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ListUserApplicationAccessDto } from './dto/list-user-application-access.dto';
import { LoginDto } from './dto/login.dto';
import { ConsumeSsoTicketDto } from './dto/consume-sso-ticket.dto';
import { CreateSsoTicketDto } from './dto/create-sso-ticket.dto';
import { CreateManagedApplicationDto } from './dto/create-managed-application.dto';
import { CreateAdministrativeInvitationDto } from './dto/create-administrative-invitation.dto';
import { AcceptAdministrativeInvitationDto } from './dto/accept-administrative-invitation.dto';
import { UpdateManagedUserStatusDto } from './dto/update-managed-user-status.dto';
import { RevokeManagedUserSessionsDto } from './dto/revoke-managed-user-sessions.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserApplicationAccessDto } from './dto/update-user-application-access.dto';
import { UpdateManagedApplicationDto } from './dto/update-managed-application.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { AuthApplicationAdminService } from './services/auth-application-admin.service';
import { AuthSsoTicketService } from './services/auth-sso-ticket.service';
import { AuthUserProvisioningService } from './services/auth-user-provisioning.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authApplicationAdminService: AuthApplicationAdminService,
    private readonly authSsoTicketService: AuthSsoTicketService,
    private readonly authUserProvisioningService: AuthUserProvisioningService,
  ) {}

  @Get('applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista as aplicacoes que o usuario autenticado pode acessar.',
  })
  @ApiOkResponse({ description: 'Aplicacoes retornadas com sucesso.' })
  listApplications(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listApplications(user.id);
  }

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retorna o perfil do usuario autenticado com ajustes pessoais.',
  })
  @ApiOkResponse({ description: 'Perfil retornado com sucesso.' })
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMyProfile(user);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualiza ajustes pessoais editaveis do proprio usuario.',
  })
  @ApiOkResponse({ description: 'Ajustes pessoais salvos com sucesso.' })
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMyProfileDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
  ) {
    return this.authService.updateMyProfile(
      user,
      dto,
      getRequestContext(request as Request & { id?: string }, ipAddress),
    );
  }

  @Post('sso-tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Emite um codigo de curta duracao para abrir outro aplicativo.',
  })
  issueSsoTicket(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSsoTicketDto,
  ) {
    return this.authSsoTicketService.issue(user, dto.applicationCode);
  }

  @Post('sso-tickets/consume')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Consome uma unica vez o codigo para iniciar sessao no aplicativo de destino.',
  })
  consumeSsoTicket(
    @Body() dto: ConsumeSsoTicketDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
  ) {
    return this.authSsoTicketService.consume(
      dto.ticket,
      getRequestContext(request as Request & { id?: string }, ipAddress),
    );
  }

  @Get('admin/applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista o catalogo central de aplicacoes para administracao.',
  })
  @ApiOkResponse({ description: 'Catalogo de apps retornado com sucesso.' })
  listManagedApplications(@CurrentUser() user: AuthenticatedUser) {
    return this.authApplicationAdminService.listApplications(user);
  }

  @Post('admin/applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cadastra uma aplicacao no catalogo central.' })
  @ApiCreatedResponse({ description: 'Aplicacao cadastrada com sucesso.' })
  createManagedApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateManagedApplicationDto,
  ) {
    return this.authApplicationAdminService.createApplication(user, dto);
  }

  @Put('admin/applications/:applicationCode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza uma aplicacao do catalogo central.' })
  @ApiOkResponse({ description: 'Aplicacao atualizada com sucesso.' })
  updateManagedApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationCode') applicationCode: string,
    @Body() dto: UpdateManagedApplicationDto,
  ) {
    return this.authApplicationAdminService.updateApplication(
      user,
      applicationCode,
      dto,
    );
  }

  @Get('admin/users/application-access')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista usuarios com seus acessos e papeis por aplicacao.',
  })
  @ApiOkResponse({ description: 'Usuarios retornados com sucesso.' })
  listUserApplicationAccesses(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListUserApplicationAccessDto,
  ) {
    return this.authApplicationAdminService.listUserAccesses(user, query);
  }

  @Put('admin/users/:userId/applications/:applicationCode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Concede, revoga ou redefine acesso e papeis por aplicacao.',
  })
  @ApiOkResponse({ description: 'Acesso por aplicacao salvo com sucesso.' })
  setUserApplicationAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Param('applicationCode') applicationCode: string,
    @Body() dto: UpdateUserApplicationAccessDto,
  ) {
    return this.authApplicationAdminService.setUserApplicationAccess(
      user,
      userId,
      applicationCode,
      dto,
    );
  }

  @Post('admin/users/invitations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cria uma conta pendente e agenda a entrega de convite administrativo.',
  })
  @ApiCreatedResponse({ description: 'Convite administrativo criado com sucesso.' })
  createAdministrativeInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAdministrativeInvitationDto,
  ) {
    return this.authUserProvisioningService.invite(user, dto);
  }

  @Post('admin/users/:userId/invitations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalida convite pendente e agenda novo convite administrativo.' })
  resendAdministrativeInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: RevokeManagedUserSessionsDto,
  ) {
    return this.authUserProvisioningService.resendInvitation(user, userId, dto);
  }

  @Put('admin/users/:userId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Altera o estado administrativo de uma conta.' })
  updateManagedUserStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateManagedUserStatusDto,
  ) {
    return this.authUserProvisioningService.changeAccountStatus(user, userId, dto);
  }

  @Post('admin/users/:userId/sessions/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoga todas as sessoes ativas sem mudar o estado da conta.' })
  revokeManagedUserSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: RevokeManagedUserSessionsDto,
  ) {
    return this.authUserProvisioningService.revokeSessions(user, userId, dto);
  }

  @Post('invitations/accept')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @ApiOperation({ summary: 'Aceita um convite administrativo e abre a sessao inicial.' })
  @ApiOkResponse({ description: 'Convite aceito com sucesso.' })
  async acceptAdministrativeInvitation(
    @Body() dto: AcceptAdministrativeInvitationDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
  ) {
    const accepted = await this.authUserProvisioningService.acceptInvitation(dto);
    return this.authService.issueSessionForUserId(
      accepted.userId,
      getRequestContext(request as Request & { id?: string }, ipAddress),
    );
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Cria uma conta e abre uma sessao inicial.' })
  @ApiCreatedResponse({ description: 'Conta criada com sucesso.' })
  register(
    @Body() dto: RegisterDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
  ) {
    return this.authService.register(
      dto,
      getRequestContext(request as Request & { id?: string }, ipAddress),
    );
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Autentica um usuario por matricula ou email e senha.',
  })
  @ApiOkResponse({ description: 'Login realizado com sucesso.' })
  login(
    @Body() dto: LoginDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
  ) {
    return this.authService.login(
      dto,
      getRequestContext(request as Request & { id?: string }, ipAddress),
    );
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
    return this.authService.refresh(
      dto,
      getRequestContext(request as Request & { id?: string }, ipAddress),
    );
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoga a sessao associada ao refresh token.' })
  @ApiOkResponse({ description: 'Logout realizado com sucesso.' })
  logout(
    @Body() dto: LogoutDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
  ) {
    return this.authService.logout(
      dto,
      getRequestContext(request as Request & { id?: string }, ipAddress),
    );
  }

  @Post('forgot-password')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @ApiOperation({ summary: 'Solicita redefinicao de senha.' })
  @ApiAcceptedResponse({ description: 'Solicitacao recebida.' })
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
  ) {
    return this.authService.forgotPassword(
      dto,
      getRequestContext(request as Request & { id?: string }, ipAddress),
    );
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @ApiOperation({
    summary: 'Redefine a senha a partir do token de recuperacao.',
  })
  @ApiOkResponse({ description: 'Senha redefinida com sucesso.' })
  resetPassword(
    @Body() dto: ResetPasswordDto,
    @Ip() ipAddress: string,
    @Req() request: Request,
  ) {
    return this.authService.resetPassword(
      dto,
      getRequestContext(request as Request & { id?: string }, ipAddress),
    );
  }
}
