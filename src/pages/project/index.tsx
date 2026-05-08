import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Network } from '@/network';
import { ArrowLeft, Plus, Calculator, Calendar } from 'lucide-react-taro';

interface Bill {
  id: string;
  name: string;
  category: string;
  amount: string;
  payer: string;
  is_treat: boolean;
  bill_date?: string;
}

export default function ProjectPage() {
  const [project, setProject] = useState<any>(null);
  const [bills, setBills] = useState<Bill[]>([]);

  useLoad(async () => {
    const pages = Taro.getCurrentPages();
    const current = pages[pages.length - 1];
    const id = current.options?.id;
    if (!id) return;
    try {
      const [projRes, billsRes] = await Promise.all([
        Network.request({ url: `/api/projects/${id}` }),
        Network.request({ url: `/api/projects/${id}/bills` }),
      ]);
      console.log('project', projRes.data);
      setProject(projRes.data?.data);
      setBills(billsRes.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  });

  const goBack = () => Taro.navigateBack();
  const goStats = () => Taro.navigateTo({ url: `/pages/stats/index?id=${project?.id}` });
  const goAddBill = () => Taro.navigateTo({ url: `/pages/add-bill/index?project_id=${project?.id}` });

  const byDate: Record<string, Bill[]> = {};
  for (const b of bills) {
    const d = b.bill_date || '未分类';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(b);
  }

  return (
    <View className="flex flex-col min-h-full bg-background">
      <View className="flex items-center px-4 py-3 bg-surface">
        <View onClick={goBack} className="w-10 h-10 flex items-center justify-center">
          <ArrowLeft size={20} color="#3D3B38" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold text-on-surface pr-10">
          {project?.name || '项目详情'}
        </Text>
      </View>

      <View className="px-4 py-4">
        <View className="bg-surface rounded-2xl shadow-card p-4 mb-4">
          <Text className="block text-lg font-semibold text-on-surface">{project?.destination}</Text>
          <View className="flex items-center gap-1 mt-2">
            <Calendar size={14} color="#8A8680" />
            <Text className="block text-sm text-on-surface-variant">
              {project?.start_date} - {project?.end_date}
            </Text>
          </View>
          <View onClick={goStats} className="mt-3">
            <Text className="block text-2xl font-bold text-primary">¥{Number(project?.total_amount || 0).toFixed(0)}</Text>
          </View>
          <View className="flex gap-1 mt-2">
            {(project?.participants || []).map((name: string, i: number) => (
              <View key={i} className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center">
                <Text className="block text-xs text-primary">{name[0]}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="flex gap-3 mb-4">
          <View
            onClick={goAddBill}
            className="flex-1 bg-primary rounded-xl py-3 flex items-center justify-center gap-2"
          >
            <Plus size={16} color="#fff" />
            <Text className="block text-sm font-semibold text-white">添加花费</Text>
          </View>
          <View className="flex-1 bg-surface-container rounded-xl py-3 flex items-center justify-center gap-2">
            <Calculator size={16} color="#3D3B38" />
            <Text className="block text-sm font-semibold text-on-surface">分账结算</Text>
          </View>
        </View>

        <Text className="block text-base font-semibold text-on-surface mb-3">账单明细</Text>
        {Object.entries(byDate).map(([date, items]) => (
          <View key={date} className="mb-4">
            <Text className="block text-xs text-on-surface-variant mb-2">{date}</Text>
            {items.map((b) => (
              <View key={b.id} className="flex items-center justify-between bg-surface rounded-xl p-3 mb-2 shadow-card">
                <View className="flex items-center gap-3">
                  <View className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                    <Text className="block text-xs text-on-surface-variant">{b.category[0]}</Text>
                  </View>
                  <View>
                    <Text className="block text-sm text-on-surface">{b.name}</Text>
                    <Text className="block text-xs text-on-surface-variant">{b.payer}</Text>
                  </View>
                </View>
                <View className="flex items-center gap-2">
                  {b.is_treat && (
                    <View className="bg-surface-container-high rounded-full px-2 py-1">
                      <Text className="block text-xs text-primary">请客</Text>
                    </View>
                  )}
                  <Text className={`block text-sm font-semibold ${b.is_treat ? 'text-primary' : 'text-on-surface'}`}>
                    ¥{Number(b.amount).toFixed(0)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
        {bills.length === 0 && (
          <View className="flex items-center justify-center py-12">
            <Text className="block text-sm text-on-surface-variant">暂无账单，点击上方添加</Text>
          </View>
        )}
      </View>
    </View>
  );
}
