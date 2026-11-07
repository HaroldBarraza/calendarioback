import { BadRequestException, Injectable } from '@nestjs/common';
import { PLANNING_YEAR } from '../config/configuration.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueryCalendarDto } from './dto/query-calendar.dto.js';

const CALENDAR_SELECT = {
  id: true,
  name: true,
  description: true,
  activityDate: true,
  timeDefined: true,
  startTime: true,
  status: true,
  place: { select: { id: true, name: true, address: true } },
  organization: { select: { id: true, name: true } },
  neighborhood: { select: { id: true, name: true } },
} as const;

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getRange(query: QueryCalendarDto) {
    const dateFrom = new Date(query.dateFrom);
    const dateTo = new Date(query.dateTo);

    if (dateTo.getTime() < dateFrom.getTime()) {
      throw new BadRequestException('dateFrom debe ser menor o igual que dateTo');
    }

    const yearStart = new Date(Date.UTC(PLANNING_YEAR, 0, 1));
    const yearEnd = new Date(Date.UTC(PLANNING_YEAR, 11, 31));
    if (dateTo < yearStart || dateFrom > yearEnd) {
      throw new BadRequestException(
        `El rango debe contener fechas del año ${PLANNING_YEAR}`,
      );
    }

    const activities = await this.prisma.activity.findMany({
      where: {
        deletedAt: null,
        activityDate: { gte: dateFrom, lte: dateTo },
        ...(query.organizationId ? { organizationId: query.organizationId } : {}),
        ...(query.neighborhoodId ? { neighborhoodId: query.neighborhoodId } : {}),
        ...(query.placeId ? { placeId: query.placeId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      select: CALENDAR_SELECT,
      orderBy: [{ activityDate: 'asc' }, { startTime: 'asc' }],
    });

    return {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      total: activities.length,
      scheduled: activities.filter((a) => a.timeDefined),
      unscheduled: activities.filter((a) => !a.timeDefined),
    };
  }
}