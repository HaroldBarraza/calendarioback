import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PLANNING_YEAR } from '../config/configuration.js';
import type { AuthUser } from '../common/filters/types/jwt-payload.type.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateActivityDto } from './dto/create-activity.dto.js';
import { UpdateActivityDto } from './dto/update-activity.dto.js';
import { QueryActivitiesDto } from './dto/query-activities.dto.js';
import type { Conflict } from './filters/conflict.type.js';
import { ConflictsService } from '../conflicts/conflicts.service.js';

const BASE_TIME = (time: string): Date =>
  new Date(`1970-01-01T${time}:00.000Z`);

const ACTIVITY_INCLUDE = {
  place: { select: { id: true, name: true, address: true } },
  organization: { select: { id: true, name: true } },
  neighborhood: { select: { id: true, name: true } },
  creator: { select: { id: true, email: true, fullName: true } },
} as const;

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conflicts: ConflictsService,
  ) {}

  async findAll(query: QueryActivitiesDto) {
    const {
      page,
      limit,
      search,
      status,
      organizationId,
      neighborhoodId,
      placeId,
      dateFrom,
      dateTo,
      timeDefined,
      includeDeleted,
    } = query;

    const where: Prisma.ActivityWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(status ? { status } : {}),
      ...(organizationId ? { organizationId } : {}),
      ...(neighborhoodId ? { neighborhoodId } : {}),
      ...(placeId ? { placeId } : {}),
      ...(timeDefined !== undefined ? { timeDefined } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            activityDate: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        include: ACTIVITY_INCLUDE,
        orderBy: [{ activityDate: 'asc' }, { startTime: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, includeDeleted = false) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: ACTIVITY_INCLUDE,
    });
    if (!activity || (!includeDeleted && activity.deletedAt)) {
      throw new NotFoundException('Actividad no encontrada');
    }
    return activity;
  }

  async create(dto: CreateActivityDto, user: AuthUser) {
    const { force, ...data } = dto;

    const activityDate = new Date(data.activityDate);
    this.assertPlanningYear(activityDate);
    const startTime = this.resolveStartTime(data.timeDefined, data.startTime);

    await this.assertCatalogActive(data);

    const conflicts = await this.detectConflicts({
      activityDate,
      startTime,
      timeDefined: data.timeDefined,
      placeId: data.placeId,
      organizationId: data.organizationId,
    });
    this.assertNoUnconfirmedConflicts(conflicts, force);

    return this.prisma.activity.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        activityDate,
        timeDefined: data.timeDefined,
        startTime,
        status: data.status ?? 'PLANNED',
        observations: data.observations ?? null,
        placeId: data.placeId,
        organizationId: data.organizationId,
        neighborhoodId: data.neighborhoodId,
        createdBy: user.id,
      },
      include: ACTIVITY_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateActivityDto, user: AuthUser) {
    const current = await this.findById(id);
    const { force, ...data } = dto;

    const activityDate = data.activityDate
      ? new Date(data.activityDate)
      : current.activityDate;
    this.assertPlanningYear(activityDate);

    const newTimeDefined = data.timeDefined ?? current.timeDefined;
    const newStartTime = this.resolveStartTime(
      newTimeDefined,
      data.startTime,
      data.timeDefined === undefined ? current.startTime : null,
    );

    await this.assertCatalogActive({
      placeId: data.placeId ?? current.placeId,
      organizationId: data.organizationId ?? current.organizationId,
      neighborhoodId: data.neighborhoodId ?? current.neighborhoodId,
    });

    const conflicts = await this.detectConflicts({
      activityDate,
      startTime: newStartTime,
      timeDefined: newTimeDefined,
      placeId: data.placeId ?? current.placeId,
      organizationId: data.organizationId ?? current.organizationId,
      excludeId: id,
    });
    this.assertNoUnconfirmedConflicts(conflicts, force);

    return this.prisma.activity.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.observations !== undefined
          ? { observations: data.observations }
          : {}),
        ...(data.placeId !== undefined ? { placeId: data.placeId } : {}),
        ...(data.organizationId !== undefined
          ? { organizationId: data.organizationId }
          : {}),
        ...(data.neighborhoodId !== undefined
          ? { neighborhoodId: data.neighborhoodId }
          : {}),
        activityDate,
        timeDefined: newTimeDefined,
        startTime: newStartTime,
        updatedBy: user.id,
      },
      include: ACTIVITY_INCLUDE,
    });
  }

  async softDelete(id: string, user: AuthUser) {
    await this.findById(id);
    return this.prisma.activity.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: user.id },
      include: ACTIVITY_INCLUDE,
    });
  }

  async restore(id: string, user: AuthUser) {
    const activity = await this.prisma.activity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    if (!activity.deletedAt) {
      throw new BadRequestException('La actividad no está eliminada');
    }
    return this.prisma.activity.update({
      where: { id },
      data: { deletedAt: null, updatedBy: user.id },
      include: ACTIVITY_INCLUDE,
    });
  }

  // ───────────────────────── helpers privados ─────────────────────────

  private assertPlanningYear(date: Date): void {
    if (date.getUTCFullYear() !== PLANNING_YEAR) {
      throw new BadRequestException(
        `Solo se permiten actividades del año ${PLANNING_YEAR}`,
      );
    }
  }

  private resolveStartTime(
    timeDefined: boolean,
    incoming: string | undefined,
    fallback: Date | null = null,
  ): Date | null {
    if (!timeDefined) {
      if (incoming) {
        throw new BadRequestException(
          'startTime debe omitirse cuando timeDefined es false',
        );
      }
      return null;
    }
    if (incoming) return BASE_TIME(incoming);
    if (fallback) return fallback;
    throw new BadRequestException(
      'startTime es obligatorio cuando timeDefined es true',
    );
  }

  private async assertCatalogActive(input: {
    placeId: string;
    organizationId: string;
    neighborhoodId: string;
  }): Promise<void> {
    const [place, org, neighborhood] = await Promise.all([
      this.prisma.place.findUnique({
        where: { id: input.placeId },
        select: { isActive: true },
      }),
      this.prisma.organization.findUnique({
        where: { id: input.organizationId },
        select: { isActive: true },
      }),
      this.prisma.neighborhood.findUnique({
        where: { id: input.neighborhoodId },
        select: { isActive: true },
      }),
    ]);
    if (!place) throw new NotFoundException('Lugar no encontrado');
    if (!org) throw new NotFoundException('Organización no encontrada');
    if (!neighborhood) throw new NotFoundException('Barrio no encontrado');
    if (!place.isActive)
      throw new BadRequestException('El lugar está inactivo');
    if (!org.isActive)
      throw new BadRequestException('La organización está inactiva');
    if (!neighborhood.isActive)
      throw new BadRequestException('El barrio está inactivo');
  }

  private async detectConflicts(input: {
    activityDate: Date;
    startTime: Date | null;
    timeDefined: boolean;
    placeId: string;
    organizationId: string;
    excludeId?: string;
  }): Promise<Conflict[]> {
    if (!input.timeDefined || !input.startTime) return [];

    const conflicts: Conflict[] = [];
    const exclude = input.excludeId ? { id: { not: input.excludeId } } : {};

    const placeHit = await this.prisma.activity.findFirst({
      where: {
        placeId: input.placeId,
        activityDate: input.activityDate,
        startTime: input.startTime,
        deletedAt: null,
        ...exclude,
      },
      select: { id: true, name: true },
    });
    if (placeHit) {
      conflicts.push({
        level: 'HIGH',
        reason: 'Mismo lugar, fecha y hora',
        activityId: placeHit.id,
        activityName: placeHit.name,
      });
    }

    const orgHit = await this.prisma.activity.findFirst({
      where: {
        organizationId: input.organizationId,
        activityDate: input.activityDate,
        startTime: input.startTime,
        deletedAt: null,
        ...exclude,
      },
      select: { id: true, name: true },
    });
    if (orgHit && orgHit.id !== placeHit?.id) {
      conflicts.push({
        level: 'WARNING',
        reason: 'Misma organización, fecha y hora',
        activityId: orgHit.id,
        activityName: orgHit.name,
      });
    }

    return conflicts;
  }

  private assertNoUnconfirmedConflicts(
    conflicts: Conflict[],
    force: boolean | undefined,
  ): void {
    if (conflicts.length === 0) return;
    if (force) return;
    throw new ConflictException({
      message:
        'Se detectaron conflictos. Reenvía con force: true para continuar.',
      conflicts,
    });
  }
}
