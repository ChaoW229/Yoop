import { useState, useEffect, useMemo } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
/* eslint-disable-next-line no-restricted-syntax */
import { View, Text, ScrollView } from '@tarojs/components'
import { Network } from '@/network'
import {
  FileText,
  FileChartPie,
  Map as MapIcon,
  Utensils,
  House,
  Car,
  ShoppingBag,
  Coffee,
  Plane,
  Gamepad2,
  Ellipsis,
  ChevronRight,
} from 'lucide-react-taro'

/* ======== 主题色（参考截图：薄荷绿）======== */
const THEME = {
  primary: '#52C41A',
  primaryLight: '#73D13D',
  primaryDark: '#389E0D',
  primaryBg: 'linear-gradient(135deg, #52C41A, #73D13D)',
  headerBg: 'linear-gradient(160deg, #52C41A, #5CB85C)',
}

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  '餐饮': { icon: Utensils, color: '#F5A623', bg: '#FFF7E6' },
  '住宿': { icon: House, color: '#5B8DEE', bg: '#EEF2FF' },
  '交通': { icon: Car, color: '#52C41A', bg: '#F0FFF0' },
  '购物': { icon: ShoppingBag, color: '#EB2F96', bg: '#FFF0F6' },
  '娱乐': { icon: Gamepad2, color: '#9254DE', bg: '#F9F0FF' },
  '咖啡': { icon: Coffee, color: '#8B572A', bg: '#FBF5ED' },
  '门票': { icon: Plane, color: '#13C2C2', bg: '#E6FFFE' },
  '其他': { icon: Ellipsis, color: '#8C8C8C', bg: '#FAFAFA' },
}

function getCategoryConfig(name: string) {
  return CATEGORY_CONFIG[name] || CATEGORY_CONFIG['其他']
}

function getDayLabel(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff === 2) return '前天'
  const md = `${d.getMonth() + 1}月${d.getDate()}日`
  const weeks = ['日', '一', '二', '三', '四', '五', '六']
  return `${md} 星期${weeks[d.getDay()]}`
}

interface Bill {
  id: string; name: string; amount: number;
  category: string; payer: string; bill_date: string;
  is_treat: boolean; project_id?: string; destination?: string;
  note?: string;
}

/* ======== 主组件 ======== */
function StatsPage() {
  /* 三段式Tab */
  type TabType = 'detail' | 'chart' | 'map'
  const [activeTab, setActiveTab] = useState<TabType>('detail')

  const [bills, setBills] = useState<Bill[]>([])
  const [dateRange, setDateRange] = useState<string>('month')

  /* 系统信息 */
  const statusBarH = Taro.getSystemInfoSync().statusBarHeight || 20
  let capsuleBottom = statusBarH + 44
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === Taro.ENV_TYPE.TT
  if (isWeapp) {
    try {
      const mb = Taro.getMenuButtonBoundingClientRect()
      if (mb && mb.bottom > 0) capsuleBottom = mb.bottom + 6
    } catch (_) {}
  }

  useEffect(() => { fetchData() }, [])
  useDidShow(() => { fetchData() })

  const filteredBills = useMemo(() => {
    if (!bills.length) return []
    const now = new Date()
    let start: Date, end: Date
    if (dateRange === 'all') return bills
    else if (dateRange === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    } else if (dateRange === 'week') {
      end = new Date()
      start = new Date(end)
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    } else {
      return bills
    }
    return bills.filter(b => {
      const d = new Date(b.bill_date)
      return d >= start && d <= end
    })
  }, [bills, dateRange])

  /* 支出/入账 */
  const totalExpense = useMemo(() =>
    filteredBills.filter(b => Number(b.amount) < 0 || !b.is_treat).reduce((s, b) => s + Math.abs(Number(b.amount)), 0),
    [filteredBills])
  const totalIncome = useMemo(() =>
    filteredBills.filter(b => Number(b.amount) >= 0 && b.is_treat).reduce((s, b) => s + Number(b.amount), 0),
    [filteredBills])

  /* 分类统计 */
  const categoryStats = useMemo(() => {
    const m = new Map<string, number>()
    filteredBills.filter(b => !b.is_treat).forEach(b => {
      m.set(b.category, (m.get(b.category) || 0) + Math.abs(Number(b.amount)))
    })
    return Array.from(m.entries()).map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredBills])

  /* 饼图数据 */
  const pieData = useMemo(() => {
    if (!categoryStats.length) return []
    const total = categoryStats.reduce((s, c) => s + c.amount, 0)
    return categoryStats.map((c, _i) => ({
      ...c,
      percent: total > 0 ? ((c.amount / total) * 100).toFixed(2) : '0',
      angle: total > 0 ? (c.amount / total) * 360 : 0,
      color: getCategoryConfig(c.name).color,
    }))
  }, [categoryStats])

  const conicGradient = useMemo(() => {
    if (!pieData.length) return '#E8E8E8'
    let curAngle = 0
    const stops = pieData.map(d => {
      const stop = `${d.color} ${curAngle}% ${curAngle + d.angle}%`
      curAngle += d.angle
      return stop
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [pieData])

  const maxCatAmount = categoryStats.length > 0 ? Math.max(...categoryStats.map(c => c.amount)) : 1

  /* 目的地统计（用于地图） */
  const destinationList = useMemo(() => {
    const m = new Map<string, { amount: number; count: number }>()
    filteredBills.forEach(b => {
      const dest = b.destination || ''
      if (!dest) return
      const prev = m.get(dest) || { amount: 0, count: 0 }
      m.set(dest, { amount: prev.amount + Math.abs(Number(b.amount)), count: prev.count + 1 })
    })
    return Array.from(m.entries())
      .map(([city, v]) => ({ city, ...v }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredBills])

  /* 当前月份显示文本 */
  const currentMonthLabel = (() => {
    const now = new Date()
    return `${now.getFullYear()}年${now.getMonth() + 1}月`
  })()

  const fetchData = async () => {
    try {
      const res = await Network.request({ url: '/api/bills?limit=200&offset=0' })
      console.log('[Stats] bills:', JSON.stringify(res.data))
      setBills(res.data?.data?.items || res.data?.data || [])
    } catch (e) { console.error(e) }
  }

  /* ====== Header高度 ====== */
  const detailHeaderH = capsuleBottom + 110   // 明细页header较高(标题+筛选行+汇总行)
  const chartHeaderH = capsuleBottom + 130     // 统计页header(日期+支出入账切换+金额)

  /* ====== 渲染 ====== */
  return (
    <View className="flex flex-col h-full" style={{ backgroundColor: '#F5F5F5' }}>
      {/* ==================== 明细 Tab ==================== */}
      {activeTab === 'detail' && (
        <>
          {/* 固定绿色Header */}
          <View style={{
            position: 'fixed',
            top: 0, left: 0, right: 0,
            zIndex: 100,
            background: THEME.headerBg,
          }}
          >
            {/* 标题行 */}
            <View style={{
              paddingTop: statusBarH,
              height: capsuleBottom,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingLeft: 16, paddingRight: 16,
            }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', fontFamily: '-apple-system, "SF Pro Display", sans-serif' }}>记账本</Text>
            </View>

            {/* 筛选行 */}
            <View style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 8, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View onClick={() => {
                const ranges: Record<string, string> = { month: 'all', all: 'month', week: 'month' }
                setDateRange(ranges[dateRange] || 'month')
              }} style={{
                paddingTop: 5, paddingBottom: 5, paddingLeft: 12, paddingRight: 12,
                borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)',
              }}
              >
                <Text style={{ fontSize: 13, color: '#FFFFFF' }}>{{
                  all: '全部类型', month: '本月', week: '近7天',
                }[dateRange]}</Text>
              </View>
              <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, color: '#FFFFFF' }}>&#8862;</Text>
              </View>
            </View>

            {/* 汇总行 */}
            <View style={{
              paddingLeft: 16, paddingRight: 16, paddingBottom: 14,
              display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
            >
              <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>{currentMonthLabel}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>&#9660;</Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>总支出¥{totalExpense.toFixed(2)}</Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>总入账¥{totalIncome.toFixed(2)}</Text>
            </View>
          </View>

          {/* 滚动内容区 */}
          <ScrollView scrollY enhanced showScrollbar={false}
            style={{ flex: 1, marginTop: detailHeaderH, marginBottom: 70 }}
          >
            <View style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(() => {
                /* 按日期分组 */
                const grouped: Record<string, Bill[]> = {}
                filteredBills.forEach(b => {
                  const date = (b.bill_date || '').split('T')[0]
                  if (!grouped[date]) grouped[date] = []
                  grouped[date].push(b)
                })
                const sortedDates = Object.keys(grouped).sort().reverse()

                if (!sortedDates.length) return (
                  <View style={{
                    borderRadius: 16, backgroundColor: '#FFFFFF',
                    padding: 40, alignItems: 'center',
                  }}
                  >
                    <Text style={{ fontSize: 36 }}>📋</Text>
                    <Text style={{ fontSize: 14, color: '#BBB', marginTop: 8, display: 'block' }}>暂无明细</Text>
                  </View>
                )

                return sortedDates.map(date => {
                  const items = grouped[date]
                  const dayOut = items.filter(i => !i.is_treat).reduce((s, i) => s + Math.abs(Number(i.amount)), 0)
                  const dayIn = items.filter(i => i.is_treat).reduce((s, i) => s + Number(i.amount), 0)

                  return (
                    <View key={date} style={{
                      borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    }}
                    >
                      {/* 日期头 */}
                      <View style={{
                        paddingTop: 10, paddingBottom: 10, paddingLeft: 16, paddingRight: 16,
                        display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        backgroundColor: '#FAFAFA',
                        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
                      }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#333' }}>{getDayLabel(date)}</Text>
                        <View style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
                          <Text style={{ fontSize: 12, color: '#999' }}>出 {dayOut.toFixed(2)}</Text>
                          <Text style={{ fontSize: 12, color: '#999' }}>入 {dayIn.toFixed(2)}</Text>
                        </View>
                      </View>
                      {/* 账单项 */}
                      {items.map((bill, bi) => {
                        const cc = getCategoryConfig(bill.category)
                        const IconComp = cc.icon
                        const amt = Number(bill.amount)
                        const isPos = amt >= 0
                        return (
                          <View key={`${bill.id}-${bi}`} style={{
                            paddingTop: 12, paddingBottom: 12, paddingLeft: 16, paddingRight: 16,
                            display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12,
                            borderBottomWidth: bi < items.length - 1 ? 1 : 0,
                            borderBottomColor: '#F5F5F5',
                          }}
                          >
                            {/* 类别图标圆 */}
                            <View style={{
                              width: 40, height: 40, borderRadius: 20,
                              backgroundColor: cc.bg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}
                            >
                              <IconComp size={18} color={cc.color} />
                            </View>
                            {/* 名称+备注 */}
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ fontSize: 15, color: '#333', display: 'block' }}>{bill.name}</Text>
                              {(bill.note || bill.payer) && (
                                <Text style={{ fontSize: 11, color: '#AAA', display: 'block', marginTop: 1 }}>
                                  {[bill.payer, bill.note].filter(Boolean).join(' | ')}
                                </Text>
                              )}
                            </View>
                            {/* 金额 */}
                            <Text style={{
                              fontSize: 16, fontWeight: '600',
                              color: isPos ? '#F5A623' : '#333',
                              flexShrink: 0,
                            }}
                            >{isPos ? '+' : ''}{amt.toFixed(2)}</Text>
                          </View>
                        )
                      })}
                    </View>
                  )
                })
              })()}
            </View>
          </ScrollView>

          {/* 浮动"记一笔"按钮 */}
          <View onClick={() => Taro.navigateTo({ url: '/pages/add-bill/index' })}
            style={{
              position: 'fixed', right: 20, bottom: 80, zIndex: 99,
              width: 56, height: 56, borderRadius: 28,
              background: 'linear-gradient(135deg, #52C41A, #73D13D)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 24px rgba(82,196,26,0.35)',
            }}
          >
            <Text style={{ fontSize: 22, color: '#FFFFFF', fontWeight: '300' }}>+</Text>
          </View>
        </>
      )}

      {/* ==================== 统计 Tab ==================== */}
      {activeTab === 'chart' && (
        <>
          {/* 固定绿色Header */}
          <View style={{
            position: 'fixed',
            top: 0, left: 0, right: 0,
            zIndex: 100,
            background: THEME.headerBg,
          }}
          >
            {/* 标题行 + 日期 */}
            <View style={{
              paddingTop: statusBarH,
              height: capsuleBottom,
              paddingLeft: 16, paddingRight: 16,
              display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}
            >
              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  const next: Record<string, string> = { month: 'all', all: 'week', week: 'month' }
                  setDateRange(next[dateRange] || 'month')
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#FFFFFF' }}>
                  {{ all: '全部时间', month: currentMonthLabel, week: '近7天' }[dateRange]}
                </Text>
                <Text style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>&#128197;</Text>
              </View>

              {/* 支出/入账 切换 */}
              <View style={{ display: 'flex', flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16 }}>
                <View style={{
                  paddingTop: 5, paddingBottom: 5, paddingLeft: 14, paddingRight: 14,
                  borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.95)',
                }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.primary }}>支出</Text>
                </View>
                <View style={{ paddingTop: 5, paddingBottom: 5, paddingLeft: 14, paddingRight: 14 }}>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>入账</Text>
                </View>
              </View>
            </View>

            {/* 金额区 */}
            <View style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 20 }}>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', display: 'block', marginBottom: 2 }}>共支出</Text>
              <Text style={{ fontSize: 34, fontWeight: '700', color: '#FFFFFF', fontFamily: '"Georgia","Times New Roman",serif' }}>
                ¥{totalExpense.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* 滚动内容 */}
          <ScrollView scrollY enhanced showScrollbar={false}
            style={{ flex: 1, marginTop: chartHeaderH, marginBottom: 70 }}
          >
            <View style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 支出构成标题 */}
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#333', paddingLeft: 4, display: 'block' }}>支出构成</Text>

              {/* 环形饼图区域 */}
              {pieData.length > 0 ? (
                <View style={{
                  borderRadius: 16, backgroundColor: '#FFFFFF',
                  padding: 20, paddingBottom: 16,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}
                >
                  {/* 环形图 */}
                  <View style={{
                    width: 180, height: 180, borderRadius: 90,
                    background: conicGradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}
                  >
                    {/* 中心白圆 */}
                    <View style={{
                      width: 100, height: 100, borderRadius: 50,
                      backgroundColor: '#FFFFFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    >
                      {/* 可选中心显示总金额或留空 */}
                    </View>
                    {/* 百分比标注 - 上方 */}
                    {pieData.slice(0, 2).map((item, i) => {
                      // 简单位置计算：第一个放右上，第二个放下方
                      const isTop = i === 0
                      return (
                        <View key={`lbl-${i}`}
                          style={{
                            position: 'absolute',
                            ...(isTop
                              ? { top: -4, left: '55%' }
                              : { bottom: -4, right: '15%' }
                            ),
                            display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4,
                          }}
                        >
                          {/* 连接线 */}
                          <View style={{
                            width: isTop ? 14 : 18, height: 1,
                            backgroundColor: '#DDD',
                          }}
                          />
                          <Text style={{ fontSize: 12, color: '#666' }}>
                            {item.name} {item.percent}%
                          </Text>
                        </View>
                      )
                    })}
                  </View>

                  {/* 分类排行列表 */}
                  <View style={{ width: '100%', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {categoryStats.map((cat, i) => {
                      const cc = getCategoryConfig(cat.name)
                      const IconComp = cc.icon
                      return (
                        <View key={`rank-${i}`}
                          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}
                        >
                          {/* 圆形图标 */}
                          <View style={{
                            width: 36, height: 36, borderRadius: 18,
                            backgroundColor: cc.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}
                          >
                            <IconComp size={17} color={cc.color} />
                          </View>
                          {/* 名称 */}
                          <Text style={{ fontSize: 15, color: '#333', width: 50, flexShrink: 0 }}>{cat.name}</Text>
                          {/* 进度条 */}
                          <View style={{ flex: 1, height: 10, backgroundColor: '#F0F0F0', borderRadius: 5, overflow: 'hidden' }}>
                            <View style={{
                              width: `${Math.max(cat.amount / maxCatAmount * 100, 4)}%`,
                              height: 10,
                              backgroundColor: cc.color,
                              borderRadius: 5,
                              minWidth: cat.amount > 0 ? 16 : 0,
                            }}
                            />
                          </View>
                          {/* 金额+箭头 */}
                          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#333' }}>¥{cat.amount}</Text>
                            <ChevronRight size={16} color="#CCC" />
                          </View>
                        </View>
                      )
                    })}
                  </View>
                </View>
              ) : (
                <View style={{
                  borderRadius: 16, backgroundColor: '#FFFFFF',
                  padding: 40, alignItems: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
                >
                  <Text style={{ fontSize: 36 }}>📊</Text>
                  <Text style={{ fontSize: 14, color: '#BBB', marginTop: 8, display: 'block' }}>暂无统计数据</Text>
                  <Text style={{ fontSize: 12, color: '#DDD', marginTop: 2, display: 'block' }}>添加账单后将自动生成图表</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </>
      )}

      {/* ==================== 地图 Tab ==================== */}
      {activeTab === 'map' && (
        <>
          {/* 固定Header */}
          <View style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            background: THEME.headerBg,
          }}
          >
            <View style={{
              paddingTop: statusBarH,
              height: capsuleBottom,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', fontFamily: '-apple-system, "SF Pro Display", sans-serif' }}>
                目的地地图
              </Text>
            </View>
          </View>

          <ScrollView scrollY enhanced showScrollbar={false}
            style={{ flex: 1, marginTop: capsuleBottom + 10, marginBottom: 70 }}
          >
            <View style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 地图占位卡片 */}
              <View style={{
                borderRadius: 16, backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
              >
                {/* 简化的中国地图示意区域 */}
                <View style={{
                  width: '100%',
                  height: 280,
                  backgroundColor: '#F0FFF0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                  borderBottomWidth: 1, borderBottomColor: '#E8F5E8',
                }}
                >
                  <Text style={{ fontSize: 48, opacity: 0.3 }}>🗺️</Text>
                  {/* 城市标记点 */}
                  {destinationList.slice(0, 8).map((dest, i) => {
                    /* 用简单的散布位置模拟城市分布 */
                    const positions = [
                      { top: '18%', left: '38%' },  /* 北京附近 */
                      { top: '42%', left: '58%' },  /* 上海附近 */
                      { top: '54%', left: '46%' },  /* 武汉附近 */
                      { top: '60%', left: '62%' },  /* 广州附近 */
                      { top: '45%', left: '28%' },  /* 成都附近 */
                      { top: '30%', left: '68%' },  /* 杭州附近 */
                      { top: '66%', left: '38%' },  /* 昆明附近 */
                      { top: '35%', left: '18%' },  /* 兰州附近 */
                    ]
                    const pos = positions[i % positions.length]
                    return (
                      <View key={`marker-${i}`} style={{
                        position: 'absolute',
                        top: pos.top,
                        left: pos.left,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                      >
                        <View style={{
                          width: 10, height: 10, borderRadius: 5,
                          backgroundColor: THEME.primary,
                          boxShadow: `0 0 8px ${THEME.primary}40`,
                        }}
                        />
                        <View style={{
                          marginTop: 2,
                          paddingTop: 2, paddingBottom: 2, paddingLeft: 5, paddingRight: 5,
                          borderRadius: 4,
                          backgroundColor: 'rgba(255,255,255,0.92)',
                          borderWidth: 1,
                          borderColor: THEME.primary,
                        }}
                        >
                          <Text style={{ fontSize: 9, color: '#333', fontWeight: '500' }}>{dest.city}</Text>
                        </View>
                      </View>
                    )
                  })}
                </View>
                {/* 图例说明 */}
                <View style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', display: 'block' }}>
                    📍 已标记 {destinationList.length} 个目的地
                  </Text>
                  <Text style={{ fontSize: 12, color: '#888', display: 'block' }}>
                    根据项目名称中的地名自动识别地级市
                  </Text>
                  {destinationList.length > 0 && (
                    <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {destinationList.map((d, i) => (
                        <View key={`dtag-${i}`} style={{
                          paddingTop: 4, paddingBottom: 4, paddingLeft: 10, paddingRight: 10,
                          borderRadius: 10,
                          backgroundColor: '#F0FFF0',
                          borderLeftWidth: 3, borderLeftColor: THEME.primary,
                        }}
                        >
                          <Text style={{ fontSize: 11, color: '#555' }}>{d.city}</Text>
                          <Text style={{ fontSize: 10, color: '#AAA' }}> ¥{d.amount}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* 目的地排行榜 */}
              {destinationList.length > 0 && (
                <View style={{
                  borderRadius: 16, backgroundColor: '#FFFFFF',
                  padding: 16,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 12, display: 'block' }}>
                    💰 目的地花费排行
                  </Text>
                  {destinationList.map((dest, i) => (
                    <View key={`dlist-${i}`} style={{
                      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10,
                      paddingTop: i > 0 ? 10 : 0,
                      borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#F0F0F0',
                    }}
                    >
                      <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: i < 3 ? THEME.primary : '#E8E8E8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: i < 3 ? '#FFF' : '#888' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 14, color: '#333', flex: 1 }}>{dest.city}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: THEME.primaryDark }}>¥{dest.amount}</Text>
                      <Text style={{ fontSize: 11, color: '#AAA' }}>({dest.count}笔)</Text>
                    </View>
                  ))}
                </View>
              )}

              {destinationList.length === 0 && (
                <View style={{
                  borderRadius: 16, backgroundColor: '#FFFFFF',
                  padding: 40, alignItems: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
                >
                  <Text style={{ fontSize: 36 }}>🗺️</Text>
                  <Text style={{ fontSize: 14, color: '#BBB', marginTop: 8, display: 'block' }}>暂无目的地数据</Text>
                  <Text style={{ fontSize: 12, color: '#DDD', marginTop: 2, display: 'block' }}>创建项目并填写地点后显示地图</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </>
      )}

      {/* ==================== 三段式底部Tab栏 ==================== */}
      <View style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 200,
        display: 'flex', flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1, borderTopColor: '#EEE',
        paddingBottom: isWeapp ? 0 : 4,
      }}
      >
        {([
          { key: 'detail' as TabType, label: '明细', Icon: FileText },
          { key: 'chart' as TabType, label: '统计', Icon: FileChartPie },
          { key: 'map' as TabType, label: '地图', Icon: MapIcon },
        ]).map(tab => {
          const isActive = activeTab === tab.key
          const TabIcon = tab.Icon
          return (
            <View key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 7, paddingBottom: 5,
                backgroundColor: isActive ? THEME.primary : '#FFFFFF',
              }}
            >
              <TabIcon size={20} color={isActive ? '#FFFFFF' : '#8C8C8C'} />
              <Text style={{
                fontSize: 11,
                fontWeight: isActive ? '600' : '400',
                color: isActive ? '#FFFFFF' : '#8C8C8C',
                marginTop: 2,
              }}
              >{tab.label}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default StatsPage
