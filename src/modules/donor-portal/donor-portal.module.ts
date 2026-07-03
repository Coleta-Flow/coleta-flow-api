import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { DeclarationsModule } from '../declarations/declarations.module';
import { DonorPortalController } from './donor-portal.controller';
import { DonorPortalService } from './donor-portal.service';

@Module({
  imports: [PrismaModule, DeclarationsModule],
  controllers: [DonorPortalController],
  providers: [DonorPortalService],
})
export class DonorPortalModule {}
