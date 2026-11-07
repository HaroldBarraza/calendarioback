import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CalendarService } from './calendar.service.js';
import { QueryCalendarDto } from './dto/query-calendar.dto.js';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private readonly service: CalendarService) {}

  @Get('activities')
  @ApiOperation({
    summary: 'Actividades de un rango de fechas, separadas por modalidad de horario',
  })
  getRange(@Query() query: QueryCalendarDto) {
    return this.service.getRange(query);
  }
}