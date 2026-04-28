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
    try {
      console.log("[AuthService] Verificando si existe:", dto.email);
      const { data: existing, error: existingError } = await this.supabase.client
        .from('users')
        .select('id')
        .eq('email', dto.email)
        .single();
      
      if (existingError && existingError.code !== 'PGRST116') {
        console.log("[AuthService] Error checking existing user:", existingError);
      }

      if (existing) throw new ConflictException('Email ya registrado');

      const hashedPassword = crypto
        .createHash('sha256')
        .update(dto.password + process.env.JWT_SECRET)
        .digest('hex');

      console.log("Insertando usuario en Supabase...");
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

      console.log("[AuthService] Resultado Supabase insert:", { data, error });

      if (error) {
        console.error("[AuthService] Error exacto Supabase:", error);
        throw new InternalServerErrorException(`Supabase error: ${JSON.stringify(error)}`);
      }

      return this.signToken(data.id, data.email);
    } catch (err) {
      console.error("[AuthService] Full Try/Catch Error:", err);
      if (err instanceof ConflictException || err instanceof InternalServerErrorException) {
        throw err;
      }
      throw new InternalServerErrorException(`Real Error: ${err.message || JSON.stringify(err)}`);
    }
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
