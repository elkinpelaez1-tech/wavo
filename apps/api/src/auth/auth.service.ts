import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';
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

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { data: user, error: fetchError } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const updates: Record<string, any> = {};

    if (dto.name !== undefined) {
      updates.name = dto.name;
    }

    if (dto.business_name !== undefined) {
      updates.business_name = dto.business_name;
    }

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Debes ingresar tu contraseña actual para cambiarla');
      }

      const currentHashed = crypto
        .createHash('sha256')
        .update(dto.currentPassword + process.env.JWT_SECRET)
        .digest('hex');

      if (currentHashed !== user.password_hash) {
        throw new UnauthorizedException('La contraseña actual es incorrecta');
      }

      const newHashed = crypto
        .createHash('sha256')
        .update(dto.newPassword + process.env.JWT_SECRET)
        .digest('hex');

      updates.password_hash = newHashed;
    }

    if (Object.keys(updates).length === 0) {
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }

    const { data: updatedUser, error: updateError } = await this.supabase.client
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError || !updatedUser) {
      throw new InternalServerErrorException(updateError?.message || 'Error al actualizar el perfil');
    }

    const { password_hash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  private signToken(userId: string, email: string) {
    const token = this.jwt.sign(
      { sub: userId, email },
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    );
    return { access_token: token };
  }
}
