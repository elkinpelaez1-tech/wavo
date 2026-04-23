import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MessageProducer {
  constructor(@InjectQueue('messages') private queue: Queue) {}

  async enqueue(
    contactId: string,
    campaignId: string,
    phone: string,
    templateName: string,
    bodyVars: string[],
    imageUrl: string | null,
    delayMs: number,
  ) {
    await this.queue.add(
      'send-message',
      { contactId, campaignId, phone, templateName, bodyVars, imageUrl },
      {
        delay: delayMs,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }
}
