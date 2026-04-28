import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Get('ping')
  ping() {
    return {
      status: 'ok',
      supabase_url_exists: !!process.env.SUPABASE_URL,
      supabase_url_value: process.env.SUPABASE_URL || 'NONE',
      redis_url_exists: !!process.env.REDIS_URL,
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
}
