import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateNeighborhoodDto } from './create-neighborhood.dto.js';

export class UpdateNeighborhoodDto extends PartialType(CreateNeighborhoodDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}