import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MessageWorker } from './message.worker';
import { MetaModule } from '../meta/meta.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { getRedisConnection } from '../queue/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: getRedisConnection(),
      }),
    }),
    BullModule.registerQueue({ name: 'messages' }),
    SupabaseModule,
    MetaModule,
  ],
  providers: [MessageWorker],
})
export class WorkerModule {}
