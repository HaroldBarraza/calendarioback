import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreatePlaceDto } from './create-place.dto.js';

export class UpdatePlaceDto extends PartialType(CreatePlaceDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}