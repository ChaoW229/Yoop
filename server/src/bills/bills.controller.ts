import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { BillsService } from './bills.service';

@Controller('bills')
export class BillsController {
  constructor(private readonly service: BillsService) {}

  @Get()
  async findAll(@Query('project_id') projectId?: string) {
    const data = await this.service.findAll(projectId);
    return { code: 200, msg: 'ok', data };
  }

  @Post()
  async create(@Body() body: {
    projectId: string;
    name: string;
    category: string;
    amount: number;
    payer: string;
    isTreat?: boolean;
    billDate?: string;
    participants?: string[];
  }) {
    const data = await this.service.create({
      project_id: body.projectId,
      name: body.name,
      category: body.category,
      amount: body.amount,
      payer: body.payer,
      is_treat: body.isTreat,
      bill_date: body.billDate,
      participants: body.participants,
    });
    return { code: 200, msg: 'ok', data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.service.findOne(id);
    return { code: 200, msg: 'ok', data };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      projectId?: string;
      name?: string;
      category?: string;
      amount?: number;
      payer?: string;
      isTreat?: boolean;
      billDate?: string;
      participants?: string[];
    },
  ) {
    const data = await this.service.update(id, {
      project_id: body.projectId,
      name: body.name,
      category: body.category,
      amount: body.amount,
      payer: body.payer,
      is_treat: body.isTreat,
      bill_date: body.billDate,
      participants: body.participants,
    });
    return { code: 200, msg: 'ok', data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.service.remove(id);
    return { code: 200, msg: 'ok', data };
  }
}
