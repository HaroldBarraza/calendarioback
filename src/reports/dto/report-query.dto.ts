import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ActivityStatus } from '../../generated/prisma/client.js';

export class ReportQueryDto {
  @ApiPropertyOptional({ example: '2027-01-01' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

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
}