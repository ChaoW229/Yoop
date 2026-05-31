import { useState, useEffect, useMemo } from 'react';
import Taro from '@tarojs/taro';
/* eslint-disable-next-line no-restricted-syntax */
import { View, Text, ScrollView, Image } from '@tarojs/components';
import { Network } from '@/network';
import { List, Calendar, ChevronDown } from 'lucide-react-taro';

const CATEGORY_COLORS = [
  '#5B9BD5', '#ED7D31', '#70AD47', '#FFC000',
  '#9E480E', '#636363', '#A5A5A5', '#264478',
  '#C55A11', '#2F5496', '#4472C4', '#D06B64',
  '#7FB3D3', '#F4B183', '#A9D08E', '#FFE699',
];

function getCatColor(idx: number): string {
  return CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
}

interface Bill {
  id: string;
  project_id: string;
  name: string;
  amount: number;
  category: string;
  payer: string;
  bill_date: string;
}

interface DateRange { label: string; value: string; }

export default function StatsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [viewMode, setViewMode] = useState<'chart' | 'detail'>('chart');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const sysInfo = useMemo(() => Taro.getSystemInfoSync(), []);
  const statusBarH = sysInfo.statusBarHeight || 20;

  let capsuleBottom = 56;
  try {
    const rect = Taro.getMenuButtonBoundingClientRect();
    if (rect && typeof rect.top === 'number') {
      capsuleBottom = rect.bottom + 8;
    }
  } catch (_e) { /* noop */ }
  const headerH = capsuleBottom + 10;
  const bottomBtnH = 52;

  const now = new Date();
  const dateRanges = useMemo<DateRange[]>(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const weekBefore = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const wbY = weekBefore.getFullYear();
    const wbM = String(weekBefore.getMonth() + 1).padStart(2, '0');
    const wbD = String(weekBefore.getDate()).padStart(2, '0');

    return [
      { label: '全部', value: '' },
      { label: `本月 (${y}/${m})`, value: `${y}-${m}` },
      { label: `近7天 (${wbM}/${wbD}~${m}/${d})`, value: `${wbY}-${wbM}-${wbD}` },
      { label: '自选日期...', value: 'custom' },
    ];
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [dateRange, setDateRange] = useState<string>(dateRanges[0].value);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    try {
      const res = await Network.request({ url: '/api/bills' });
      if (!res.data?.data) return;
      const list = res.data.data as Bill[];
      if (Array.isArray(list)) {
        setBills(list);
      }
    } catch (_e) { /* ignore */ }
  }

  // ====== 核心计算：根据时间范围过滤后重新算 total 和分类统计 ======
  const statsData = useMemo(() => {
    let filtered = [...bills];

    // 应用时间筛选
    if (dateRange && dateRange !== 'custom') {
      if (dateRange.length === 7) {
        // 本月 YYYY-MM
        filtered = filtered.filter((b) => b.bill_date && b.bill_date.startsWith(dateRange));
      } else if (dateRange.length === 10) {
        // 近7天 YYYY-MM-DD 起
        filtered = filtered.filter((b) => b.bill_date && b.bill_date >= dateRange);
      }
    } else if (dateRange === 'custom' && customStart) {
      filtered = filtered.filter(
        (b) =>
          b.bill_date &&
          (!customEnd ? b.bill_date >= customStart : b.bill_date >= customStart && b.bill_date <= customEnd)
      );
    }

    // 计算筛选后的总金额
    let total = 0;
    const catMap: Record<string, number> = {};

    for (let i = 0; i < filtered.length; i++) {
      const b = filtered[i];
      const amt = Number(b.amount) || 0;
      total += amt;
      const cat = b.category || '其他';
      catMap[cat] = (catMap[cat] || 0) + amt;
    }

    const categories = Object.keys(catMap)
      .sort((a, b) => (catMap[b] || 0) - (catMap[a] || 0))
      .map((name, i) => ({
        name,
        amount: Math.round(catMap[name] * 100) / 100,
        color: getCatColor(i),
        percent: total > 0 ? ((catMap[name] / total) * 100).toFixed(1) : '0.0',
      }));

    return { total, categories, bills: filtered };
  }, [bills, dateRange, customStart, customEnd]);

  function formatAmount(n: number): string {
    if (n < 0) return '-' + formatAmount(-n);
    if (n >= 10000) { const w = n / 10000; return `${w.toFixed(w % 1 === 0 ? 0 : 1)}万`; }
    if (n >= 1000) return `${n.toFixed(n % 1 === 0 ? 0 : 1)}`;
    return `${Math.round(n)}`;
  }

  function handleDateSelect(rangeVal: string) {
    setDateRange(rangeVal);
    setShowDatePicker(false);
    if (rangeVal !== 'custom') return;
    Taro.showModal({
      title: '选择日期范围',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // Use a separate approach for custom date input
    setTimeout(() => {
      Taro.showModal({
        title: '开始日期',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editable: true,
        placeholderText: 'YYYY-MM-DD',
        success(startRes) {
          if (startRes.confirm && startRes.content) {
            setCustomStart((startRes.content as string).trim());
            setTimeout(() => {
              Taro.showModal({
                title: '结束日期',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                editable: true,
                placeholderText: 'YYYY-MM-DD',
                success(endRes) {
                  if (endRes.confirm && endRes.content) {
                    setCustomEnd((endRes.content as string).trim());
                  }
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any);
            }, 300);
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }, 100);
  }

  // ====== 环形饼图 SVG ====== (固定高度窗口内渲染)
  const pieSection = useMemo(() => {
    const { categories, total } = statsData;
    if (categories.length === 0 || total <= 0) return null;

    let cumulativePercent = 0;
    const slices = categories.slice(0, 8).map((cat) => {
      const startPct = cumulativePercent;
      cumulativePercent += Number(cat.percent) / 100;
      const endPct = Math.min(cumulativePercent, 1);
      const startAngle = startPct * 360 - 90;
      const sweepAngle = (endPct - startPct) * 360;
      const largeArc = sweepAngle > 180 ? 1 : 0;
      const cx = 75, cy = 75, r = 58, ir = 34; // 外径/内径
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endPct * 360 - 90) * Math.PI / 180;
      const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad),   y2 = cy + r * Math.sin(endRad);
      const x3 = cx + ir * Math.cos(endRad),     y3 = cy + ir * Math.sin(endRad);
      const x4 = cx + ir * Math.cos(startRad),    y4 = cy + ir * Math.sin(startRad);
      const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${ir} ${ir} 0 ${largeArc} 0 ${x4} ${y4} Z`;
      return `<path d="${d}" fill="${cat.color}"/>`;
    }).join('');

    const svgStr = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
  ${slices}
  <circle cx="75" cy="75" r="30" fill="#FFFFFF"/>
</svg>`;

    return (
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {/* 左侧：SVG 环形图 */}
        <View style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <Image src={`data:image/svg+xml,encodeURIComponent(${svgStr})`} mode="aspectFit" style={{ width: 110, height: 110 }} />
          {/* 中心金额文字 */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text className="block" style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>{formatAmount(statsData.total)}</Text>
          </View>
        </View>
        {/* 右侧：分类图例（横向可滚动） */}
        <ScrollView scrollX enhanced showScrollbar={false} style={{ flex: 1 }}>
          <View style={{ display: 'flex', flexDirection: 'row', gap: 12, paddingTop: 4, paddingBottom: 4 }}>
            {statsData.categories.slice(0, 6).map((c) => (
              <View key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 72, flexShrink: 0 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color }} />
                <View>
                  <Text className="block" style={{ fontSize: 11, color: '#64748B', lineHeight: 14 }}>{c.name}</Text>
                  <Text className="block" style={{ fontSize: 13, fontWeight: '600', color: '#334155', lineHeight: 16 }}>¥{formatAmount(c.amount)}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }, [statsData]);

  // ====== 条形图 ====== (固定高度窗口内渲染)
  const barSection = useMemo(() => {
    const { categories } = statsData;
    if (categories.length === 0) {
      return (<Text className="block" style={{ textAlign: 'center', color: '#94A3B8', paddingTop: 20, fontSize: 13 }}>暂无数据</Text>);
    }
    const maxAmt = categories.length > 0 ? Math.max(...categories.map(c => c.amount)) : 1;

    return categories.map((c) => {
      const pct = maxAmt > 0 ? (c.amount / maxAmt) : 0;
      const barW = Math.max(pct * 100, 3);
      return (
        <View key={c.name} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Text className="block" style={{ fontSize: 12.5, color: '#475569', width: 48, flexShrink: 0, textAlign: 'right' }}>{c.name}</Text>
          <View style={{ flex: 1, height: 22, borderRadius: 6, backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
            <View style={{
              height: '100%',
              width: `${barW}%`,
              borderRadius: 6,
              background: `linear-gradient(90deg, ${c.color}, ${c.color}66)`,
            }}
            />
          </View>
          <Text className="block" style={{ fontSize: 12, fontWeight: '600', color: '#334155', width: 60, flexShrink: 0, textAlign: 'right' }}>¥{formatAmount(c.amount)}</Text>
        </View>
      );
    });
  }, [statsData]);

  // ====== 明细列表 ======
  const detailList = useMemo(() => {
    const grouped: Record<string, Bill[]> = {};
    const sortedBills = [...statsData.bills].sort((a, b) => {
      const da = a.bill_date || '', db = b.bill_date || ''; return db.localeCompare(da);
    });
    sortedBills.forEach((bill) => {
      const d = (bill.bill_date || '未知').substring(0, 10);
      if (!grouped[d]) grouped[d] = []; grouped[d].push(bill);
    });
    return Object.entries(grouped).map(([date, items]) => ({ date, items }));
  }, [statsData.bills]);

  return (
    <View className="flex flex-col h-full" style={{ backgroundColor: '#F5F7FA' }}>
      {/* ========== Fixed Header ========== */}
      <View style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: '#FFFFFF' }}>
        <View style={{ paddingTop: statusBarH, paddingBottom: 6, paddingLeft: 16, paddingRight: 16 }}>
          <Text className="block" style={{ ...titleStyle, textAlign: 'center' }}>支出统计</Text>
        </View>
        {/* 总金额 + 时间筛选 */}
        <View style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 10, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text className="block" style={{ fontSize: 22, fontWeight: '700', color: '#1E293B', fontFamily: '-apple-system, "SF Pro Display", sans-serif' }}>¥{formatAmount(statsData.total)}</Text>
            <Text className="block" style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 1 }}>已统计支出</Text>
          </View>
          {/* 日期选择按钮 */}
          <View onClick={() => !showDatePicker && setShowDatePicker(true)}
            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingLeft: 10, paddingRight: 10, paddingTop: 6, paddingBottom: 6, borderRadius: 18, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'solid'
            }}
          >
            <Calendar size={13} color="#64748B" />
            <Text style={{ fontSize: 12, color: '#475569', fontWeight: '500' }}>
              {(dateRanges.find(r => r.value === dateRange)?.label || '全部').split(' ')[0]}
            </Text>
            <ChevronDown size={12} color="#94A3B8" />
          </View>
        </View>

        {/* 日期快捷选项 */}
        {showDatePicker && (
          <View style={{ borderTopWidth: 1, borderTopColor: '#F0F0F0', borderTopStyle: 'solid', paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 16, backgroundColor: '#FFFFFF' }}>
            <ScrollView scrollX enhanced showScrollbar={false}>
              <View style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                {dateRanges.map((range) => (
                  <Text
                    key={range.value}
                    onClick={() => handleDateSelect(range.value)}
                    style={{
                      fontSize: 12.5, fontWeight: '500', paddingTop: 6, paddingBottom: 6, paddingLeft: 14, paddingRight: 14,
                      borderRadius: 18, whiteSpace: 'nowrap',
                      backgroundColor: dateRange === range.value ? '#EEF2FF' : '#F8FAFC',
                      color: dateRange === range.value ? '#4F46E5' : '#64748B',
                      borderWidth: 1, borderColor: dateRange === range.value ? '#C7D2FE' : '#E2E8F0', borderStyle: 'solid',
                      flexShrink: 0,
                    }}
                  >
                    {range.label}
                  </Text>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* ========== 内容区域 ========== */}
      <ScrollView scrollY enhanced showScrollbar={false}
        style={{ flex: 1, marginTop: headerH + (showDatePicker ? 44 : 0) + 50, marginBottom: bottomBtnH }}
      >
        <View style={{ padding: '0 12px', gap: 10, paddingBottom: 12 }}>
          {viewMode === 'chart' ? (
            <>
              {/* ====== 窗口1：环形饼图 ====== */}
              <View style={{
                borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF',
                borderWidth: 1, borderColor: '#E8EDF2', borderStyle: 'solid', padding: 16,
                boxShadow: '0 2px 12px rgba(91,155,213,0.04)',
              }}
              >
                <Text className="block" style={{ fontSize: 13.5, fontWeight: '600', color: '#334155', marginBottom: 14, fontFamily: '-apple-system, "SF Pro Display", sans-serif' }}>分类占比</Text>
                {pieSection || <Text className="block" style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>暂无数据</Text>}
              </View>

              {/* ====== 窗口2：条形排行 ====== */}
              <View style={{
                borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF',
                borderWidth: 1, borderColor: '#E8EDF2', borderStyle: 'solid', padding: 16,
                boxShadow: '0 2px 12px rgba(91,155,213,0.04)',
              }}
              >
                <Text className="block" style={{ fontSize: 13.5, fontWeight: '600', color: '#334155', marginBottom: 12, fontFamily: '-apple-system, "SF Pro Display", sans-serif' }}>分类排行</Text>
                {barSection}
              </View>
            </>
          ) : (
            /* ====== 窗口：明细列表 ====== */
            <View style={{
              borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF',
              borderWidth: 1, borderColor: '#E8EDF2', borderStyle: 'solid',
              boxShadow: '0 2px 12px rgba(91,155,213,0.04)', minHeight: 200,
            }}
            >
              <ScrollView scrollY enhanced showScrollbar={false} style={{ height: 400 }}>
                <View style={{ padding: 16 }}>
                  {detailList.length === 0 ? (
                    <Text className="block" style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, paddingTop: 40 }}>暂无数据</Text>
                  ) : detailList.map(({ date, items }) => (
                    <View key={date} style={{ marginBottom: 14 }}>
                      <Text className="block" style={{ fontSize: 12, color: '#8896AB', fontWeight: '600', marginBottom: 8, paddingLeft: 2 }}>
                        {date.replace(/-/g, '/')}
                      </Text>
                      {items.map((item) => (
                        <View key={item.id} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 9, paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', borderBottomStyle: 'solid' }}>
                          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Text className="block" style={{ fontSize: 12 }}>{(item.category || '?')[0]}</Text>
                            </View>
                            <View>
                              <Text className="block" style={{ fontSize: 14, fontWeight: '500', color: '#1E293B' }}>{item.name}</Text>
                              <Text className="block" style={{ fontSize: 11, color: '#8896AB', marginTop: 1 }}>{item.payer || '未知'} · {item.category || '其他'}</Text>
                            </View>
                          </View>
                          <Text className="block" style={{ fontSize: 15, fontWeight: '600', color: '#DC2626', fontFamily: '-apple-system, "SF Pro Display", sans-serif' }}>¥{formatAmount(item.amount)}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ========== Fixed Bottom Buttons ========== */}
      <View style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 100, height: bottomBtnH,
        backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EDEDED', borderTopStyle: 'solid',
        display: 'flex', flexDirection: 'row',
      }}
      >
        <View onClick={() => setViewMode('chart')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: bottomBtnH }}
          className={viewMode === 'chart' ? '' : ''}
        >
          <List size={17} color={viewMode === 'chart' ? '#4F46E5' : '#94A3B8'} />
          <Text style={{ marginLeft: 5, fontSize: 14, fontWeight: viewMode === 'chart' ? '600' : '400', color: viewMode === 'chart' ? '#4F46E5' : '#64748B' }}>图表</Text>
        </View>
        <View onClick={() => setViewMode('detail')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: bottomBtnH }}>
          <List size={17} color={viewMode === 'detail' ? '#4F46E5' : '#94A3B8'} />
          <Text style={{ marginLeft: 5, fontSize: 14, fontWeight: viewMode === 'detail' ? '600' : '400', color: viewMode === 'detail' ? '#4F46E5' : '#64748B' }}>明细</Text>
        </View>
      </View>
    </View>
  );
}

const titleStyle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: '600',
  color: '#1E293B',
  fontFamily: '-apple-system, "SF Pro Display", sans-serif',
};


