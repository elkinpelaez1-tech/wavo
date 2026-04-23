import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private campaigns: CampaignsService) {}

  @Get()
  findAll(@Request() req) {
    return this.campaigns.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.campaigns.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateCampaignDto, @Request() req) {
    return this.campaigns.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto, @Request() req) {
    return this.campaigns.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.campaigns.remove(id, req.user.id);
  }

  @Post(':id/launch')
  launch(@Param('id') id: string, @Request() req) {
    return this.campaigns.launch(id, req.user.id);
  }

  @Get(':id/stats')
  stats(@Param('id') id: string, @Request() req) {
    return this.campaigns.getStats(id, req.user.id);
  }
}
