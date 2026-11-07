import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { QueryOrganizationsDto } from './dto/query-organizations.dto.js';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryOrganizationsDto) {
    const { page, limit, search, isActive } = query;
    const where = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    return org;
  }

  async create(dto: CreateOrganizationDto) {
    const exists = await this.prisma.organization.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Ya existe una organización con ese nombre');
    return this.prisma.organization.create({ data: dto });
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findById(id);
    if (dto.name) {
      const conflict = await this.prisma.organization.findUnique({ where: { name: dto.name } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException('Ya existe una organización con ese nombre');
      }
    }
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });
  }
}