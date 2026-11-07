import { Module } from '@nestjs/common';
import { NeighborhoodsController } from './neighborhoods.controller.js';
import { NeighborhoodsService } from './neighborhoods.service.js';

@Module({
  controllers: [NeighborhoodsController],
  providers: [NeighborhoodsService],
  exports: [NeighborhoodsService],
})
export class NeighborhoodsModule {}