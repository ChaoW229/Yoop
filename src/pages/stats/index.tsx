import { useState, useEffect, useMemo } from 'react'
import Taro from '@tarojs/taro'
/* eslint-disable-next-line no-restricted-syntax */
import { View, Text, ScrollView } from '@tarojs/components'
import { Network } from '@/network'

const CARD_COLORS = [
  { bg: '#F5F0E8', name: '#6B5E4A', amount: '#C4A35A', accent: '#D4B896' },
  { bg: '#EEF5F3', name: '#3D5A47', amount: '#7BA888', accent: '#A8C9B2' },
  { bg: '#F0F2F8', name: '#4A5568', amount: '#718096', accent: '#A0AEC0' },
  { bg: '#FAF5F0', name: '#8B6914', amount: '#D4A017', accent: '#E6C87A' },
  { bg: '#F5EFF5', name: '#6B4575', amount: '#B07CC0', accent: '#D4B0DC' },
  { bg: '#EDF5F8', name: '#1E6091', amount: '#4299E1', accent: '#90CDF4' },
  { bg: '#FEF5F5', name: '#9B2C2C', amount: '#E53E3E', accent: '#FCBABA' },
  { bg: '#FFF8EC', name: '#C05621', amount: '#DD6B20', accent: '#FBD38D' },
]

/* 主题色 - 用于按钮选中态等强调 */
const PRIMARY = { gradient: 'linear-gradient(135deg, #5B8DEE, #7BA8EA)', solid: '#5B8DEE', light: '#EEF2FF' }

interface Bill {
  id: string; name: string; amount: number;
  category: string; payer: string; bill_date: string;
  is_treat: boolean; project_id?: string; destination?: string;
}

/* 自定义日期选择器：月份/日期 滚轮数据 */
const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12']
function getDaysInMonth(y: number, m: number): string[] {
  const d = new Date(y, m, 0).getDate()
  return Array.from({ length: d }, (_, i) => String(i + 1).padStart(2, '0'))
}
function getYears(): string[] {
  const y = new Date().getFullYear()
  return Array.from({ length: 10 }, (_, i) => String(y - 3 + i))
}

function StatsPage() {
  const [activeTab, setActiveTab] = useState<'chart'|'detail'>('chart')
  const [bills, setBills] = useState<Bill[]>([])
  const [dateRange, setDateRange] = useState<string>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  /* 日期选择器状态 */
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<'start'|'end'>('start')
  const [pickerYear, setPickerYear] = useState('')
  const [pickerMonth, setPickerMonth] = useState('')
  const [pickerDay, setPickerDay] = useState('')

  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === Taro.ENV_TYPE.TT
  let capsuleBottom = 56
  if (isWeapp) try {
    const menuRect = Taro.getMenuButtonBoundingClientRect()
    capsuleBottom = menuRect.bottom + 6 || 56
  } catch (_) {}

  useEffect(() => { fetchData() }, [])

  const filteredBills = useMemo(() => {
    if (!bills.length) return []
    if (dateRange === 'all') return bills
    const now = new Date(); let start: Date, end: Date
    if (dateRange === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    } else if (dateRange === 'week') {
      end = new Date(); start = new Date(end); start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
    } else if (dateRange === 'custom' && customStart && customEnd) {
      start = new Date(customStart + 'T00:00:00'); end = new Date(customEnd + 'T23:59:59')
    } else { return bills }
    return bills.filter(b => {
      const d = new Date(b.bill_date); return d >= start && d <= end
    })
  }, [bills, dateRange, customStart, customEnd])

  const totalAmount = useMemo(() =>
    filteredBills.reduce((s, b) => s + (Number(b.amount) || 0), 0), [filteredBills])

  const categoryStats = useMemo(() => {
    const m = new Map<string, number>()
    filteredBills.filter(b => !b.is_treat).forEach(b => {
      m.set(b.category, (m.get(b.category) || 0) + Number(b.amount))
    })
    return Array.from(m.entries()).map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredBills])

  const destinationStats = useMemo(() => {
    const m = new Map<string, number>()
    filteredBills.forEach(b => {
      if (b.destination) m.set(b.destination, (m.get(b.destination) || 0) + Number(b.amount))
    })
    return Array.from(m.entries())
      .map(([city, amount]) => ({ city, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredBills])

  /* 环形饼图数据 */
  const pieData = useMemo(() => {
    if (!categoryStats.length) return []
    const total = categoryStats.reduce((s, c) => s + c.amount, 0)
    return categoryStats.map((c, i) => ({
      ...c,
      percent: total > 0 ? Math.round((c.amount / total) * 100) : 0,
      color: CARD_COLORS[i % CARD_COLORS.length].amount,
      angle: total > 0 ? (c.amount / total) * 360 : 0,
    }))
  }, [categoryStats])

  const conicGradient = useMemo(() => {
    if (!pieData.length) return '#F0F0F0'
    let currentAngle = 0
    const stops = pieData.map(d => {
      const stop = `${d.color} ${currentAngle}% ${currentAngle + d.angle}%`
      currentAngle += d.angle
      return stop
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [pieData])

  const maxCatAmount = categoryStats.length > 0 ? Math.max(...categoryStats.map(c => c.amount)) : 1

  const fetchData = async () => {
    try {
      const res = await Network.request({ url: '/api/bills?limit=200&offset=0' })
      console.log('[Stats] bills:', JSON.stringify(res.data))
      setBills(res.data?.data?.items || res.data?.data || [])
    } catch (e) { console.error(e) }
  }

  /* ====== 纯自定义日期选择：打开时初始化滚轮值 ====== */
  const openDatePicker = (target: 'start'|'end') => {
    const currentVal = target === 'start' ? customStart : customEnd
    let y = '', m = '', d = ''
    if (currentVal && currentVal.includes('-')) {
      const parts = currentVal.split('-')
      if (parts.length === 3) { y = parts[0]; m = parts[1]; d = parts[2] }
    }
    if (!y || !m || !d) {
      const today = new Date()
      y = String(today.getFullYear()); m = String(today.getMonth() + 1).padStart(2, '0'); d = String(today.getDate()).padStart(2, '0')
    }
    setPickerTarget(target)
    setPickerYear(y); setPickerMonth(m); setPickerDay(d)
    setShowDatePicker(true)
  }

  /* 确认日期选择 */
  const confirmDatePick = () => {
    const val = `${pickerYear}-${pickerMonth}-${pickerDay}`
    if (pickerTarget === 'start') setCustomStart(val)
    else setCustomEnd(val)
    setDateRange('custom')
    setShowDatePicker(false)
  }

  /* 固定头部高度估算 */
  const fixedHeaderH = capsuleBottom + 50

  return (
    <View className="flex flex-col h-full" style={{ backgroundColor: '#F7F9FC' }}>
      {/* ========== 固定顶部：总支出 + 筛选按钮 ========== */}
      <View style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: '#FFFFFF', paddingBottom: 10 }}>
        <View style={{ paddingTop: capsuleBottom - 12, paddingLeft: 16, paddingRight: 16, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: '#999' }}>总支出</Text>
            <Text style={{ fontSize: 24, fontWeight: 700, color: '#333', fontFamily: '"Georgia","Times New Roman",serif' }}>¥{totalAmount.toFixed(2)}</Text>
          </View>

          {/* 筛选按钮 */}
          <View style={{ position: 'relative' }} onClick={() => setShowDatePicker(true)}>
            <View style={{
              paddingTop: 6, paddingBottom: 6, paddingLeft: 14, paddingRight: 14,
              borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0',
              backgroundColor: '#FAFBFC',
              display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4,
            }}
            >
              <Text style={{ fontSize: 13, color: '#666' }}>{{
                all: '全部', month: '本月', week: '近7天', custom: customStart ? `${customStart}~${customEnd}` : '自选',
              }[dateRange]}</Text>
              <Text style={{ fontSize: 10, color: '#999' }}>▼</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ========== 图表模式 ========== */}
      {activeTab === 'chart' && (
        <ScrollView scrollY enhanced showScrollbar={false} style={{ flex: 1, marginTop: fixedHeaderH, marginBottom: 60 }}>
          <View style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* 分类统计窗口：左环形图 + 右侧条形图（横排布局） */}
            {(pieData.length > 0) ? (
              <View style={{
                borderRadius: 16, overflow: 'hidden',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E8EDF2',
                padding: 16,
              }}
              >
                <Text style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 14, display: 'block' }}>📊 分类占比</Text>

                {/* 左环 + 右条 横向排列 */}
                <View style={{ display: 'flex', flexDirection: 'row', gap: 16 }}>
                  {/* ---- 左侧：环形图 + 图例 ---- */}
                  <View style={{ width: 130, flexShrink: 0, alignItems: 'center' }}>
                    {/* 环形图本体 */}
                    <View style={{
                      width: 96, height: 96, borderRadius: 48,
                      background: conicGradient,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    >
                      <View style={{
                        width: 60, height: 60, borderRadius: 30,
                        backgroundColor: '#FFFFFF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column',
                      }}
                      >
                        <Text style={{ fontSize: 10, color: '#999' }}>总计</Text>
                        <Text style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>{totalAmount.toFixed(0)}</Text>
                      </View>
                    </View>
                    {/* 环下占比列表（最多5项） */}
                    <ScrollView scrollX enhanced showScrollbar={false} style={{ marginTop: 10, width: '100%' }}>
                      <View style={{ display: 'flex', flexDirection: 'row', gap: 8, flexWrap: 'nowrap' }}>
                        {pieData.slice(0, 5).map((item, i) => (
                          <View key={`pie-${i}`} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FAFBFC', borderRadius: 8, paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 }}>
                            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.color, flexShrink: 0 }} />
                            <Text style={{ fontSize: 10, color: '#555' }}>{item.name}</Text>
                            <Text style={{ fontSize: 10, fontWeight: 600, color: '#333' }}>{item.percent}%</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* ---- 右侧：横向条形图（分类排行） ---- */}
                  <View style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
                    <Text style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 2 }}>分类排行</Text>
                    {categoryStats.slice(0, 6).map((cat, i) => (
                      <View key={`bar-${i}`} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 11.5, color: '#666', width: 40, textAlign: 'right', flexShrink: 0 }}>{cat.name}</Text>
                        <View style={{ flex: 1, height: 18, backgroundColor: '#F0F2F5', borderRadius: 9, overflow: 'hidden', minWidth: 0 }}>
                          <View style={{
                            width: `${Math.max(cat.amount / maxCatAmount * 100, 6)}%`,
                            height: 18,
                            background: `linear-gradient(90deg, ${CARD_COLORS[i % CARD_COLORS.length].amount}, ${CARD_COLORS[i % CARD_COLORS.length].amount}55)`,
                            borderRadius: 9,
                            minWidth: cat.amount > 0 ? 24 : 0,
                          }}
                          />
                        </View>
                        <Text style={{ fontSize: 10.5, color: '#999', width: 46, textAlign: 'right', flexShrink: 0 }}>¥{cat.amount}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ) : (
              <View style={{
                borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF',
                border: '1px solid #E8EDF2', padding: 32, alignItems: 'center',
              }}
              >
                <Text style={{ fontSize: 28 }}>📊</Text>
                <Text style={{ fontSize: 14, color: '#999', marginTop: 8, display: 'block' }}>暂无统计数据</Text>
                <Text style={{ fontSize: 12, color: '#BBB', marginTop: 4, display: 'block' }}>添加账单后将自动生成图表</Text>
              </View>
            )}

            {/* 目的地分布窗口（标签云风格） */}
            {destinationStats.length > 0 && (
              <View style={{
                borderRadius: 16, overflow: 'hidden',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E8EDF2',
                padding: 16,
              }}
              >
                <Text style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 12, display: 'block' }}>
                  📍 目的地分布 ({destinationStats.length}个城市)
                </Text>
                <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {destinationStats.map((dest, i) => (
                    <View key={`dest-${i}`} style={{
                      paddingTop: 8, paddingBottom: 8, paddingLeft: 14, paddingRight: 14,
                      borderRadius: 12,
                      backgroundColor: `${CARD_COLORS[i % CARD_COLORS.length].bg}`,
                      borderLeftWidth: 3,
                      borderLeftColor: CARD_COLORS[i % CARD_COLORS.length].amount,
                    }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: 500, color: CARD_COLORS[i % CARD_COLORS.length].name }}>{dest.city}</Text>
                      <Text style={{ fontSize: 11, color: '#888' }}> ¥{dest.amount}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ========== 明细模式 ========== */}
      {activeTab === 'detail' && (
        <ScrollView scrollY enhanced showScrollbar={false} style={{ flex: 1, marginTop: fixedHeaderH, marginBottom: 60 }}>
          {/* 明细窗口 — 布满屏幕左右边距 */}
          <View style={{ padding: 12 }}>
            <View style={{
              borderRadius: 16, overflow: 'hidden',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E8EDF2',
              minHeight: 300,
            }}
            >
              {(() => {
                const grouped: Record<string, Bill[]> = {}
                filteredBills.forEach(b => {
                  const date = (b.bill_date || '').split('T')[0]
                  if (!grouped[date]) grouped[date] = []
                  grouped[date].push(b)
                })
                const sortedDates = Object.keys(grouped).sort().reverse()
                if (!sortedDates.length) return (
                  <View style={{ paddingTop: 30, paddingBottom: 40, alignItems: 'center' }}>
                    <Text style={{ fontSize: 28 }}>📋</Text>
                    <Text style={{ fontSize: 14, color: '#999', marginTop: 8, display: 'block' }}>暂无明细</Text>
                  </View>
                )
                return sortedDates.map(date => {
                  const items = grouped[date]
                  const dayTotal = items.reduce((s, i) => s + Number(i.amount), 0)
                  return (
                    <View key={date}>
                      {/* 日期行头 */}
                      <View style={{
                        paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 16,
                        backgroundColor: '#FAFBFC',
                        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
                        display: 'flex', flexDirection: 'row', justifyContent: 'space-between',
                      }}
                      >
                        <Text style={{ fontSize: 12, color: '#999' }}>{date.replace(/-/g, '/')}</Text>
                        <Text style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>¥{dayTotal.toFixed(2)}</Text>
                      </View>
                      {/* 账单项 */}
                      {items.map((bill, bi) => {
                        const ci = (bill.category || '其他').charCodeAt(0) % CARD_COLORS.length
                        const cc = CARD_COLORS[ci]
                        return (
                          <View key={`${bill.id}-${bi}`} style={{
                            paddingTop: 10, paddingBottom: 10, paddingLeft: 16, paddingRight: 16,
                            borderBottomWidth: 1, borderBottomColor: '#F8F8F8',
                            display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10,
                          }}
                          >
                            <View style={{
                              width: 32, height: 32, borderRadius: 8,
                              backgroundColor: cc.bg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}
                            >
                              <Text style={{ fontSize: 14 }}>{getCategoryIcon(bill.category)}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ fontSize: 14, color: '#333', display: 'block' }}>{bill.name}</Text>
                              <Text style={{ fontSize: 11, color: '#999', display: 'block' }}>{bill.payer}{bill.is_treat ? ' · 请客' : ''}</Text>
                            </View>
                            <Text style={{ fontSize: 15, fontWeight: 700, color: cc.amount, flexShrink: 0 }}>¥{Number(bill.amount).toFixed(2)}</Text>
                          </View>
                        )
                      })}
                    </View>
                  )
                })
              })()}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ========== 纯自定义日期选择弹窗（无 Picker 双弹窗问题） ========== */}
      {showDatePicker && (
        <View style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 200, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column-reverse',
        }}
          onClick={() => setShowDatePicker(false)}
        >
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingTop: 20, paddingBottom: 36,
            paddingLeft: 20, paddingRight: 20,
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 16, fontWeight: 600, color: '#333', textAlign: 'center', marginBottom: 16, display: 'block' }}>筛选时间范围</Text>

            {/* 快捷选项行 */}
            <View style={{ display: 'flex', flexDirection: 'row', gap: 8, marginBottom: 18, justifyContent: 'center' }}>
              {[
                { key: 'all', label: '全部' },
                { key: 'month', label: '本月' },
                { key: 'week', label: '近7天' },
                { key: 'custom', label: '自选' },
              ].map(opt => (
                <View key={opt.key}
                  onClick={() => {
                    setDateRange(opt.key);
                    if (opt.key !== 'custom') setShowDatePicker(false);
                    else openDatePicker(opt.key === 'custom' ? 'start' : 'start');
                  }}
                  style={{
                    paddingTop: 8, paddingBottom: 8, paddingLeft: 18, paddingRight: 18, borderRadius: 20,
                    backgroundColor: dateRange === opt.key ? PRIMARY.solid : '#F0F0F0',
                  }}
                >
                  <Text style={{ fontSize: 13, color: dateRange === opt.key ? '#FFF' : '#666' }}>{opt.label}</Text>
                </View>
              ))}
            </View>

            {/* 自选日期区域：起始 + 结束 在同一行 */}
            {dateRange === 'custom' && (
              <>
                {/* 起始/结束 显示框 */}
                <View style={{ display: 'flex', flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                  <View style={{ flex: 1 }}
                    onClick={() => openDatePicker('start')}
                  >
                    <Text style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>起始日期</Text>
                    <View style={{
                      paddingTop: 10, paddingBottom: 10, paddingLeft: 12, paddingRight: 12,
                      borderRadius: 10, borderWidth: 1, borderColor: pickerTarget === 'start' ? PRIMARY.solid : '#E2E8F0',
                      backgroundColor: pickerTarget === 'start' ? PRIMARY.light : '#FAFBFC',
                    }}
                    >
                      <Text style={{ fontSize: 14, color: customStart ? '#333' : '#CCC' }}>
                        {customStart ? customStart.replace(/-/g, '/') : '点击选择'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}
                    onClick={() => openDatePicker('end')}
                  >
                    <Text style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>结束日期</Text>
                    <View style={{
                      paddingTop: 10, paddingBottom: 10, paddingLeft: 12, paddingRight: 12,
                      borderRadius: 10, borderWidth: 1, borderColor: pickerTarget === 'end' ? PRIMARY.solid : '#E2E8F0',
                      backgroundColor: pickerTarget === 'end' ? PRIMARY.light : '#FAFBFC',
                    }}
                    >
                      <Text style={{ fontSize: 14, color: customEnd ? '#333' : '#CCC' }}>
                        {customEnd ? customEnd.replace(/-/g, '/') : '点击选择'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 滚轮式年月日选择器（三列模拟滚动选择） */}
                {pickerTarget && (
                  <View style={{
                    backgroundColor: '#FAFBFF', borderRadius: 14,
                    paddingTop: 14, paddingBottom: 14,
                    borderWidth: 1, borderColor: '#E8EDF2',
                  }}
                  >
                    <Text style={{ fontSize: 12, color: PRIMARY.solid, textAlign: 'center', marginBottom: 10, display: 'block' }}>
                      选择{pickerTarget === 'start' ? '起始' : '结束'}日期
                    </Text>

                    {/* 三列滚轮：年 | 月 | 日 */}
                    <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                      {/* 年列 */}
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: '#AAA', marginBottom: 4, display: 'block' }}>年</Text>
                        <ScrollView scrollY enhanced showScrollbar={false} style={{ height: 120, width: 70 }}>
                          {getYears().map(yr => (
                            <View key={yr} onClick={() => setPickerYear(yr)} style={{
                              paddingTop: 8, paddingBottom: 8, alignItems: 'center',
                              backgroundColor: yr === pickerYear ? PRIMARY.light : 'transparent', borderRadius: 8,
                            }}
                            >
                              <Text style={{ fontSize: yr === pickerYear ? 17 : 14, fontWeight: yr === pickerYear ? '700' : '400', color: yr === pickerYear ? PRIMARY.solid : '#666' }}>{yr}</Text>
                            </View>
                          ))}
                        </ScrollView>
                      </View>

                      {/* 月列 */}
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: '#AAA', marginBottom: 4, display: 'block' }}>月</Text>
                        <ScrollView scrollY enhanced showScrollbar={false} style={{ height: 120, width: 56 }}>
                          {MONTHS.map(mo => (
                            <View key={mo} onClick={() => setPickerMonth(mo)} style={{
                              paddingTop: 8, paddingBottom: 8, alignItems: 'center',
                              backgroundColor: mo === pickerMonth ? PRIMARY.light : 'transparent', borderRadius: 8,
                            }}
                            >
                              <Text style={{ fontSize: mo === pickerMonth ? 17 : 14, fontWeight: mo === pickerMonth ? '700' : '400', color: mo === pickerMonth ? PRIMARY.solid : '#666' }}>{mo}</Text>
                            </View>
                          ))}
                        </ScrollView>
                      </View>

                      {/* 日列 */}
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: '#AAA', marginBottom: 4, display: 'block' }}>日</Text>
                        <ScrollView scrollY enhanced showScrollbar={false} style={{ height: 120, width: 56 }}>
                          {getDaysInMonth(Number(pickerYear), Number(pickerMonth)).map(da => (
                            <View key={da} onClick={() => setPickerDay(da)} style={{
                              paddingTop: 8, paddingBottom: 8, alignItems: 'center',
                              backgroundColor: da === pickerDay ? PRIMARY.light : 'transparent', borderRadius: 8,
                            }}
                            >
                              <Text style={{ fontSize: da === pickerDay ? 17 : 14, fontWeight: da === pickerDay ? '700' : '400', color: da === pickerDay ? PRIMARY.solid : '#666' }}>{da}</Text>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* 取消/确定按钮（仅自选模式下且选择了目标时显示） */}
            <View style={{ display: 'flex', flexDirection: 'row', gap: 12, marginTop: dateRange === 'custom' ? 16 : 0 }}>
              <View style={{ flex: 1 }} onClick={() => setShowDatePicker(false)}>
                <View style={{
                  paddingTop: 12, paddingBottom: 12, borderRadius: 12,
                  backgroundColor: '#F0F0F0', alignItems: 'center', display: 'flex',
                }}
                >
                  <Text style={{ fontSize: 14, color: '#666' }}>取消</Text>
                </View>
              </View>
              <View style={{ flex: 1 }} onClick={() => { if (dateRange !== 'custom') setShowDatePicker(false); else confirmDatePick() }}>
                <View style={{
                  paddingTop: 12, paddingBottom: 12, borderRadius: 12,
                  backgroundColor: PRIMARY.solid, alignItems: 'center', display: 'flex',
                }}
                >
                  <Text style={{ fontSize: 14, color: '#FFF' }}>确定</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ========== 底部固定按钮栏（全宽、选中态色块强化） ========== */}
      <View style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 100, backgroundColor: '#FFFFFF',
        borderTopWidth: 1, borderTopColor: '#F0F0F0',
        display: 'flex', flexDirection: 'row', gap: 0,
        paddingLeft: 12, paddingRight: 12, paddingBottom: 8, paddingTop: 8,
      }}
      >
        {/* 图表按钮 */}
        <View style={{ flex: 1, marginLeft: 4, marginRight: 4 }}
          onClick={() => setActiveTab('chart')}
        >
          <View style={{
            paddingTop: 14, paddingBottom: 14, borderRadius: 14,
            backgroundColor: activeTab === 'chart' ? PRIMARY.gradient : '#FFFFFF',
            borderWidth: activeTab === 'chart' ? 0 : 1, borderColor: '#E8EDF2',
            alignItems: 'center',
            display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 6,
            boxShadow: activeTab === 'chart' ? '0 4px 14px rgba(91,141,238,0.25)' : 'none',
          }}
          >
            <Text style={{ fontSize: 17 }}>📊</Text>
            <Text style={{ fontSize: 15, fontWeight: 600, color: activeTab === 'chart' ? '#FFFFFF' : '#999' }}>图表</Text>
          </View>
        </View>
        {/* 明细按钮 */}
        <View style={{ flex: 1, marginLeft: 4, marginRight: 4 }}
          onClick={() => setActiveTab('detail')}
        >
          <View style={{
            paddingTop: 14, paddingBottom: 14, borderRadius: 14,
            backgroundColor: activeTab === 'detail' ? PRIMARY.gradient : '#FFFFFF',
            borderWidth: activeTab === 'detail' ? 0 : 1, borderColor: '#E8EDF2',
            alignItems: 'center',
            display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 6,
            boxShadow: activeTab === 'detail' ? '0 4px 14px rgba(91,141,238,0.25)' : 'none',
          }}
          >
            <Text style={{ fontSize: 17 }}>📋</Text>
            <Text style={{ fontSize: 15, fontWeight: 600, color: activeTab === 'detail' ? '#FFFFFF' : '#999' }}>明细</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default StatsPage

function getCategoryIcon(cat?: string): string {
  const map: Record<string, string> = { '交通': '🚗', '餐饮': '🍜', '住宿': '🏨', '门票': '🎫', '购物': '🛍', '娱乐': '🎮', '其他': '📦' };
  if (!cat) return '📦'; for (const k of Object.keys(map)) { if (cat.includes(k)) return map[k]; } return '📦';
}
