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
      to: to.replace(/\D/g, ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    };

    try {
      console.log(`\n[MetaService] ----- INICIO PETICIÓN A META -----`);
      console.log(`[MetaService] URL completa: ${this.baseUrl}`);
      console.log(`[MetaService] Phone Number ID: ${process.env.META_PHONE_NUMBER_ID}`);
      const partialToken = process.env.META_WHATSAPP_TOKEN ? `${process.env.META_WHATSAPP_TOKEN.substring(0, 15)}...${process.env.META_WHATSAPP_TOKEN.slice(-5)}` : 'NO_TOKEN';
      console.log(`[MetaService] Token parcial: ${partialToken}`);
      console.log(`[MetaService] Payload exacto:\n${JSON.stringify(payload, null, 2)}`);
      
      const { data } = await axios.post(this.baseUrl, payload, { headers: this.headers });
      
      console.log(`[MetaService] ----- RESPUESTA EXITOSA DE META -----`);
      console.log(`[MetaService] Response Data completo:\n${JSON.stringify(data, null, 2)}\n`);
      
      this.logger.log(`Mensaje enviado a ${to} — ID: ${data.messages?.[0]?.id}`);
      return data;
    } catch (error: any) {
      console.error(`\n[MetaService] ----- ERROR EN PETICIÓN A META -----`);
      console.error(`[MetaService] HTTP Error Msg:`, error.message);
      console.error(`[MetaService] error.response?.data completo:\n`, JSON.stringify(error.response?.data, null, 2));
      console.error(`----------------------------------------------------\n`);
      throw error;
    }
  }

  async getTemplates() {
    const url = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v19.0'}/${process.env.META_WABA_ID}/message_templates`;
    console.log(`[MetaService] GET: ${url}`);
    
    try {
      const { data } = await axios.get(url, { headers: this.headers });
      console.log(`[MetaService] SUCCESS: Fetched ${data.data?.length || 0} templates`);
      return data;
    } catch (error: any) {
      console.error('META RAW ERROR (META SERVICE):', error.response?.data || error.message);
      throw error;
    }
  }
}
