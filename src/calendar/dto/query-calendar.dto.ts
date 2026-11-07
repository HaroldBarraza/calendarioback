import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ActivityStatus } from '../../generated/prisma/client.js';

export class QueryCalendarDto {
  @ApiProperty({ example: '2027-05-01' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ example: '2027-05-31' })
  @IsDateString()
  dateTo!: string;

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
}