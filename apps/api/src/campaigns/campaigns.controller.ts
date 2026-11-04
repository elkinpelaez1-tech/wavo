import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as os from 'os';
import * as path from 'path';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('campaigns')
export class CampaignsController {
  constructor(private campaigns: CampaignsService) {}

  @Get('media/ffmpeg-status')
  getFfmpegStatus() {
    return this.campaigns.getFfmpegStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req) {
    return this.campaigns.findAll(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.campaigns.findOne(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          const ext = path.extname(file.originalname) || '';
          cb(null, `wavo-upload-${unique}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  uploadMedia(@Request() req, @UploadedFile() file: any) {
    return this.campaigns.uploadMedia(req.user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateCampaignDto, @Request() req) {
    return this.campaigns.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto, @Request() req) {
    return this.campaigns.update(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.campaigns.remove(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/launch')
  launch(@Param('id') id: string, @Request() req) {
    return this.campaigns.launch(id, req.user.id, req.user.plan);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/stats')
  stats(@Param('id') id: string, @Request() req) {
    return this.campaigns.getStats(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/recipients')
  getRecipients(
    @Param('id') id: string,
    @Query('status') status: string,
    @Request() req,
  ) {
    return this.campaigns.getRecipients(id, req.user.id, status);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/depurate-failed')
  depurateFailed(@Param('id') id: string, @Request() req) {
    return this.campaigns.depurateFailedRecipients(id, req.user.id);
  }
}
