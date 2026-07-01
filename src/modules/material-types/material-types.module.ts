import { Module } from '@nestjs/common';
import { MaterialTypesController } from './material-types.controller';
import { MaterialTypesService } from './material-types.service';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MaterialTypesController],
  providers: [MaterialTypesService],
  exports: [MaterialTypesService],
})
export class MaterialTypesModule {}
