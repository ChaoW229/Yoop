import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
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
  async create(@Body() body: { name: string; destination: string; startDate?: string; endDate?: string; participants?: string[] }) {
    const data = await this.service.create({
      name: body.name,
      destination: body.destination,
      start_date: body.startDate,
      end_date: body.endDate,
      participants: body.participants,
    });
    return { code: 200, msg: 'ok', data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.service.findOne(id);
    return { code: 200, msg: 'ok', data };
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
