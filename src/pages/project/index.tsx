import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Network } from '@/network';
import { ArrowLeft, Plus, Calculator, Trash2 } from 'lucide-react-taro';

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  useEffect(() => {
    const info = Taro.getSystemInfoSync();
    setStatusBarHeight(info.statusBarHeight || 0);
  }, []);

  const fetchData = async () => {
    const pages = Taro.getCurrentPages();
    const current = pages[pages.length - 1];
    const id = current.options?.id;
    if (!id) return;
    try {
      const [projRes, billsRes] = await Promise.all([
        Network.request({ url: `/api/projects/${id}` }),
        Network.request({ url: `/api/projects/${id}/bills` }),
      ]);
      setProject(projRes.data?.data);
      setBills(billsRes.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useLoad(() => {
    fetchData();
  });

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const goBack = () => Taro.navigateBack();
  const goStats = () => Taro.navigateTo({ url: `/pages/stats/index?id=${project?.id}` });
  const goAddBill = () => Taro.navigateTo({ url: `/pages/add-bill/index?project_id=${project?.id}` });

  const handleUpdateName = () => {
    if (!project) return;
    (Taro as any).showModal({
      title: '修改项目名',
      editable: true,
      content: project.name || '',
      success: async (res: any) => {
        if (res.confirm && res.content) {
          await Network.request({ url: `/api/projects/${project.id}`, method: 'PUT', data: { name: res.content } });
          setRefreshKey(k => k + 1);
        }
      },
    });
  };

  const handleUpdateDate = (field: string, label: string) => {
    if (!project) return;
    (Taro as any).showModal({
      title: label,
      editable: true,
      content: project[field] || '',
      success: async (res: any) => {
        if (res.confirm) {
          await Network.request({ url: `/api/projects/${project.id}`, method: 'PUT', data: { [field]: res.content } });
          setRefreshKey(k => k + 1);
        }
      },
    });
  };

  const handleDelete = () => {
    if (!project) return;
    Taro.showModal({
      title: '删除项目',
      content: '确定要删除吗？账单也将一并删除。',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          await Network.request({ url: `/api/projects/${project.id}`, method: 'DELETE' });
          Taro.navigateBack();
        }
      },
    });
  };

  const billDates = bills.map(b => b.bill_date).filter(Boolean) as string[];
  const autoStart = billDates.length > 0 ? billDates.reduce((a, b) => (a < b ? a : b)) : project?.start_date;
  const autoEnd = billDates.length > 0 ? billDates.reduce((a, b) => (a > b ? a : b)) : project?.end_date;
  const displayStart = project?.start_date || autoStart || '待定';
  const displayEnd = project?.end_date || autoEnd || '待定';
  const totalAmount = bills.reduce((sum, b) => sum + Number(b.amount), 0);
  const treatAmount = bills.filter(b => b.is_treat).reduce((sum, b) => sum + Number(b.amount), 0);
  const splitAmount = totalAmount - treatAmount;
  const participantCount = project?.participants?.length || 1;
  const perPerson = participantCount > 0 ? splitAmount / participantCount : 0;

  const byDate: Record<string, Bill[]> = {};
  for (const b of bills) {
    const d = b.bill_date || '未分类';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(b);
  }

  return (
    <View className="flex flex-col min-h-full bg-background">
      <View style={{ paddingTop: statusBarHeight }} className="flex items-center px-4 py-2 bg-surface">
        <View onClick={goBack} className="w-8 h-8 flex items-center justify-center">
          <ArrowLeft size={18} color="#3D3B38" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold text-on-surface pr-8">项目详情</Text>
      </View>

      <View className="px-4 pt-3 pb-4">
        <View className="bg-surface rounded-2xl shadow-card p-4 mb-3">
          <View onClick={handleUpdateName}>
            <Text className="block text-base font-semibold text-on-surface">{project?.name}</Text>
          </View>
          <View className="flex items-center gap-2 mt-1">
            <Text className="block text-xs text-on-surface-variant" onClick={() => handleUpdateDate('start_date', '开始日期')}>{displayStart}</Text>
            <Text className="block text-xs text-on-surface-variant">~</Text>
            <Text className="block text-xs text-on-surface-variant" onClick={() => handleUpdateDate('end_date', '结束日期')}>{displayEnd}</Text>
          </View>
          <View onClick={goStats} className="mt-2">
            <Text className="block text-xl font-bold text-primary">¥{totalAmount.toFixed(0)}</Text>
            <Text className="block text-xs text-on-surface-variant">总金额</Text>
          </View>
          <View className="mt-2 bg-surface-container rounded-xl p-3">
            <Text className="block text-xs text-on-surface-variant">人均分摊（扣除请客）</Text>
            <Text className="block text-base font-bold text-primary mt-1">¥{perPerson.toFixed(2)}</Text>
          </View>
          <View className="flex gap-1 mt-2">
            {(project?.participants || []).map((name: string, i: number) => (
              <View key={i} className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center">
                <Text className="block text-xs text-primary">{name[0]}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="flex gap-2 mb-3">
          <View onClick={goAddBill} className="flex-1 bg-primary rounded-xl py-3 flex items-center justify-center gap-2">
            <Plus size={14} color="#fff" />
            <Text className="block text-sm font-semibold text-white">添加花费</Text>
          </View>
          <View className="flex-1 bg-surface-container rounded-xl py-3 flex items-center justify-center gap-2">
            <Calculator size={14} color="#3D3B38" />
            <Text className="block text-sm font-semibold text-on-surface">分账结算</Text>
          </View>
          <View onClick={handleDelete} className="bg-surface-container rounded-xl py-3 px-3 flex items-center justify-center">
            <Trash2 size={14} color="#ef4444" />
          </View>
        </View>

        <Text className="block text-sm font-semibold text-on-surface mb-2">账单明细</Text>
        {Object.entries(byDate).map(([date, items]) => (
          <View key={date} className="mb-3">
            <Text className="block text-xs text-on-surface-variant mb-2">{date}</Text>
            {items.map(b => (
              <View key={b.id} className="flex items-center justify-between bg-surface rounded-xl p-3 mb-2 shadow-card">
                <View className="flex items-center gap-3">
                  <View className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center">
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
      </View>
    </View>
  );
}
