import { Controller, Get, UseGuards, Request } from '@nestjs/common';
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
  sync(@Request() req) {
    return this.templates.syncFromMeta(req.user.id);
  }
}
