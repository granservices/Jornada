import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { UpsertFormDefinitionDto } from './dto/upsert-form-definition.dto';
import { CreateFormRequestDto, SubmitFormResponseDto } from './dto/form-request.dto';
import { CreateOptionSourceDto, PreviewOptionSourceDto, UpdateOptionSourceDto } from './dto/option-source.dto';
import { FormsService } from './forms.service';
import { FormRequestsService } from './form-requests.service';
import { OptionSourceService } from './option-source.service';

@ApiTags('forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('forms')
export class FormsController {
  constructor(
    private readonly formsService: FormsService,
    private readonly optionSources: OptionSourceService,
    private readonly formRequests: FormRequestsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista formularios dinamicos versionados.' })
  @ApiOkResponse({ description: 'Formularios retornados com sucesso.' })
  listForms(@CurrentUser() user: AuthenticatedUser) {
    return this.formsService.listForms(user);
  }

  @Post()
  @ApiOperation({ summary: 'Publica nova versao de formulario dinamico.' })
  @ApiOkResponse({ description: 'Formulario publicado com sucesso.' })
  createForm(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertFormDefinitionDto,
  ) {
    return this.formsService.createForm(user, dto);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Solicita uma versao publicada de formulario.' })
  @ApiOkResponse({ description: 'Solicitacao criada com sucesso.' })
  createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFormRequestDto,
  ) {
    return this.formRequests.createRequest(user, dto);
  }

  @Post('requests/:formRequestId/responses')
  @ApiOperation({ summary: 'Registra a resposta do destinatario do formulario.' })
  @ApiOkResponse({ description: 'Resposta registrada com sucesso.' })
  submitResponse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('formRequestId') formRequestId: string,
    @Body() dto: SubmitFormResponseDto,
  ) {
    return this.formRequests.submitResponse(user, formRequestId, dto.values);
  }

  @Get('option-sources')
  @ApiOperation({ summary: 'Lista fontes de opcoes administradas.' })
  listOptionSources(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeInactive') includeInactive = '0',
    @Query('includeConfig') includeConfig = '0',
  ) {
    return this.optionSources.listSources(user, {
      includeInactive: includeInactive === '1',
      includeConfig: includeConfig === '1',
    });
  }

  @Post('option-sources')
  @ApiOperation({ summary: 'Cadastra uma fonte reutilizavel de opcoes.' })
  createOptionSource(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOptionSourceDto,
  ) {
    return this.optionSources.createSource(user, dto);
  }

  @Post('option-sources/preview')
  @ApiOperation({ summary: 'Testa e normaliza uma fonte de opcoes antes de salvar.' })
  previewOptionSource(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PreviewOptionSourceDto,
  ) {
    return this.optionSources.previewSource(user, dto);
  }

  @Get('option-sources/:sourceKey')
  @ApiOperation({ summary: 'Detalha uma fonte de opcoes.' })
  getOptionSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sourceKey') sourceKey: string,
  ) {
    return this.optionSources.getSource(user, sourceKey);
  }

  @Patch('option-sources/:sourceKey')
  @ApiOperation({ summary: 'Atualiza uma fonte de opcoes existente.' })
  updateOptionSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sourceKey') sourceKey: string,
    @Body() dto: UpdateOptionSourceDto,
  ) {
    return this.optionSources.updateSource(user, sourceKey, dto);
  }

  @Get('option-sources/:sourceKey/options')
  @ApiOperation({ summary: 'Consulta opcoes normalizadas de uma fonte ativa.' })
  queryOptionSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sourceKey') sourceKey: string,
    @Query('q') query = '',
    @Query('cursor') cursor?: string,
    @Query('limit') limit = '20',
  ) {
    return this.optionSources.queryOptions(user, sourceKey, query, cursor, Number.parseInt(limit, 10));
  }
}
