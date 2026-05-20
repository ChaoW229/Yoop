import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  async findAll() {
    const data = await this.service.findAll();
    return { code: 200, msg: 'ok', data };
  }

  @Post()
  async create(@Body() body: { name: string; destination: string; startDate?: string; endDate?: string; participants?: string[]; coverUrl?: string }) {
    const data = await this.service.create({
      name: body.name,
      destination: body.destination,
      start_date: body.startDate,
      end_date: body.endDate,
      participants: body.participants,
      cover_url: body.coverUrl,
    });
    return { code: 200, msg: 'ok', data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.service.findOne(id);
    return { code: 200, msg: 'ok', data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.service.update(id, body);
    return { code: 200, msg: 'ok', data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { code: 200, msg: 'ok' };
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    const data = await this.service.getStats(id);
    return { code: 200, msg: 'ok', data };
  }

  @Get(':id/bills')
  async getBills(@Param('id') id: string, @Query('category') category?: string) {
    const data = await this.service.getBills(id, category);
    return { code: 200, msg: 'ok', data };
  }
}
