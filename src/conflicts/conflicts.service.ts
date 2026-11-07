import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Conflict } from '../activities/filters/conflict.type.js';

const BASE_TIME = (time: string): Date => new Date(`1970-01-01T${time}:00.000Z`);

export interface DetectInput {
  activityDate: Date;
  startTime: Date | null;
  timeDefined: boolean;
  placeId: string;
  organizationId: string;
  excludeId?: string;
}

@Injectable()
export class ConflictsService {
  constructor(private readonly prisma: PrismaService) {}

  async detect(input: DetectInput): Promise<Conflict[]> {
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

  async check(dto: {
    activityDate: string;
    timeDefined: boolean;
    startTime?: string;
    placeId: string;
    organizationId: string;
    excludeId?: string;
  }): Promise<Conflict[]> {
    if (!dto.timeDefined) return [];
    if (!dto.startTime) {
      throw new BadRequestException('startTime es obligatorio cuando timeDefined es true');
    }
    return this.detect({
      activityDate: new Date(dto.activityDate),
      startTime: BASE_TIME(dto.startTime),
      timeDefined: dto.timeDefined,
      placeId: dto.placeId,
      organizationId: dto.organizationId,
      excludeId: dto.excludeId,
    });
  }
}