import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConflictsService } from './conflicts.service.js';
import { CheckConflictsDto } from './dto/check-conflicts.dto.js';

@ApiTags('conflicts')
@ApiBearerAuth()
@Controller('conflicts')
export class ConflictsController {
  constructor(private readonly service: ConflictsService) {}

  @Post('check')
  @ApiOperation({
    summary: 'Previsualizar conflictos antes de guardar (no persiste nada)',
  })
  async check(@Body() dto: CheckConflictsDto) {
    const conflicts = await this.service.check(dto);
    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }
}