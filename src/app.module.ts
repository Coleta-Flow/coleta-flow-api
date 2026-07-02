import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './database/prisma/prisma.module';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DonorRequestsModule } from './modules/donor-requests/donor-requests.module';
import { CollectionPointsModule } from './modules/collection-points/collection-points.module';
import { RoutesModule } from './modules/routes/routes.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { WeightsModule } from './modules/weights/weights.module';
import { DeclarationsModule } from './modules/declarations/declarations.module';
import { FilesModule } from './modules/files/files.module';
import { ReportsModule } from './modules/reports/reports.module';
import { EventStoreModule } from './modules/event-store/event-store.module';
import { MaterialTypesModule } from './modules/material-types/material-types.module';
import { DonorsModule } from './modules/donors/donor.module';
import { DonorPortalModule } from './modules/donor-portal/donor-portal.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CompanySettingsModule } from './modules/company-settings/company-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    SharedModule,
    AuthModule,
    UsersModule,
    DonorRequestsModule,
    CollectionPointsModule,
    RoutesModule,
    TrackingModule,
    WeightsModule,
    DeclarationsModule,
    FilesModule,
    ReportsModule,
    EventStoreModule,
    MaterialTypesModule,
    DonorsModule,
    DonorPortalModule,
    NotificationsModule,
    CompanySettingsModule,
  ],
})
export class AppModule {}
