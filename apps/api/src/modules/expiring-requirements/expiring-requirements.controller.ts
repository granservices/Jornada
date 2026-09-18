import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { FindDrakeWorkerDto } from '../boarding-schedule/dto/find-drake-worker.dto';
import { ListDrakeWorkerRequirementsDto } from './dto/list-drake-worker-requirements.dto';
import { EmployeeRequirementsService } from './services/employee-requirements.service';

@ApiTags('expiring-requirements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expiring-requirements')
export class ExpiringRequirementsController {
  constructor(private readonly requirements: EmployeeRequirementsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lista os proximos vencimentos de qualificacao do colaborador autenticado.' })
  @ApiOkResponse({ description: 'Vencimentos retornados pelo contrato interno do Jornada.' })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.requirements.listMine(user);
  }

  @Get('preview/workers')
  @ApiOperation({ summary: 'Localiza colaboradores no Drake para validar vencimentos em modo administrativo.' })
  findPreviewWorkers(@CurrentUser() user: AuthenticatedUser, @Query() query: FindDrakeWorkerDto) {
    return this.requirements.findPreviewWorkers(user, query.q);
  }

  @Get('preview')
  @ApiOperation({ summary: 'Consulta vencimentos de um colaborador no modo de validacao administrativa.' })
  listPreview(@CurrentUser() user: AuthenticatedUser, @Query() query: ListDrakeWorkerRequirementsDto) {
    return this.requirements.listPreviewRequirements(user, query.previewReference);
  }
}
