import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      ok: true,
      service: 'jornada-intake-api',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
