import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString({ message: 'El cuerpo del mensaje debe ser un texto' })
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
  @MaxLength(4096, { message: 'El mensaje no puede exceder 4096 caracteres' })
  body: string;
}
