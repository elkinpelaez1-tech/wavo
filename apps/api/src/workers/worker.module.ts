import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MessageWorker } from './message.worker';
import { MetaModule } from '../meta/meta.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
    }),
    BullModule.registerQueue({ name: 'messages' }),
    SupabaseModule,
    MetaModule,
  ],
  providers: [MessageWorker],
})
export class WorkerModule {}
