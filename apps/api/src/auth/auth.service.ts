import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private supabase: SupabaseService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const { data: existing } = await this.supabase.client
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .single();

    if (existing) throw new ConflictException('Email ya registrado');

    const hashedPassword = crypto
      .createHash('sha256')
      .update(dto.password + process.env.JWT_SECRET)
      .digest('hex');

    const { data, error } = await this.supabase.client
      .from('users')
      .insert({
        email: dto.email,
        password_hash: hashedPassword,
        name: dto.name,
        business_name: dto.business_name,
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.signToken(data.id, data.email);
  }

  async login(dto: LoginDto) {
    const hashedPassword = crypto
      .createHash('sha256')
      .update(dto.password + process.env.JWT_SECRET)
      .digest('hex');

    const { data, error } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('email', dto.email)
      .eq('password_hash', hashedPassword)
      .single();

    if (error || !data) throw new UnauthorizedException('Credenciales inválidas');

    return this.signToken(data.id, data.email);
  }

  private signToken(userId: string, email: string) {
    const token = this.jwt.sign(
      { sub: userId, email },
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    );
    return { access_token: token };
  }
}
