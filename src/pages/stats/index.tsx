import { useState, useMemo } from 'react';
import Taro, { useLoad, useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { Network } from '@/network';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ArrowLeft, List, ChartPie, Calendar } from 'lucide-react-taro';

type TimeRange = 'all' | 'month' | 'week' | 'custom';

export default function StatsPage() {
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [total, setTotal] = useState(0);
  const [categoryData, setCategoryData] = useState<Record<string, number>>({});
  const [dateData, setDateData] = useState<Record<string, any[]>>({});
  const [, setLoading] = useState(true);

  /* 胶囊按钮对齐 */
  const sysInfo = Taro.getSystemInfoSync();
  const statusBarH = sysInfo.statusBarHeight || 20;
  let capsuleBottom = statusBarH + 44;
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === Taro.ENV_TYPE.TT;
  if (isWeapp) {
    try { const mb = Taro.getMenuButtonBoundingClientRect(); if (mb && mb.bottom) capsuleBottom = mb.bottom + 4; } catch (_) {}
  }

  const goBack = () => Taro.navigateBack();

  /* 时间筛选辅助函数 */
  const getDateRange = (range: TimeRange): { start: string; end: string; label: string } => {
    const now = new Date();
    if (range === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0], label: '近7天' };
    }
    if (range === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0], label: '本月' };
    }
    if (range === 'custom') {
      return { start: customStart, end: customEnd || '', label: `${customStart}~${customEnd}`.replace(/-/g, '/').slice(0, 20) };
    }
    return { start: '', end: '', label: '全部' };
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await Network.request({ url: '/api/projects' });
      const projects = res.data?.data || [];
      let allTotal = 0;

      for (const p of projects) {
        allTotal += Number(p.total_amount || 0);
      }
      setTotal(allTotal);

      const billsRes = await Network.request({ url: '/api/bills' });
      const bills = (billsRes.data?.data || []) as any[];

      /* 应用时间筛选 */
      const range = getDateRange(timeRange);
      const filteredBills = range.start ? bills.filter((b: any) => b.bill_date >= range.start && (!range.end || b.bill_date <= range.end)) : bills;

      const catMap: Record<string, number> = {};
      const dateMap: Record<string, any[]> = {};

      for (const b of filteredBills) {
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

  useLoad(() => { fetchStats(); });
  useDidShow(() => { fetchStats(); });

  /* 分类配色（环形图+条形图共用） */
  const categoryColors: Record<string, string> = {
    交通: '#5B9BD5',
    餐饮: '#D4A574',
    住宿: '#7BB874',
    纪念品: '#D47A8C',
    门票: '#9B8DD5',
    购物: '#D5A05B',
    娱乐: '#5BC4C4',
    其他: '#B8B8C8',
  };

  /* 按金额降序排列的分类列表 */
  const categories = useMemo(() => Object.entries(categoryData).sort((a, b) => b[1] - a[1]), [categoryData]);
  const totalCategory = categories.reduce((s, [, v]) => s + v, 0) || 1;

  /* 计算环形图的 conic-gradient 和各分类角度 */
  const donutGradient = useMemo(() => {
    if (categories.length === 0) return `conic-gradient(#E8ECF1 0% 100%)`;
    let currentPct = 0;
    const stops = categories.map(([cat, amount]) => {
      const pct = (amount / totalCategory) * 100;
      const color = categoryColors[cat] || '#B8B8C8';
      const stop = `${color} ${currentPct.toFixed(2)}% ${(currentPct + pct).toFixed(2)}%`;
      currentPct += pct;
      return stop;
    }).join(', ');
    return `conic-gradient(${stops})`;
  }, [categories, totalCategory]);

  /* 最大条宽用于计算百分比 */
  const maxCatAmount = categories.length > 0 ? categories[0][1] : 1;

  /* 内容区顶部固定区域高度：导航栏 + 总金额 + 筛选器 */
  const fixedTopH = capsuleBottom + 12 + 44 + 52; // header + total + filter
  const bottomBtnH = 56;

  return (
    <View className="flex flex-col h-full" style={{ backgroundColor: '#F7F9FC' }}>
      {/* ========== 自定义导航栏 ========== */}
      <View style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        paddingTop: statusBarH,
        height: capsuleBottom,
        backgroundColor: '#FFFFFF',
        display: 'flex', alignItems: 'center',
        paddingLeft: 12, paddingRight: 12,
      }}
      >
        <View onClick={goBack} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color="#8896A6" />
        </View>
        <Text className="block flex-1 text-center pr-10" style={{ fontSize: 17, fontWeight: '600', fontFamily: '-apple-system, "SF Pro Display", sans-serif', letterSpacing: 2, color: '#1E293B' }}>支出统计</Text>
      </View>

      {/* ========== 固定：总金额 ========== */}
      <View style={{
        position: 'fixed', top: capsuleBottom + 6, left: 16, right: 16, zIndex: 190,
        display: 'flex', alignItems: 'baseline', gap: 8,
        paddingTop: 10, paddingBottom: 10, paddingLeft: 4, paddingRight: 4,
      }}
      >
        <Text className="block" style={{ fontSize: 28, fontWeight: '700', color: '#1E293B' }}>¥{total.toFixed(0)}</Text>
        <Text className="block text-sm" style={{ color: '#94A3B8' }}>总支出</Text>
      </View>

      {/* ========== 固定：时间筛选器 ========== */}
      <View style={{
        position: 'fixed', top: capsuleBottom + 50, left: 16, right: 16, zIndex: 190,
      }}
      >
        <View style={{ display: 'flex', flexDirection: 'row', gap: 6 }}>
          {(['all', 'month', 'week'] as TimeRange[]).map((r) => (
            <View key={r}
              onClick={() => { setTimeRange(r); setShowDatePicker(false); }}
              style={{
                flex: 1, paddingTop: 8, paddingBottom: 8, borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                backgroundColor: timeRange === r ? '#1E293B' : '#FFFFFF',
                border: '1px solid #E8EDF2',
              }}
            >
              <Text className="block text-xs font-medium" style={{ color: timeRange === r ? '#FFFFFF' : '#64748B' }}>{getDateRange(r).label}</Text>
            </View>
          ))}
          {/* 自选日期按钮 */}
          <View
            onClick={() => setShowDatePicker(!showDatePicker)}
            style={{
              flex: 1, paddingTop: 8, paddingBottom: 8, borderRadius: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              backgroundColor: timeRange === 'custom' ? '#1E293B' : '#FFFFFF',
              border: '1px solid #E8EDF2',
            }}
          >
            <Calendar size={13} color={timeRange === 'custom' ? '#FFFFFF' : '#8896A6'} />
            <Text className="block text-xs font-medium" style={{ color: timeRange === 'custom' ? '#FFFFFF' : '#64748B' }}>自选</Text>
          </View>
        </View>

        {/* 自选日期输入框（展开时显示） */}
        {showDatePicker && (
          <View style={{
            marginTop: 8, display: 'flex', flexDirection: 'row', gap: 8,
            backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
            border: '1px solid #E8EDF2',
          }}
          >
            <View style={{ flex: 1 }}>
              <Text className="block text-[11px]" style={{ color: '#94A3B8', marginBottom: 4 }}>起始日期</Text>
              {/* eslint-disable-next-line no-restricted-syntax */}
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart((e.target as HTMLInputElement).value)}
                style={{ fontSize: 13, color: '#1E293B', width: '100%', border: 'none', outline: 'none', background: 'transparent' }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text className="block text-[11px]" style={{ color: '#94A3B8', marginBottom: 4 }}>结束日期</Text>
              {/* eslint-disable-next-line no-restricted-syntax */}
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd((e.target as HTMLInputElement).value)}
                onBlur={() => {
                  if (customStart && customEnd) setTimeRange('custom');
                }}
                style={{ fontSize: 13, color: '#1E293B', width: '100%', border: 'none', outline: 'none', background: 'transparent' }}
              />
            </View>
          </View>
        )}
      </View>

      {/* ========== 主内容区（固定窗口） ========== */}
      <View style={{
        position: 'fixed', top: fixedTopH, left: 12, right: 12,
        bottom: bottomBtnH, zIndex: 80,
        borderRadius: 18, overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8EDF2',
        boxShadow: '0 4px 20px rgba(91,155,213,0.05)',
      }}
      >
        {viewMode === 'chart' && (
          <ScrollView scrollY enhanced showScrollbar={false} style={{ height: '100%' }}>
            <View style={{ padding: 16, paddingBottom: 24 }}>
              {/* 环形饼图 */}
              <Text className="block text-sm font-semibold mb-4" style={{ color: '#374151' }}>分类占比</Text>

              {categories.length > 0 ? (
                <View style={{ marginBottom: 20, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  {/* 环形图 */}
                  <View style={{
                    width: 130, height: 130, borderRadius: 65,
                    background: donutGradient,
                    position: 'relative', flexShrink: 0,
                  }}
                  >
                    {/* 中心空洞 */}
                    <View style={{
                      position: 'absolute', top: 23, left: 23,
                      width: 84, height: 84, borderRadius: 42,
                      backgroundColor: '#FFFFFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    >
                      <Text className="block text-center">
                        <Text className="block text-base font-bold" style={{ color: '#1E293B' }}>¥{totalCategory.toFixed(0)}</Text>
                        <Text className="block text-[10px]" style={{ color: '#94A3B8' }}>已统计</Text>
                      </Text>
                    </View>
                  </View>

                  {/* 图例 - 可滚动 */}
                  <View style={{ flex: 1, height: 130, overflowY: 'hidden' }}>
                    <ScrollView scrollY enhanced showScrollbar={false} style={{ height: '100%' }}>
                      <View style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {categories.map(([cat, amount]) => (
                          <View key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: categoryColors[cat] || '#B8B8C8', flexShrink: 0 }} />
                            <Text numberOfLines={1} className="block text-xs flex-1" style={{ color: '#4B5563' }}>{cat}</Text>
                            <Text className="block text-xs font-semibold" style={{ color: '#1E293B' }}>¥{amount.toFixed(0)}</Text>
                            <Text className="block text-[10px]" style={{ color: '#9CA3AF', width: 30, textAlign: 'right' }}>{((amount / totalCategory) * 100).toFixed(0)}%</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              ) : null}

              {/* 水平条形图 */}
              {categories.length > 0 ? (
                <View>
                  <Text className="block text-sm font-semibold mb-4 mt-2" style={{ color: '#374151' }}>分类排行</Text>
                  {categories.map(([cat, amount]) => {
                    const pct = Math.max(4, (amount / maxCatAmount) * 100);
                    return (
                      <View key={cat} style={{ marginBottom: 12 }}>
                        <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text className="block text-xs font-medium" style={{ color: '#4B5563' }}>{cat}</Text>
                          <Text className="block text-xs font-semibold" style={{ color: '#1E293B' }}>¥{amount.toFixed(0)}</Text>
                        </View>
                        <View style={{ height: 13, borderRadius: 7, backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
                          <View style={{
                            width: `${pct}%`, height: '100%', borderRadius: 7,
                            background: `linear-gradient(90deg, ${categoryColors[cat] || '#B8B8C8'}CC, ${categoryColors[cat] || '#B8B8C8'}66)`,
                          }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {categories.length === 0 && (
                <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 150 }}>
                  <Text className="block text-sm" style={{ color: '#94A3B8' }}>暂无数据</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {viewMode === 'list' && (
          <ScrollView scrollY enhanced showScrollbar={false} style={{ height: '100%' }}>
            <View style={{ padding: 12, paddingBottom: 24 }}>
              <Text className="block text-sm font-semibold mb-3 px-2" style={{ color: '#374151' }}>账单明细</Text>

              {Object.entries(dateData).sort(([a], [b]) => (a > b ? -1 : 1)).length > 0 ? (
                Object.entries(dateData)
                  .sort(([a], [b]) => (a > b ? -1 : 1))
                  .map(([date, dayBills]) => (
                    <View key={date}>
                      <Text className="block text-[11px] mb-2 font-medium px-2" style={{ color: '#8896A6' }}>{date}</Text>
                      {(dayBills as any[]).map(b => (
                        <View key={b.id}
                          className="flex items-center justify-between rounded-xl p-3 mb-2 mx-2"
                          style={{ backgroundColor: '#FAFBFD', border: '1px solid #F0F4F8' }}
                        >
                          <View style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: categoryColors[b.category] || '#B8B8C8', flexShrink: 0 }} />
                            <Text className="block text-sm" style={{ color: '#334155' }}>{b.name}</Text>
                          </View>
                          <Text className="block text-sm font-semibold" style={{ color: '#1E293B' }}>¥{Number(b.amount).toFixed(0)}</Text>
                        </View>
                      ))}
                    </View>
                  ))
              ) : (
                <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
                  <Text className="block text-sm" style={{ color: '#94A3B8' }}>暂无明细数据</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* ========== 底部固定全宽按钮栏 ========== */}
      <View style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 200,
        padding: '10px 12px',
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
      }}
      >
        <View style={{ display: 'flex', flexDirection: 'row', borderRadius: 14, overflow: 'hidden' }}>
          <View onClick={() => setViewMode('chart')}
            style={{
              flex: 1, paddingTop: 13, paddingBottom: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              backgroundColor: viewMode === 'chart' ? '#1E293B' : '#F1F5F9',
            }}
          >
            <ChartPie size={17} color={viewMode === 'chart' ? '#FFFFFF' : '#8896A6'} />
            <Text className="block text-sm font-semibold" style={{ color: viewMode === 'chart' ? '#FFFFFF' : '#64748B' }}>📊 图表</Text>
          </View>
          <View onClick={() => setViewMode('list')}
            style={{
              flex: 1, paddingTop: 13, paddingBottom: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              backgroundColor: viewMode === 'list' ? '#1E293B' : '#F1F5F9',
            }}
          >
            <List size={17} color={viewMode === 'list' ? '#FFFFFF' : '#8896A6'} />
            <Text className="block text-sm font-semibold" style={{ color: viewMode === 'list' ? '#FFFFFF' : '#64748B' }}>📋 明细</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
