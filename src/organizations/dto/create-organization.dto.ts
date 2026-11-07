import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Junta Vecinal Centro', maxLength: 180 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional({ example: 'Organización encargada de actividades culturales' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'María López' })
  @IsString()
  @IsOptional()
  @MaxLength(180)
  contactName?: string;

  @ApiPropertyOptional({ example: '+51987654321' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  contactPhone?: string;
}   