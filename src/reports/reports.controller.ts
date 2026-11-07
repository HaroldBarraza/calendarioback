import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';
import { ReportQueryDto } from './dto/report-query.dto.js';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('activities.pdf')
  @ApiProduces('application/pdf')
  @ApiOperation({
    summary: 'Descargar reporte PDF de actividades (respeta filtros y permisos)',
  })
  async activitiesPdf(@Query() query: ReportQueryDto, @Res() res: Response): Promise<void> {
    const buffer = await this.service.generateActivitiesPdf(query);
    const filename = `reporte-actividades-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }
}