import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ContactsModule } from './contacts/contacts.module';
import { TemplatesModule } from './templates/templates.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { MetaModule } from './meta/meta.module';
import { SupabaseModule } from './supabase/supabase.module';
import { QueueModule } from './queue/queue.module';
import { getRedisConnection } from './queue/redis.config';
import { WorkerModule } from './workers/worker.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: getRedisConnection(),
      }),
    }),
    SupabaseModule,
    AuthModule,
    CampaignsModule,
    ContactsModule,
    TemplatesModule,
    WebhooksModule,
    MetaModule,
    QueueModule,
    WorkerModule,
  ],
})
export class AppModule {}
