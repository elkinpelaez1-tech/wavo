import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { QueueModule } from '../queue/queue.module';
import { MetaModule } from '../meta/meta.module';

@Module({
  imports: [QueueModule, MetaModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
