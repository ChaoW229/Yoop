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

  async update(id: string, body: Partial<{
    project_id: string;
    name: string;
    category: string;
    amount: number;
    payer: string;
    is_treat: boolean;
    bill_date: string;
    participants: string[];
  }>) {
    /* 先获取原数据，用于更新项目总金额 */
    const { data: oldBill } = await this.client.from('bills').select('*').eq('id', id).single();

    const updateData: Record<string, any> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.payer !== undefined) updateData.payer = body.payer;
    if (body.is_treat !== undefined) updateData.is_treat = body.is_treat;
    if (body.bill_date !== undefined) updateData.bill_date = body.bill_date;
    if (body.participants !== undefined) updateData.participants = body.participants;

    const { data, error } = await this.client
      .from('bills')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`更新失败: ${error.message}`);

    /* 如果金额变化，重新计算项目总金额 */
    if (oldBill && oldBill.project_id && body.amount !== undefined && body.amount !== oldBill.amount) {
      const diff = Number(body.amount) - Number(oldBill.amount);
      const { data: project } = await this.client.from('projects').select('total_amount').eq('id', oldBill.project_id).single();
      const newTotal = (Number(project?.total_amount) || 0) + diff;
      await this.client.from('projects').update({ total_amount: Math.max(0, newTotal).toFixed(2) }).eq('id', oldBill.project_id);
    }

    return data;
  }

  async remove(id: string) {
    /* 先获取原数据，用于更新项目总金额 */
    const { data: oldBill } = await this.client.from('bills').select('*').eq('id', id).single();

    const { data, error } = await this.client.from('bills').delete().eq('id', id).select().single();
    if (error) throw new Error(`删除失败: ${error.message}`);

    /* 更新项目总金额（减去被删除账单的金额）*/
    if (oldBill && oldBill.project_id) {
      const { data: project } = await this.client.from('projects').select('total_amount').eq('id', oldBill.project_id).single();
      const newTotal = (Number(project?.total_amount) || 0) - Number(oldBill.amount);
      await this.client.from('projects').update({ total_amount: Math.max(0, newTotal).toFixed(2) }).eq('id', oldBill.project_id);
    }

    return data;
  }
}
