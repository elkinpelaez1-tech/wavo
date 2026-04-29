import { Controller, Get, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private templates: TemplatesService) {}

  @Get()
  findAll(@Request() req) {
    return this.templates.findAll(req.user.id);
  }

  @Get('sync')
  async sync(@Request() req, @Res() res: Response) {
    try {
      const result = await this.templates.syncFromMeta(req.user.id);
      return res.json(result);
    } catch (error: any) {
      console.error('META CONTROLLER ERROR:', error.response?.data || error.message);
      const status = error.response?.status || 500;
      const data = error.response?.data || { message: error.message };
      return res.status(status).json(data);
    }
  }
}
