import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePlaceDto {
  @ApiProperty({ example: 'Auditorio Municipal', maxLength: 180 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @ApiProperty({ example: 'Av. Principal 123', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address!: string;

  @ApiPropertyOptional({ example: 'A dos cuadras de la plaza' })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({ example: 'Capacidad para 200 personas' })
  @IsString()
  @IsOptional()
  description?: string;
}