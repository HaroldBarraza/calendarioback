import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CheckConflictsDto {
  @ApiProperty({ example: '2027-05-15' })
  @IsDateString()
  activityDate!: string;

  @ApiProperty()
  @IsBoolean()
  timeDefined!: boolean;

  @ApiPropertyOptional({ example: '14:30', description: 'Obligatorio si timeDefined = true' })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime debe tener formato HH:mm' })
  startTime?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  placeId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Si editas una actividad existente, su ID para excluirla de la detección',
  })
  @IsUUID()
  @IsOptional()
  excludeId?: string;
}