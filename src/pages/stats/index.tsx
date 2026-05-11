import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Network } from '@/network';
import { ArrowLeft } from 'lucide-react-taro';

export default function StatsPage() {
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [stats, setStats] = useState<any>(null);

  useLoad(async () => {
    const pages = Taro.getCurrentPages();
    const current = pages[pages.length - 1];
    const id = current.options?.id;
    if (!id) return;
    try {
      const statsRes = await Network.request({ url: `/api/projects/${id}/stats` });
      console.log('stats', statsRes.data);
      setStats(statsRes.data?.data);
    } catch (e) {
      console.error(e);
    }
  });

  const goBack = () => {
    Taro.navigateBack();
  };

  const total = stats?.total || 0;
  const byCategory = stats?.byCategory || {};
  const byDate = stats?.byDate || {};

  const colors: Record<string, string> = {
    transport: '#9AA5B1',
    food: '#C4B8A8',
    hotel: '#B8C4A8',
    souvenir: '#D4C4B8',
    ticket: '#A8B5C4',
    other: '#C4BFB8',
  };

  const categories = Object.entries(byCategory).sort((a: any, b: any) => b[1] - a[1]);
  const catTotal = categories.reduce((sum, [, v]) => sum + Number(v), 0);

  return (
    <View className="flex flex-col min-h-full bg-background">
      <View className="flex items-center px-4 py-3 bg-surface">
        <View onClick={goBack} className="w-10 h-10 flex items-center justify-center">
          <ArrowLeft size={20} color="#3D3B38" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold text-on-surface pr-10">
          银两用度
        </Text>
      </View>

      <View className="px-4 py-4">
        <View className="bg-surface rounded-2xl shadow-card p-6 flex flex-col items-center mb-4">
          <Text className="block text-3xl font-bold text-primary">¥{Number(total).toFixed(0)}</Text>
          <Text className="block text-xs text-on-surface-variant mt-1">旅程总花销</Text>
        </View>

        {viewMode === 'chart' ? (
          <View className="bg-surface rounded-2xl shadow-card p-4 mb-4">
            <Text className="block text-sm font-semibold text-on-surface mb-4">行止分布</Text>
            {/* Pie chart using CSS conic-gradient */}
            <View className="flex items-center justify-center mb-4">
              <View
                className="w-40 h-40 rounded-full"
                style={{
                  background: `conic-gradient(${categories.map(([k, v], i) => {
                    const prev = categories.slice(0, i).reduce((s, [, vv]) => s + Number(vv), 0);
                    const start = (prev / catTotal) * 360;
                    const end = ((prev + Number(v)) / catTotal) * 360;
                    return `${colors[k] || '#C4BFB8'} ${start}deg ${end}deg`;
                  }).join(', ')})`,
                }}
              />
            </View>
            <View className="flex flex-col gap-2">
              {categories.map(([k, v]) => (
                <View key={k} className="flex items-center justify-between">
                  <View className="flex items-center gap-2">
                    <View
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors[k] || '#C4BFB8' }}
                    />
                    <Text className="block text-sm text-on-surface">{k}</Text>
                  </View>
                  <Text className="block text-sm text-on-surface-variant">
                    ¥{Number(v).toFixed(0)} ({catTotal ? Math.round((Number(v) / catTotal) * 100) : 0}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View className="bg-surface rounded-2xl shadow-card p-4 mb-4">
            <Text className="block text-sm font-semibold text-on-surface mb-4">按良辰汇总</Text>
            {Object.entries(byDate).map(([date, d]: [string, any]) => (
              <View key={date} className="mb-4">
                <Text className="block text-xs text-on-surface-variant mb-2">{date}</Text>
                {d.items.map((item: any) => (
                  <View key={item.id} className="flex items-center justify-between py-2 border-b border-outline-variant">
                    <View>
                      <Text className="block text-sm text-on-surface">{item.name}</Text>
                      <Text className="block text-xs text-on-surface-variant">{item.category}</Text>
                    </View>
                    <Text className="block text-sm font-semibold text-on-surface">¥{Number(item.amount).toFixed(0)}</Text>
                  </View>
                ))}
                <View className="flex justify-end mt-1">
                  <Text className="block text-xs text-primary font-semibold">当日合计 ¥{Number(d.total).toFixed(0)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', padding: '12px', backgroundColor: '#F7F5F2', borderTop: '1px solid #DDD8D2', gap: '8px' }}>
        <View
          onClick={() => setViewMode('chart')}
          className={`flex-1 py-3 rounded-xl text-center ${viewMode === 'chart' ? 'bg-primary' : 'bg-surface-container'}`}
        >
          <Text className={`block text-sm font-semibold ${viewMode === 'chart' ? 'text-white' : 'text-on-surface-variant'}`}>
            图表
          </Text>
        </View>
        <View
          onClick={() => setViewMode('list')}
          className={`flex-1 py-3 rounded-xl text-center ${viewMode === 'list' ? 'bg-primary' : 'bg-surface-container'}`}
        >
          <Text className={`block text-sm font-semibold ${viewMode === 'list' ? 'text-white' : 'text-on-surface-variant'}`}>
            明细
          </Text>
        </View>
      </View>
    </View>
  );
}
