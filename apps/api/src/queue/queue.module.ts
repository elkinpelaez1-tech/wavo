import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MessageProducer } from './message.producer';

@Module({
  imports: [BullModule.registerQueue({ name: 'messages' })],
  providers: [MessageProducer],
  exports: [MessageProducer],
})
export class QueueModule {}
