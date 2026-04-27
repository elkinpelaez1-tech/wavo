import {
  Controller, Get, Post, Query, Body, Headers,
  HttpCode, UnauthorizedException, RawBodyRequest, Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { WebhooksService } from './webhooks.service';
import { MetaWebhookPayload } from './dto/meta-webhook.dto';

@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooks: WebhooksService) {}

  @Get('meta')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN)
      return challenge;
    throw new ForbiddenException('Verification failed');
  }

  @Post('meta')
  @HttpCode(200)
  async receiveWebhook(
    @Body() payload: MetaWebhookPayload,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    this.verifySignature(req.rawBody, signature);
    await this.webhooks.processPayload(payload);
    return { status: 'ok' };
  }

  private verifySignature(rawBody: Buffer, signature: string) {
    if (!signature) return;
    const expected =
      'sha256=' +
      crypto
        .createHmac('sha256', process.env.META_APP_SECRET)
        .update(rawBody)
        .digest('hex');
    if (expected !== signature)
      throw new UnauthorizedException('Firma inválida');
  }
}
