import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class ProjectsService {
  private client = getSupabaseClient();

  async findAll() {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`查询失败: ${error.message}`);
    return data || [];
  }

  async create(body: { name: string; destination: string; start_date?: string; end_date?: string; participants?: string[] }) {
    const { data, error } = await this.client
      .from('projects')
      .insert({
        name: body.name,
        destination: body.destination,
        start_date: body.start_date,
        end_date: body.end_date,
        participants: body.participants || [],
      })
      .select()
      .single();
    if (error) throw new Error(`创建失败: ${error.message}`);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(`查询失败: ${error.message}`);
    return data;
  }

  async getStats(id: string) {
    const { data: bills, error } = await this.client
      .from('bills')
      .select('*')
      .eq('project_id', id);
    if (error) throw new Error(`查询失败: ${error.message}`);

    const list = bills || [];
    const total = list.reduce((sum, b) => sum + Number(b.amount), 0);
    const byCategory: Record<string, number> = {};
    const byDate: Record<string, { items: typeof list; total: number }> = {};

    for (const b of list) {
      byCategory[b.category] = (byCategory[b.category] || 0) + Number(b.amount);
      const d = b.bill_date || '未知日期';
      if (!byDate[d]) byDate[d] = { items: [], total: 0 };
      byDate[d].items.push(b);
      byDate[d].total += Number(b.amount);
    }

    return { total, byCategory, byDate, billCount: list.length };
  }

  async getBills(projectId: string, category?: string) {
    let q = this.client
      .from('bills')
      .select('*')
      .eq('project_id', projectId)
      .order('bill_date', { ascending: false });
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw new Error(`查询失败: ${error.message}`);
    return data || [];
  }

  async update(id: string, body: any) {
    const { data, error } = await this.client
      .from('projects')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`更新失败: ${error.message}`);
    return data;
  }

  async remove(id: string) {
    await this.client.from('bills').delete().eq('project_id', id);
    const { error } = await this.client.from('projects').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);
  }
}
