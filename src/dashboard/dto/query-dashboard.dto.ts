import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ActivityStatus } from '../../generated/prisma/client.js';

export class QueryDashboardDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  neighborhoodId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  placeId?: string;

  @ApiPropertyOptional({ enum: ActivityStatus })
  @IsEnum(ActivityStatus)
  @IsOptional()
  status?: ActivityStatus;

  @ApiPropertyOptional({ description: 'Filtrar por modalidad de horario' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  timeDefined?: boolean;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 12,
    description: 'Mes 1-12. No afecta al gráfico "por mes", solo a los demás.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;
}