import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  findAll(@Request() req, @Query('search') search?: string) {
    return this.conversationsService.findAll(req.user.id, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.conversationsService.findOne(id, req.user.id);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string, @Request() req) {
    return this.conversationsService.getMessages(id, req.user.id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Request() req) {
    return this.conversationsService.markAsRead(id, req.user.id);
  }
}
