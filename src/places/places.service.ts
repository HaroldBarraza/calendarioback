import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePlaceDto } from './dto/create-place.dto.js';
import { UpdatePlaceDto } from './dto/update-place.dto.js';
import { QueryPlacesDto } from './dto/query-places.dto.js';

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPlacesDto) {
    const { page, limit, search, isActive } = query;
    const where = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { address: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.place.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.place.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const p = await this.prisma.place.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Lugar no encontrado');
    return p;
  }

  async create(dto: CreatePlaceDto) {
    const exists = await this.prisma.place.findUnique({
      where: { name_address: { name: dto.name, address: dto.address } },
    });
    if (exists) throw new ConflictException('Ya existe un lugar con ese nombre y dirección');
    return this.prisma.place.create({ data: dto });
  }

  async update(id: string, dto: UpdatePlaceDto) {
    const current = await this.findById(id);
    const newName = dto.name ?? current.name;
    const newAddress = dto.address ?? current.address;

    if (newName !== current.name || newAddress !== current.address) {
      const conflict = await this.prisma.place.findUnique({
        where: { name_address: { name: newName, address: newAddress } },
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException('Ya existe un lugar con ese nombre y dirección');
      }
    }

    return this.prisma.place.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.place.update({
      where: { id },
      data: { isActive: false },
    });
  }
}