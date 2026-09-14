import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Get('ping')
  ping() {
    return {
      status: 'ok',
      frontend_url: process.env.FRONTEND_URL || 'NOT_SET',
    };
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req) {
    const { password_hash, ...user } = req.user;
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(@Request() req, @UploadedFile() file: any) {
    return this.auth.uploadAvatar(req.user.id, file);
  }
}
