import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Healthcheck da API' })
  @ApiOkResponse({ description: 'Servico saudavel.' })
  getHealth() {
    return {
      ok: true,
      service: 'jornada-api',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
