import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class BillsService {
  private client = getSupabaseClient();

  async findAll(projectId?: string) {
    let q = this.client.from('bills').select('*').order('bill_date', { ascending: false });
    if (projectId) q = q.eq('project_id', projectId);
    const { data, error } = await q;
    if (error) throw new Error(`查询失败: ${error.message}`);
    return data || [];
  }

  async create(body: {
    project_id: string;
    name: string;
    category: string;
    amount: number;
    payer: string;
    is_treat?: boolean;
    bill_date?: string;
    participants?: string[];
  }) {
    const { data, error } = await this.client
      .from('bills')
      .insert({
        project_id: body.project_id,
        name: body.name,
        category: body.category,
        amount: body.amount,
        payer: body.payer,
        is_treat: body.is_treat || false,
        bill_date: body.bill_date,
        participants: body.participants || [],
      })
      .select()
      .single();
    if (error) throw new Error(`创建失败: ${error.message}`);
    // Update project total
    const { data: project } = await this.client.from('projects').select('total_amount').eq('id', body.project_id).single();
    const newTotal = (Number(project?.total_amount) || 0) + Number(body.amount);
    await this.client.from('projects').update({ total_amount: newTotal.toFixed(2) }).eq('id', body.project_id);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.client.from('bills').select('*').eq('id', id).single();
    if (error) throw new Error(`查询失败: ${error.message}`);
    return data;
  }
}
