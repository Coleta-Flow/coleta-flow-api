import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DeclarationPdfFactory } from './infrastructure/pdf/declaration-pdf.factory';
import { GenerateDeclarationHandler } from './application/handlers/generate-declaration.handler';
import { DeclarationsController } from './presentation/controllers/declarations.controller';
import { EventStoreModule } from '../event-store/event-store.module';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [CqrsModule, EventStoreModule, PrismaModule],
  controllers: [DeclarationsController],
  providers: [DeclarationPdfFactory, GenerateDeclarationHandler],
  exports: [DeclarationPdfFactory],
})
export class DeclarationsModule {}
