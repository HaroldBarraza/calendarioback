import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ActivityStatus } from '../../generated/prisma/client.js';

export class CreateActivityDto {
  @ApiProperty({ example: 'Feria de emprendedores', maxLength: 180 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional({ example: 'Feria con stands de emprendedores locales' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2027-05-15', description: 'Debe pertenecer al año de planificación' })
  @IsDateString()
  activityDate!: string;

  @ApiProperty({ example: true, description: 'true si tiene hora definida, false si está por definir' })
  @IsBoolean()
  timeDefined!: boolean;

  @ApiPropertyOptional({
    example: '14:30',
    description: 'Obligatorio si timeDefined = true. Formato HH:mm.',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime debe tener formato HH:mm' })
  startTime?: string;

  @ApiPropertyOptional({ enum: ActivityStatus, default: ActivityStatus.PLANNED })
  @IsEnum(ActivityStatus)
  @IsOptional()
  status?: ActivityStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  placeId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  neighborhoodId!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Si hay conflictos, reenviar con force: true para continuar.',
  })
  @IsBoolean()
  @IsOptional()
  force?: boolean;
}