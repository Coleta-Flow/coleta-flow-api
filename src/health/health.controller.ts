import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma/prisma.service';

@Public()
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness — usado pelo Railway/health check (sem auth, sem dependências) */
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /** Readiness — verifica conexão com o banco */
  @Get('health/ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Database unavailable',
      });
    }
  }
}
