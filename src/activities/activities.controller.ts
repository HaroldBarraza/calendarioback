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
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../common/filters/types/jwt-payload.type.js';
import { Role } from '../generated/prisma/client.js';
import { ActivitiesService } from './activities.service.js';
import { CreateActivityDto } from './dto/create-activity.dto.js';
import { UpdateActivityDto } from './dto/update-activity.dto.js';
import { QueryActivitiesDto } from './dto/query-activities.dto.js';

@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar actividades (filtros, paginación, soft delete opcional)' })
  findAll(@Query() query: QueryActivitiesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener actividad por ID' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.PLANNER)
  @ApiOperation({ summary: 'Crear actividad (ADMIN, PLANNER)' })
  create(@Body() dto: CreateActivityDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PLANNER)
  @ApiOperation({ summary: 'Actualizar actividad (ADMIN, PLANNER)' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Patch(':id/delete')
  @Roles(Role.ADMIN, Role.PLANNER)
  @ApiOperation({ summary: 'Eliminar lógicamente una actividad (ADMIN, PLANNER)' })
  softDelete(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthUser) {
    return this.service.softDelete(id, user);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN, Role.PLANNER)
  @ApiOperation({ summary: 'Restaurar actividad eliminada (ADMIN, PLANNER)' })
  restore(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthUser) {
    return this.service.restore(id, user);
  }
}