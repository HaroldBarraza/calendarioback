import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { QueryDashboardDto } from './dto/query-dashboard.dto.js';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Contadores de actividades y catálogos (filtrable)' })
  summary(@Query() query: QueryDashboardDto) {
    return this.service.getSummary(query);
  }

  @Get('charts')
  @ApiOperation({ summary: 'Series para los 6 gráficos del dashboard (filtrable)' })
  charts(@Query() query: QueryDashboardDto) {
    return this.service.getCharts(query);
  }
}