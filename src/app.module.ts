import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import configuration from './config/configuration.js';
import { validationSchema } from './config/validation.schema.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { NeighborhoodsModule } from './neighborhoods/neighborhoods.module.js';
import { PlacesModule } from './places/places.module.js';
import { ActivitiesModule } from './activities/activities.module.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ConflictsModule } from './conflicts/conflicts.module.js';
import { ReportsService } from './reports/reports.service.js';
import { ReportsController } from './reports/reports.controller.js';
import { ReportsModule } from './reports/reports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    NeighborhoodsModule,
    PlacesModule,
    ActivitiesModule,
    CalendarModule,
    DashboardModule,
    ConflictsModule,
    ReportsModule,
  ],
  controllers: [AppController, ReportsController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    ReportsService,
  ],
})
export class AppModule {}