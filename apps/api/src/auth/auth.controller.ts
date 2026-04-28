import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Get('ping')
  async ping() {
    const dns = require('dns');
    const lookup = await new Promise((resolve) => {
      dns.lookup('nepilpekxtvvgjzjsidc.supabase.co', (err, address, family) => {
        resolve({ err, address, family });
      });
    });

    return {
      status: 'ok',
      supabase_url_exists: !!process.env.SUPABASE_URL,
      supabase_url_value: process.env.SUPABASE_URL || 'NONE',
      dns_lookup: lookup,
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
