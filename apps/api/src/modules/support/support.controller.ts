import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AddSupportCaseMessageDto } from './dto/add-support-case-message.dto';
import { CreateSupportCaseDto } from './dto/create-support-case.dto';
import { ListSupportCasesDto } from './dto/list-support-cases.dto';
import { RateSupportCaseDto } from './dto/rate-support-case.dto';
import { ReopenSupportCaseDto } from './dto/reopen-support-case.dto';
import { SuggestSupportTriageDto } from './dto/suggest-support-triage.dto';
import {
  DecideApprovalDto,
  RequestManualApprovalDto,
  UpsertApprovalRuleDto,
} from './dto/support-approval.dto';
import { UpdateSupportCaseDto } from './dto/update-support-case.dto';
import {
  UpsertSupportDepartmentDto,
  UpsertSupportRoutingRuleDto,
  UpsertSupportTeamDto,
  UpsertSupportTeamMemberDto,
  UpsertSupportTopicDto,
  UpsertSupportTopicFormDto,
} from './dto/upsert-support-catalog.dto';
import { SupportService } from './support.service';

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('teams')
  @ApiOperation({ summary: 'Lista equipes ativas de atendimento.' })
  @ApiOkResponse({ description: 'Equipes retornadas com sucesso.' })
  listTeams() {
    return this.supportService.listTeams();
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Lista setores, assuntos e formularios ativos.' })
  @ApiOkResponse({ description: 'Catalogo retornado com sucesso.' })
  listCatalog() {
    return this.supportService.listCatalog();
  }

  @Get('catalog/admin')
  @ApiOperation({ summary: 'Lista o catalogo administrativo de atendimento.' })
  @ApiOkResponse({ description: 'Catalogo administrativo retornado com sucesso.' })
  listCatalogAdmin(@CurrentUser() user: AuthenticatedUser) {
    return this.supportService.listCatalogAdmin(user);
  }

  @Get('catalog/assignees')
  @ApiOperation({ summary: 'Lista usuarios que podem atuar como atendentes.' })
  @ApiOkResponse({ description: 'Atendentes retornados com sucesso.' })
  listAssignableUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.supportService.listAssignableUsers(user);
  }

  @Post('catalog/departments')
  @ApiOperation({ summary: 'Cria ou atualiza um setor de atendimento pelo codigo.' })
  @ApiOkResponse({ description: 'Setor salvo com sucesso.' })
  upsertDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertSupportDepartmentDto,
  ) {
    return this.supportService.upsertDepartment(user, dto);
  }

  @Patch('catalog/departments/:departmentId')
  @ApiOperation({ summary: 'Atualiza um setor de atendimento.' })
  @ApiOkResponse({ description: 'Setor atualizado com sucesso.' })
  updateDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('departmentId') departmentId: string,
    @Body() dto: UpsertSupportDepartmentDto,
  ) {
    return this.supportService.updateDepartment(user, departmentId, dto);
  }

  @Delete('catalog/departments/:departmentId')
  @ApiOperation({ summary: 'Exclui ou inativa um setor sem quebrar vinculos.' })
  @ApiOkResponse({ description: 'Setor excluido ou inativado com sucesso.' })
  deleteDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('departmentId') departmentId: string,
  ) {
    return this.supportService.deleteDepartment(user, departmentId);
  }

  @Post('catalog/topics')
  @ApiOperation({ summary: 'Cria ou atualiza um assunto de atendimento pelo codigo.' })
  @ApiOkResponse({ description: 'Assunto salvo com sucesso.' })
  upsertTopic(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertSupportTopicDto,
  ) {
    return this.supportService.upsertTopic(user, dto);
  }

  @Patch('catalog/topics/:topicId')
  @ApiOperation({ summary: 'Atualiza um assunto de atendimento.' })
  @ApiOkResponse({ description: 'Assunto atualizado com sucesso.' })
  updateTopic(
    @CurrentUser() user: AuthenticatedUser,
    @Param('topicId') topicId: string,
    @Body() dto: UpsertSupportTopicDto,
  ) {
    return this.supportService.updateTopic(user, topicId, dto);
  }

  @Delete('catalog/topics/:topicId')
  @ApiOperation({ summary: 'Exclui ou inativa um assunto sem quebrar vinculos.' })
  @ApiOkResponse({ description: 'Assunto excluido ou inativado com sucesso.' })
  deleteTopic(
    @CurrentUser() user: AuthenticatedUser,
    @Param('topicId') topicId: string,
  ) {
    return this.supportService.deleteTopic(user, topicId);
  }

  @Post('catalog/teams')
  @ApiOperation({ summary: 'Cria ou atualiza uma equipe de atendimento pelo codigo.' })
  @ApiOkResponse({ description: 'Equipe salva com sucesso.' })
  upsertTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertSupportTeamDto,
  ) {
    return this.supportService.upsertTeam(user, dto);
  }

  @Patch('catalog/teams/:teamId')
  @ApiOperation({ summary: 'Atualiza uma equipe de atendimento.' })
  @ApiOkResponse({ description: 'Equipe atualizada com sucesso.' })
  updateTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Body() dto: UpsertSupportTeamDto,
  ) {
    return this.supportService.updateTeam(user, teamId, dto);
  }

  @Delete('catalog/teams/:teamId')
  @ApiOperation({ summary: 'Exclui ou inativa uma equipe sem quebrar vinculos.' })
  @ApiOkResponse({ description: 'Equipe excluida ou inativada com sucesso.' })
  deleteTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
  ) {
    return this.supportService.deleteTeam(user, teamId);
  }

  @Post('catalog/team-members')
  @ApiOperation({ summary: 'Vincula um atendente a uma equipe.' })
  @ApiOkResponse({ description: 'Membro da equipe salvo com sucesso.' })
  upsertTeamMember(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertSupportTeamMemberDto,
  ) {
    return this.supportService.upsertTeamMember(user, dto);
  }

  @Delete('catalog/team-members/:memberId')
  @ApiOperation({ summary: 'Remove ou inativa um vinculo de atendente.' })
  @ApiOkResponse({ description: 'Vinculo removido ou inativado com sucesso.' })
  deleteTeamMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
  ) {
    return this.supportService.deleteTeamMember(user, memberId);
  }

  @Post('catalog/routing-rules')
  @ApiOperation({ summary: 'Cria regra de roteamento por setor e assunto.' })
  @ApiOkResponse({ description: 'Regra salva com sucesso.' })
  upsertRoutingRule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertSupportRoutingRuleDto,
  ) {
    return this.supportService.upsertRoutingRule(user, dto);
  }

  @Patch('catalog/routing-rules/:ruleId')
  @ApiOperation({ summary: 'Atualiza regra de roteamento.' })
  @ApiOkResponse({ description: 'Regra atualizada com sucesso.' })
  updateRoutingRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpsertSupportRoutingRuleDto,
  ) {
    return this.supportService.updateRoutingRule(user, ruleId, dto);
  }

  @Delete('catalog/routing-rules/:ruleId')
  @ApiOperation({ summary: 'Remove uma regra de roteamento.' })
  @ApiOkResponse({ description: 'Regra removida com sucesso.' })
  deleteRoutingRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ruleId') ruleId: string,
  ) {
    return this.supportService.deleteRoutingRule(user, ruleId);
  }

  @Post('catalog/topics/:topicId/forms')
  @ApiOperation({ summary: 'Cria nova versao de formulario para um assunto.' })
  @ApiOkResponse({ description: 'Formulario salvo com sucesso.' })
  createTopicForm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('topicId') topicId: string,
    @Body() dto: UpsertSupportTopicFormDto,
  ) {
    return this.supportService.createTopicForm(user, topicId, dto);
  }

  @Get('catalog/approval-rules')
  @ApiOperation({ summary: 'Lista regras administrativas de aprovacao.' })
  @ApiOkResponse({ description: 'Regras de aprovacao retornadas com sucesso.' })
  listApprovalRules(@CurrentUser() user: AuthenticatedUser) {
    return this.supportService.listApprovalRules(user);
  }

  @Post('catalog/approval-rules')
  @ApiOperation({ summary: 'Cria uma regra de aprovacao.' })
  @ApiOkResponse({ description: 'Regra de aprovacao criada com sucesso.' })
  createApprovalRule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertApprovalRuleDto,
  ) {
    return this.supportService.createApprovalRule(user, dto);
  }

  @Patch('catalog/approval-rules/:ruleId')
  @ApiOperation({ summary: 'Atualiza uma regra de aprovacao.' })
  @ApiOkResponse({ description: 'Regra de aprovacao atualizada com sucesso.' })
  updateApprovalRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpsertApprovalRuleDto,
  ) {
    return this.supportService.updateApprovalRule(user, ruleId, dto);
  }

  @Post('triage/suggestions')
  @ApiOperation({ summary: 'Sugere setor e assunto por regra local.' })
  @ApiOkResponse({ description: 'Sugestao retornada com sucesso.' })
  suggestTriage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SuggestSupportTriageDto,
  ) {
    return this.supportService.suggestTriage(user, dto);
  }

  @Get('cases')
  @ApiOperation({ summary: 'Lista atendimentos conforme usuario autenticado.' })
  @ApiOkResponse({ description: 'Atendimentos retornados com sucesso.' })
  listCases(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSupportCasesDto,
  ) {
    return this.supportService.listCases(user, query);
  }

  @Post('cases')
  @ApiOperation({ summary: 'Abre um atendimento para o colaborador.' })
  @ApiOkResponse({ description: 'Atendimento criado com sucesso.' })
  createCase(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupportCaseDto,
  ) {
    return this.supportService.createCase(user, dto);
  }

  @Get('approvals')
  @ApiOperation({ summary: 'Lista aprovacoes pendentes ou recentes.' })
  @ApiOkResponse({ description: 'Aprovacoes retornadas com sucesso.' })
  listApprovals(@CurrentUser() user: AuthenticatedUser) {
    return this.supportService.listApprovals(user);
  }

  @Post('cases/:supportCaseId/approvals')
  @ApiOperation({ summary: 'Solicita aprovacao manual para um atendimento.' })
  @ApiOkResponse({ description: 'Aprovacao solicitada com sucesso.' })
  requestManualApproval(
    @CurrentUser() user: AuthenticatedUser,
    @Param('supportCaseId') supportCaseId: string,
    @Body() dto: RequestManualApprovalDto,
  ) {
    return this.supportService.requestManualApproval(user, supportCaseId, dto);
  }

  @Post('approvals/:approvalRequestId/decision')
  @ApiOperation({ summary: 'Registra decisao de uma aprovacao.' })
  @ApiOkResponse({ description: 'Decisao registrada com sucesso.' })
  decideApproval(
    @CurrentUser() user: AuthenticatedUser,
    @Param('approvalRequestId') approvalRequestId: string,
    @Body() dto: DecideApprovalDto,
  ) {
    return this.supportService.decideApproval(user, approvalRequestId, dto);
  }

  @Get('cases/:supportCaseId')
  @ApiOperation({ summary: 'Detalha um atendimento.' })
  @ApiOkResponse({ description: 'Atendimento retornado com sucesso.' })
  getCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('supportCaseId') supportCaseId: string,
    @Query('previewReference') previewReference?: string,
  ) {
    return this.supportService.getCase(user, supportCaseId, previewReference);
  }

  @Patch('cases/:supportCaseId')
  @ApiOperation({ summary: 'Atualiza fila, responsavel, status ou prioridade.' })
  @ApiOkResponse({ description: 'Atendimento atualizado com sucesso.' })
  updateCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('supportCaseId') supportCaseId: string,
    @Body() dto: UpdateSupportCaseDto,
  ) {
    return this.supportService.updateCase(user, supportCaseId, dto);
  }

  @Post('cases/:supportCaseId/messages')
  @ApiOperation({ summary: 'Adiciona uma mensagem ao atendimento.' })
  @ApiOkResponse({ description: 'Mensagem registrada com sucesso.' })
  addMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('supportCaseId') supportCaseId: string,
    @Body() dto: AddSupportCaseMessageDto,
  ) {
    return this.supportService.addMessage(user, supportCaseId, dto);
  }

  @Post('cases/:supportCaseId/reopen')
  @ApiOperation({ summary: 'Reabre um atendimento resolvido dentro da janela permitida.' })
  @ApiOkResponse({ description: 'Atendimento reaberto com sucesso.' })
  reopenCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('supportCaseId') supportCaseId: string,
    @Body() dto: ReopenSupportCaseDto,
  ) {
    return this.supportService.reopenCase(user, supportCaseId, dto);
  }

  @Post('cases/:supportCaseId/rating')
  @ApiOperation({ summary: 'Avalia um atendimento resolvido.' })
  @ApiOkResponse({ description: 'Avaliacao registrada com sucesso.' })
  rateCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('supportCaseId') supportCaseId: string,
    @Body() dto: RateSupportCaseDto,
  ) {
    return this.supportService.rateCase(user, supportCaseId, dto);
  }
}
