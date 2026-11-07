import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../generated/prisma/client.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { NeighborhoodsService } from './neighborhoods.service.js';
import { CreateNeighborhoodDto } from './dto/create-neighborhood.dto.js';
import { UpdateNeighborhoodDto } from './dto/update-neighborhood.dto.js';
import { QueryNeighborhoodsDto } from './dto/query-neighborhoods.dto.js';

@ApiTags('neighborhoods')
@ApiBearerAuth()
@Controller('neighborhoods')
export class NeighborhoodsController {
  constructor(private readonly service: NeighborhoodsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar barrios' })
  findAll(@Query() query: QueryNeighborhoodsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un barrio por ID' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear barrio (solo ADMIN)' })
  create(@Body() dto: CreateNeighborhoodDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar barrio (solo ADMIN)' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateNeighborhoodDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desactivar barrio (solo ADMIN)' })
  deactivate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.deactivate(id);
  }
}