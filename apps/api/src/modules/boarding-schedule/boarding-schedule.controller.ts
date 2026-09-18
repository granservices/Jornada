import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { FindDrakeWorkerDto } from './dto/find-drake-worker.dto';
import { ListDrakeWorkerScheduleDto } from './dto/list-drake-worker-schedule.dto';
import { ListEmployeeScheduleDto } from './dto/list-employee-schedule.dto';
import { EmployeeScheduleService } from './services/employee-schedule.service';

@ApiTags('boarding-schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('boarding-schedule')
export class BoardingScheduleController {
  constructor(private readonly schedules: EmployeeScheduleService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lista a programacao do colaborador autenticado.' })
  @ApiOkResponse({ description: 'Programacao retornada pelo contrato interno do Jornada.' })
  listMine(@CurrentUser() user: AuthenticatedUser, @Query() query: ListEmployeeScheduleDto) {
    return this.schedules.listMySchedule(user, this.schedules.resolveRange(query.from, query.to));
  }

  @Get('preview/workers')
  @ApiOperation({ summary: 'Localiza colaboradores no Drake para validacao administrativa.' })
  findPreviewWorkers(@CurrentUser() user: AuthenticatedUser, @Query() query: FindDrakeWorkerDto) {
    return this.schedules.findPreviewWorkers(user, query.q);
  }

  @Get('preview')
  @ApiOperation({ summary: 'Consulta a programacao de um colaborador no modo de validacao administrativa.' })
  listPreview(@CurrentUser() user: AuthenticatedUser, @Query() query: ListDrakeWorkerScheduleDto) {
    return this.schedules.listPreviewSchedule(user, query.previewReference, this.schedules.resolveRange(query.from, query.to));
  }
}
