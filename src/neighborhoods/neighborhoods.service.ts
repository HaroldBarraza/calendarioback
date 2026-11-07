import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNeighborhoodDto } from './dto/create-neighborhood.dto.js';
import { UpdateNeighborhoodDto } from './dto/update-neighborhood.dto.js';
import { QueryNeighborhoodsDto } from './dto/query-neighborhoods.dto.js';

@Injectable()
export class NeighborhoodsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryNeighborhoodsDto) {
    const { page, limit, search, isActive } = query;
    const where = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.neighborhood.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.neighborhood.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const n = await this.prisma.neighborhood.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Barrio no encontrado');
    return n;
  }

  async create(dto: CreateNeighborhoodDto) {
    const exists = await this.prisma.neighborhood.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Ya existe un barrio con ese nombre');
    return this.prisma.neighborhood.create({ data: dto });
  }

  async update(id: string, dto: UpdateNeighborhoodDto) {
    await this.findById(id);
    if (dto.name) {
      const conflict = await this.prisma.neighborhood.findUnique({ where: { name: dto.name } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException('Ya existe un barrio con ese nombre');
      }
    }
    return this.prisma.neighborhood.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.neighborhood.update({
      where: { id },
      data: { isActive: false },
    });
  }
}