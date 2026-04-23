import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  private get baseUrl() {
    return `https://graph.facebook.com/${process.env.META_API_VERSION || 'v19.0'}/${process.env.META_PHONE_NUMBER_ID}/messages`;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  async sendTemplate(
    to: string,
    templateName: string,
    bodyVars: string[] = [],
    imageUrl?: string,
    language = 'es',
  ) {
    const components: any[] = [];

    if (imageUrl) {
      components.push({
        type: 'header',
        parameters: [{ type: 'image', image: { link: imageUrl } }],
      });
    }

    if (bodyVars.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyVars.map((v) => ({ type: 'text', text: v })),
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    };

    const { data } = await axios.post(this.baseUrl, payload, { headers: this.headers });
    this.logger.log(`Mensaje enviado a ${to} — ID: ${data.messages?.[0]?.id}`);
    return data;
  }

  async getTemplates() {
    const url = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v19.0'}/${process.env.META_WABA_ID}/message_templates`;
    const { data } = await axios.get(url, { headers: this.headers });
    return data;
  }
}
