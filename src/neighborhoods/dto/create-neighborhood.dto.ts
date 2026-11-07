import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNeighborhoodDto {
  @ApiProperty({ example: 'Barrio San José', maxLength: 180 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional({ example: 'Zona residencial al norte de la ciudad' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Frente al parque principal' })
  @IsString()
  @IsOptional()
  reference?: string;
}