import { IsString, IsOptional, IsDateString, IsArray } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  template_name?: string;


  @IsString()
  @IsOptional()
  template_language?: string = 'es';

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsDateString()
  @IsOptional()
  scheduled_at?: string;

  @IsArray()
  contact_ids: string[];
}

export class UpdateCampaignDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsDateString()
  @IsOptional()
  scheduled_at?: string;
}
