import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Network } from '@/network';
import { ArrowLeft } from 'lucide-react-taro';

export default function StatsPage() {
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [total, setTotal] = useState(0);
  const [categoryData, setCategoryData] = useState<Record<string, number>>({});
  const [dateData, setDateData] = useState<Record<string, any[]>>({});
  const [, setLoading] = useState(true);
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  useEffect(() => {
    const info = Taro.getSystemInfoSync();
    setStatusBarHeight(info.statusBarHeight || 0);
  }, []);

  const goBack = () => Taro.navigateBack();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await Network.request({ url: '/api/projects' });
      const projects = res.data?.data || [];
      let allTotal = 0;
      const catMap: Record<string, number> = {};
      const dateMap: Record<string, any[]> = {};

      for (const p of projects) {
        allTotal += Number(p.total_amount || 0);
      }
      setTotal(allTotal);

      const billsRes = await Network.request({ url: '/api/bills' });
      const bills = billsRes.data?.data || [];
      for (const b of bills) {
        if (b.category) {
          catMap[b.category] = (catMap[b.category] || 0) + Number(b.amount || 0);
        }
        if (b.bill_date) {
          if (!dateMap[b.bill_date]) dateMap[b.bill_date] = [];
          dateMap[b.bill_date].push(b);
        }
      }
      setCategoryData(catMap);
      setDateData(dateMap);
    } catch (e) {
      console.error('stats error', e);
    } finally {
      setLoading(false);
    }
  };

  useLoad(() => {
    fetchStats();
  });

  const categoryColors: Record<string, string> = {
    交通: '#5B9BD5',
    餐饮: '#C4B8A8',
    住宿: '#B8C4A8',
    纪念品: '#D4B8A8',
    门票: '#A8B4C4',
    其他: '#D4C4B8',
  };

  const categories = Object.entries(categoryData).sort((a, b) => b[1] - a[1]);
  const totalCategory = categories.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <View className="flex flex-col h-full bg-white">
      {/* Custom header with safe area */}
      <View style={{ paddingTop: statusBarHeight }} className="bg-white px-4 py-3 flex items-center gap-3">
        <View onClick={goBack} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
          <ArrowLeft size={20} color="#8896A6" />
        </View>
        <Text className="block text-lg font-semibold text-on-surface">支出统计</Text>
      </View>

      <View className="flex-1 px-4 py-4">
        <Text className="block text-2xl font-bold text-primary">¥{total.toFixed(0)}</Text>
        <Text className="block text-sm text-on-surface-variant mt-1">总支出</Text>

        {viewMode === 'chart' && (
          <View className="mt-6">
            <Text className="block text-base font-semibold text-on-surface mb-4">分类统计</Text>
            {categories.map(([cat, amount]) => {
              const pct = ((amount / totalCategory) * 100).toFixed(0);
              return (
                <View key={cat} className="flex items-center gap-3 mb-3">
                  <View className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColors[cat] || '#D4C4B8' }} />
                  <Text className="block text-sm text-on-surface flex-1">{cat}</Text>
                  <Text className="block text-sm font-semibold text-on-surface">¥{amount}</Text>
                  <Text className="block text-xs text-on-surface-variant w-10 text-right">{pct}%</Text>
                </View>
              );
            })}
          </View>
        )}

        {viewMode === 'list' && (
          <View className="mt-6">
            <Text className="block text-base font-semibold text-on-surface mb-4">明细</Text>
            {Object.entries(dateData)
              .sort(([a], [b]) => (a > b ? -1 : 1))
              .map(([date, bills]) => (
                <View key={date} className="mb-4">
                  <Text className="block text-xs text-on-surface-variant mb-2">{date}</Text>
                  {bills.map((b: any) => (
                    <View key={b.id} className="flex items-center justify-between py-2 border-b border-outline-variant">
                      <Text className="block text-sm text-on-surface">{b.name}</Text>
                      <Text className="block text-sm font-semibold text-on-surface">¥{Number(b.amount).toFixed(0)}</Text>
                    </View>
                  ))}
                </View>
              ))}
          </View>
        )}
      </View>

      {/* View toggle */}
      <View className="px-4 py-3 bg-white border-t border-outline-variant">
        <View className="flex rounded-xl overflow-hidden">
          <View
            onClick={() => setViewMode('chart')}
            className={`flex-1 py-2 flex items-center justify-center ${viewMode === 'chart' ? 'bg-primary' : 'bg-surface-container'}`}
          >
            <Text className={`block text-sm font-semibold ${viewMode === 'chart' ? 'text-primary-foreground' : 'text-on-surface-variant'}`}>图表</Text>
          </View>
          <View
            onClick={() => setViewMode('list')}
            className={`flex-1 py-2 flex items-center justify-center ${viewMode === 'list' ? 'bg-primary' : 'bg-surface-container'}`}
          >
            <Text className={`block text-sm font-semibold ${viewMode === 'list' ? 'text-primary-foreground' : 'text-on-surface-variant'}`}>明细</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
