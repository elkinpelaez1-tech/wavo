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

  async uploadAvatar(userId: string, file: any) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Solo se aceptan imágenes JPG, PNG o WEBP.');
    }

    const maxSizeBytes = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('El archivo excede el tamaño máximo permitido de 2 MB.');
    }

    // 1. Obtener usuario actual para conocer su avatar anterior
    const { data: user, error: fetchError } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const oldAvatarUrl = user.avatar_url;

    // 2. Subir nuevo archivo a Supabase Storage
    const ext = file.originalname?.split('.').pop() || 'png';
    const filePath = `avatars/${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('avatars')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new InternalServerErrorException(`Error al subir imagen a Storage: ${uploadError.message}`);
    }

    // 3. Obtener URL pública
    const { data: { publicUrl } } = this.supabase.client.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // 4. Actualizar users.avatar_url
    const { data: updatedUser, error: updateError } = await this.supabase.client
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)
      .select()
      .single();

    if (updateError || !updatedUser) {
      throw new InternalServerErrorException(updateError?.message || 'Error al actualizar avatar en el usuario');
    }

    // 5. Eliminar avatar anterior de Storage solo tras confirmar actualización exitosa
    if (oldAvatarUrl) {
      try {
        const urlParts = oldAvatarUrl.split('/avatars/');
        if (urlParts.length > 1) {
          const oldPath = urlParts[1];
          await this.supabase.client.storage
            .from('avatars')
            .remove([oldPath]);
        }
      } catch (err) {
        console.warn('Error al eliminar avatar anterior de Storage:', err);
      }
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
