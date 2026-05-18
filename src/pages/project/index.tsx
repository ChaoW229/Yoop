import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Input } from '@/components/ui/input';
import { Network } from '@/network';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-taro';

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
  const [editName, setEditName] = useState('');
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
      const projData = projRes.data?.data;
      setProject(projData);
      setEditName(projData?.name || '');
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
  const goAddBill = () => Taro.navigateTo({ url: `/pages/add-bill/index?project_id=${project?.id}` });

  const handleUpdateName = async () => {
    if (!project || !editName.trim()) return;
    await Network.request({ url: `/api/projects/${project.id}`, method: 'PUT', data: { name: editName.trim() } });
    setRefreshKey(k => k + 1);
  };

  const handleDelete = () => {
    if (!project) return;
    Taro.showModal({
      title: '删除项目',
      content: '确定要删除吗？账单也将一并删除。',
      confirmColor: '#C4716B',
      success: async (res) => {
        if (res.confirm) {
          await Network.request({ url: `/api/projects/${project.id}`, method: 'DELETE' });
          Taro.navigateBack();
        }
      },
    });
  };

  // 起止时间自动取自第一笔和最后一笔账单
  const billDates = bills.map(b => b.bill_date).filter(Boolean) as string[];
  const displayStart = billDates.length > 0 ? billDates.reduce((a, b) => (a < b ? a : b)) : (project?.start_date || '待定');
  const displayEnd = billDates.length > 0 ? billDates.reduce((a, b) => (a > b ? a : b)) : (project?.end_date || '待定');

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
    <View className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <View style={{ paddingTop: statusBarHeight }} className="flex items-center px-4 py-2 bg-white">
        <View onClick={goBack} className="w-8 h-8 flex items-center justify-center">
          <ArrowLeft size={18} color="#9B9690" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold text-on-surface pr-8">项目详情</Text>
      </View>

      <View className="flex-1 px-4 pt-4 pb-4">
        {/* 项目名输入框 */}
        <View className="bg-surface rounded-2xl p-4 mb-3 shadow-card">
          <View className="bg-surface-container rounded-xl px-4 py-3 mb-3">
            <Input
              className="w-full bg-transparent text-base text-on-surface"
              placeholder="输入项目名"
              value={editName}
              onInput={e => setEditName(e.detail.value)}
              onBlur={handleUpdateName}
            />
          </View>
          <View className="flex items-center gap-2 mb-3">
            <Text className="block text-xs text-on-surface-variant">{displayStart}</Text>
            <Text className="block text-xs text-on-surface-variant">~</Text>
            <Text className="block text-xs text-on-surface-variant">{displayEnd}</Text>
          </View>
          <View className="flex items-end justify-between">
            <View>
              <Text className="block text-xs text-on-surface-variant">总金额</Text>
              <Text className="block text-2xl font-bold text-primary mt-1">¥{totalAmount.toFixed(0)}</Text>
            </View>
            <View className="bg-surface-container rounded-xl px-4 py-2">
              <Text className="block text-xs text-on-surface-variant">人均 ¥{perPerson.toFixed(2)}</Text>
              {treatAmount > 0 && (
                <Text className="block text-xs text-on-surface-variant mt-1">含请客 ¥{treatAmount.toFixed(0)}</Text>
              )}
            </View>
          </View>
        </View>

        {/* 添加花费 全宽按钮 */}
        <View
          onClick={goAddBill}
          className="w-full bg-primary rounded-2xl py-4 flex items-center justify-center gap-2 mb-3 shadow-card"
        >
          <Plus size={18} color="#FFFFFF" />
          <Text className="block text-base font-semibold text-primary-foreground">添加花费</Text>
        </View>

        {/* 账单明细 */}
        <Text className="block text-sm font-semibold text-on-surface mb-3">账单明细</Text>
        {Object.entries(byDate).map(([date, items]) => (
          <View key={date} className="mb-3">
            <Text className="block text-xs text-on-surface-variant mb-2">{date}</Text>
            {items.map(b => (
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

        {/* 删除项目 全宽按钮 */}
        <View
          onClick={handleDelete}
          className="w-full bg-surface-container rounded-2xl py-4 flex items-center justify-center gap-2 mt-4"
        >
          <Trash2 size={16} color="#C4716B" />
          <Text className="block text-sm font-semibold" style={{ color: '#C4716B' }}>删除项目</Text>
        </View>
      </View>
    </View>
  );
}
