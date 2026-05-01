import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MessageWorker } from './message.worker';
import { MetaModule } from '../meta/meta.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'messages' }),
    SupabaseModule,
    MetaModule,
  ],
  providers: [MessageWorker],
})
export class WorkerModule {}
