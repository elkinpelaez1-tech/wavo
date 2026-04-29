import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ContactsService, CreateContactDto } from './contacts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private contacts: ContactsService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.contacts.findAll(req.user.id, +page, +limit);
  }

  @Post()
  create(@Body() dto: CreateContactDto, @Request() req) {
    return this.contacts.create(req.user.id, dto, req.user.plan);
  }

  @Post('import')
  importBulk(@Body() body: { contacts: CreateContactDto[] }, @Request() req) {
    return this.contacts.importBulk(req.user.id, body.contacts, req.user.plan);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateContactDto>, @Request() req) {
    return this.contacts.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.contacts.remove(id, req.user.id);
  }
}
