import { Injectable } from '@nestjs/common';
import { PLANNING_YEAR } from '../config/configuration.js';
import { Prisma, ActivityStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueryDashboardDto } from './dto/query-dashboard.dto.js';

const ALL_STATUSES: ActivityStatus[] = ['PLANNED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(query: QueryDashboardDto) {
    const where = this.buildWhere(query, /* includeMonth */ true);

    const [total, byStatus, byTime, orgCount, nbCount, placeCount] = await Promise.all([
      this.prisma.activity.count({ where }),
      this.prisma.activity.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.activity.groupBy({ by: ['timeDefined'], where, _count: true }),
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.neighborhood.count({ where: { isActive: true } }),
      this.prisma.place.count({ where: { isActive: true } }),
    ]);

    const statusMap: Record<ActivityStatus, number> = {
      PLANNED: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const s of byStatus) statusMap[s.status] = s._count;

    const withTime = byTime.find((t) => t.timeDefined)?._count ?? 0;
    const withoutTime = byTime.find((t) => !t.timeDefined)?._count ?? 0;

    return {
      activities: {
        total,
        planned: statusMap.PLANNED,
        confirmed: statusMap.CONFIRMED,
        completed: statusMap.COMPLETED,
        cancelled: statusMap.CANCELLED,
        withTime,
        withoutTime,
      },
      catalogs: {
        organizations: orgCount,
        neighborhoods: nbCount,
        places: placeCount,
      },
    };
  }

  async getCharts(query: QueryDashboardDto) {
    const where = this.buildWhere(query, /* includeMonth */ true);
    const whereNoMonth = this.buildWhere(query, /* includeMonth */ false);

    const [byStatus, byTime, byOrg, byNb, byPlace, byMonth] = await Promise.all([
      this.prisma.activity.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.activity.groupBy({ by: ['timeDefined'], where, _count: true }),
      this.prisma.activity.groupBy({ by: ['organizationId'], where, _count: true }),
      this.prisma.activity.groupBy({ by: ['neighborhoodId'], where, _count: true }),
      this.prisma.activity.groupBy({ by: ['placeId'], where, _count: true }),
      this.monthSeries(whereNoMonth),
    ]);

    const [orgs, nbs, places] = await Promise.all([
      this.prisma.organization.findMany({ select: { id: true, name: true } }),
      this.prisma.neighborhood.findMany({ select: { id: true, name: true } }),
      this.prisma.place.findMany({ select: { id: true, name: true } }),
    ]);
    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    const nbName = new Map(nbs.map((n) => [n.id, n.name]));
    const placeName = new Map(places.map((p) => [p.id, p.name]));

    const statusCounts: Record<ActivityStatus, number> = {
      PLANNED: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const s of byStatus) statusCounts[s.status] = s._count;

    const withTime = byTime.find((t) => t.timeDefined)?._count ?? 0;
    const withoutTime = byTime.find((t) => !t.timeDefined)?._count ?? 0;

    return {
      byMonth,
      byStatus: ALL_STATUSES.map((status) => ({
        status,
        count: statusCounts[status],
      })),
      byTimeDefined: [
        { label: 'Con horario', count: withTime },
        { label: 'Sin horario', count: withoutTime },
      ],
      byOrganization: byOrg.map((row) => ({
        id: row.organizationId,
        name: orgName.get(row.organizationId) ?? '—',
        count: row._count,
      })),
      byNeighborhood: byNb.map((row) => ({
        id: row.neighborhoodId,
        name: nbName.get(row.neighborhoodId) ?? '—',
        count: row._count,
      })),
      byPlace: byPlace.map((row) => ({
        id: row.placeId,
        name: placeName.get(row.placeId) ?? '—',
        count: row._count,
      })),
    };
  }

  // ───────────────────────── helpers ─────────────────────────

  private buildWhere(
    query: QueryDashboardDto,
    includeMonth: boolean,
  ): Prisma.ActivityWhereInput {
    const where: Prisma.ActivityWhereInput = {
      deletedAt: null,
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.neighborhoodId ? { neighborhoodId: query.neighborhoodId } : {}),
      ...(query.placeId ? { placeId: query.placeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.timeDefined !== undefined ? { timeDefined: query.timeDefined } : {}),
    };

    if (includeMonth && query.month) {
      where.activityDate = {
        gte: new Date(Date.UTC(PLANNING_YEAR, query.month - 1, 1)),
        lt: new Date(Date.UTC(PLANNING_YEAR, query.month, 1)),
      };
    }

    return where;
  }

  private async monthSeries(where: Prisma.ActivityWhereInput): Promise<number[]> {
    return Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        this.prisma.activity.count({
          where: {
            ...where,
            activityDate: {
              gte: new Date(Date.UTC(PLANNING_YEAR, i, 1)),
              lt: new Date(Date.UTC(PLANNING_YEAR, i + 1, 1)),
            },
          },
        }),
      ),
    );
  }
}