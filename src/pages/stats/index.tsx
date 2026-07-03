import { useState, useEffect, useMemo } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { Network } from '@/network'

interface Bill {
  id: string
  name: string
  amount: number
  category: string
  payer: string
  project_id: string
  created_at: string
  location?: string
  note?: string
}

interface Project {
  id: string
  name: string
  created_at?: string
}

/* ── 类别配置（与首页/添加页/详情页一致，中文key） ── */
const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  food:    { icon: '\uD83C\uDF7D', color: '#E8A87C', bg: '#FFF5EE', label: '餐饮' },
  traffic: { icon: '\uD83D\uDE97', color: '#85B6C8', bg: '#F0F7FF', label: '交通' },
  hotel:   { icon: '\uD83C\uDFE8', color: '#A8D8B9', bg: '#F0FFF0', label: '住宿' },
  gift:    { icon: '\uD83C\uDF81', color: '#D4A5D4', bg: '#FDF0FF', label: '纪念品' },
  ticket:  { icon: '\uD83C\uDFAB', color: '#F5C26B', bg: '#FFF8E8', label: '门票' },
  other:   { icon: '\uD83D\uDCCC', color: '#C0C8D0', bg: '#F5F6F8', label: '其他' },
}
// 中文别名映射（bill.category 可能是中文名）
const CAT_ALIAS: Record<string, string> = {
  '餐饮': 'food', '交通': 'traffic', '住宿': 'hotel',
  '纪念品': 'gift', '门票': 'ticket', '其他': 'other',
}
function resolveCat(cat: string) {
  return CAT_ALIAS[cat] || cat || 'other'
}

/* ── 颜色常量 ── */
const C = {
  primary: '#1890FF',
  primaryLight: '#E6F4FF',
  text: '#333333',
  sub: '#888888',
  border: '#EEEEEE',
  bg: '#F7F8FA',
  orange: '#E8A87C',
  green: '#85B6C8',
}

type DateRange = 'all' | 'this_month' | 'last_month' | 'recent' | 'today' | 'custom'

export default function StatsPage() {
  /* ---- State ---- */
  const [activeTab, setActiveTab] = useState<string>('stats')
  const [filterCategory, setFilterCategory] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [showCatPicker, setShowCatPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [bills, setBills] = useState<Bill[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const statusBarH = (Taro.getSystemInfoSync() as any).statusBarHeight || (Taro.getSystemInfoSync() as any).statusBarH || 20

  // Header 总高度计算：标题(44) + 金额行(~44) + 筛选行(~48) + Tab栏(~44) + 分隔线
  const headerTotalH = statusBarH + 44 + 42 + 46 + 44 + 2

  /* ---- Data Fetching ---- */
  useEffect(() => {
    async function fetchAll() {
      try {
        const [bRes, pRes] = await Promise.all([
          Network.request({ url: '/api/bills' }),
          Network.request({ url: '/api/projects' }),
        ])
        setBills(bRes.data?.data || [])
        setProjects(pRes.data?.data || [])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchAll()
  }, [])

  /* ---- Helpers ---- */
  const fmt = (n: number) => n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toFixed(0)
  function fmtDate(d: string) {
    const dt = new Date(d); return `${dt.getMonth()+1}月${dt.getDate()}日 星期${'日一二三四五六'[dt.getDay()]}`
  }

  /* ---- 筛选逻辑 ---- */
  const filteredBills = useMemo(() => {
    let result = [...bills]
    // 类别筛选
    if (filterCategory !== 'all') result = result.filter(b => resolveCat(b.category) === filterCategory)
    // 时间筛选
    let start: Date, end: Date
    switch (dateRange) {
      case 'all': return result
      case 'this_month':
        start = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59)
        break
      case 'last_month':
        const lm = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
        end = new Date(lm.getFullYear(), lm.getMonth() + 1, 0, 23, 59, 59); start = lm
        break
      case 'recent':
        const rp = projects[projects.length - 1]
        if (!rp) return result; start = new Date(rp.created_at || Date.now()); end = new Date()
        break
      case 'today':
        start = new Date(); start.setHours(0, 0, 0, 0)
        end = new Date(); end.setHours(23, 59, 59, 999)
        break
      case 'custom':
        start = new Date(customStartDate)
        end = new Date(customEndDate + 'T23:59:59')
        break
      default: return result
    }
    return result.filter(b => {
      const d = new Date(b.created_at)
      return d >= start && d <= end
    })
  }, [bills, filterCategory, dateRange, projects, customStartDate, customEndDate])

  const totalExpense = useMemo(() => filteredBills.reduce((s, b) => s + b.amount, 0), [filteredBills])

  const categoryStats = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {}
    for (const b of filteredBills) {
      const k = resolveCat(b.category)
      if (!map[k]) map[k] = { amount: 0, count: 0 }
      map[k].amount += b.amount
      map[k].count += 1
    }
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount).map(([name, v]) => ({
      ...v,
      name,
      ...CATEGORY_CONFIG[name],
      label: CATEGORY_CONFIG[name]?.label || name,
      color: CATEGORY_CONFIG[name]?.color || '#999',
    }))
  }, [filteredBills])

  /* 圆环图数据 */
  const pieData = useMemo(() => {
    if (!categoryStats.length) return []
    const max = categoryStats[0].amount
    return categoryStats.map(c => ({ name: c.name, label: c.label, amount: c.amount, color: c.color, percent: c.amount / totalExpense * 100, ratio: c.amount / max }))
  }, [categoryStats, totalExpense])

  const pieGradientStr = useMemo(() => {
    if (!pieData.length) return '#E5E7EB'
    let cum = 0; const stops: string[] = []
    for (let i = 0; i < pieData.length; i++) {
      const d = pieData[i]; const p = d.percent
      if (p <= 0) continue
      stops.push(`${d.color} ${cum.toFixed(1)}% ${(cum + p).toFixed(1)}%`)
      cum += p
    }
    if (cum < 99.9) stops.push(`#F3F4F6 ${cum.toFixed(1)}% 100%`)
    return `conic-gradient(from -90deg,${stops.join(',')})`
  }, [pieData])

  /* 按项目统计 */
  const projectStats = useMemo(() => {
    const map: Record<string, number> = {}
    for (const b of filteredBills) { if (!map[b.project_id]) map[b.project_id] = 0; map[b.project_id] += b.amount }
    return Object.entries(map).map(([id, a]) => ({ id, name: (projects.find(p => p.id === id) || {}).name || id, amount: a })).sort((a, b) => b.amount - a.amount)
  }, [filteredBills, projects])

  /* 按月统计 */
  const monthlyStats = useMemo(() => {
    const map: Record<string, number> = {}
    for (const b of filteredBills) { const k = b.created_at.substring(0, 7); if (!map[k]) map[k] = 0; map[k] += b.amount }
    return Object.entries(map).sort().map(([m, a]) => ({ month: m, amount: a }))
  }, [filteredBills])

  /* 明细按日期分组 */
  const groupedBills = useMemo(() => {
    const g: Record<string, Bill[]> = {}
    for (const b of filteredBills) { const d = b.created_at.substring(0, 10); if (!g[d]) g[d] = []; g[d].push(b) }
    return Object.keys(g).sort().reverse().map(d => ({ date: d, bills: g[d], total: g[d].reduce((s, b) => s + b.amount, 0) }))
  }, [filteredBills])

  /* 城市列表 */
  const cityList = useMemo(() => { const s = new Set<string>(); for (const b of bills) if (b.location) s.add(b.location); return Array.from(s) }, [bills])

  /* 日期显示文本 */
  const dateDisplayText = useMemo(() => {
    if (dateRange === 'all') return '全部时间'
    if (dateRange === 'this_month') return '本月'
    if (dateRange === 'last_month') return '上月'
    if (dateRange === 'recent') return '最近项目'
    if (dateRange === 'today') return '今天'
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      const sd = new Date(customStartDate), ed = new Date(customEndDate)
      return `${sd.getMonth() + 1}/${sd.getDate()}-${ed.getMonth() + 1}/${ed.getDate()}`
    }
    return '自定义'
  }, [dateRange, customStartDate, customEndDate])

  /* ---- 日历快捷选项 ---- */
  const quickOptions = [{ label: '全部', key: 'all' }, { label: '本月', key: 'this_month' }, { label: '上月', key: 'last_month' }, { label: '最近项目', key: 'recent' }, { label: '今天', key: 'today' }]

  /* 日历生成 */
  function getCalendarDays(): Date[] {
    const y = new Date().getFullYear(); const m = new Date().getMonth()
    const last = new Date(y, m + 1, 0)
    const days: Date[] = []; for (let i = 1; i <= last.getDate(); i++) days.push(new Date(y, m, i))
    return days
  }
  function pickDate(d: Date) {
    const ds = d.toISOString().split('T')[0]
    if (!customStartDate || (customStartDate && customEndDate)) {
      setCustomStartDate(ds); setCustomEndDate('')
    } else {
      if (ds < customStartDate) { setCustomStartDate(ds) } else { setCustomEndDate(ds) }
    }
  }
  function resetDateRange() { setCustomStartDate(''); setCustomEndDate(''); setShowCalendar(false) }
  function confirmDate() { if (customStartDate) setDateRange('custom'); setShowCalendar(false) }

  /* ════════════ RENDER ════════════ */

  return (
    <View style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: C.bg }}>
      {/* ===== 固定顶栏 ===== */}
      <View style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* 标题行 */}
        <View style={{ paddingTop: statusBarH, height: statusBarH + 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>{activeTab === 'stats' ? '支出分析' : activeTab === 'detail' ? '账单明细' : '足迹地图'}</Text>
        </View>

        {/* 金额行 + 筛选行 合并紧凑 */}
        <View style={{ paddingLeft: 14, paddingRight: 14, paddingBottom: 8 }}>
          {/* 共支出 */}
          <View style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
            <Text style={{ fontSize: 12, color: C.sub }}>共支出</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: C.text, marginLeft: 8 }}>{'\u00A5'}{fmt(totalExpense)}</Text>
            {pieData.length > 0 && <Text style={{ fontSize: 12, color: C.sub, marginLeft: 6 }}>{pieData.length}类</Text>}
          </View>

          {/* 筛选栏：一行两列 */}
          <View style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
            <View onClick={() => setShowCatPicker(true)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32, borderRadius: 16, backgroundColor: '#F5F6F8', paddingLeft: 12, paddingRight: 10 }}>
              <Text style={{ fontSize: 12, color: filterCategory === 'all' ? C.sub : C.text }}>
                {filterCategory === 'all' ? '全部类别' : (CATEGORY_CONFIG[filterCategory]?.label || filterCategory)}
              </Text>
              <Text style={{ fontSize: 10, color: '#BBB' }}>&#x25BC;</Text>
            </View>
            <View onClick={() => setShowDatePicker(true)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32, borderRadius: 16, backgroundColor: '#F5F6F8', paddingLeft: 12, paddingRight: 10 }}>
              <Text style={{ fontSize: 12, color: dateRange === 'all' ? C.sub : C.text, maxWidth: 140 }}>{dateDisplayText}</Text>
              <Text style={{ fontSize: 10, color: '#BBB' }}>&#x25BC;</Text>
            </View>
          </View>
        </View>

        {/* Tab 栏 — 统一长条分段控制器风格 */}
        <View style={{ display: 'flex', flexDirection: 'row', margin: 10, marginLeft: 14, marginRight: 14, height: 36, borderRadius: 18, backgroundColor: '#F0F1F3', padding: 2 }}>
          {[
            ['stats', '\u{1F4CA} 统计'],
            ['detail', '\u{1F4CB} 明细'],
            ['map', '\u{1F5FA} 地图'],
          ].map(([k, t]) => (
            <View key={k} onClick={() => setActiveTab(k)}
              style={{
                flex: 1, height: 32, borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: activeTab === k ? '#FFFFFF' : 'transparent',
                boxShadow: activeTab === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: activeTab === k ? '600' : '400', color: activeTab === k ? C.primary : C.sub }}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ===== 可滚动内容区 ===== */}
      <View style={{ flex: 1, paddingTop: headerTotalH, overflowY: 'auto' }}>
        {loading ? (
          <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 120 }}>
            <Text style={{ fontSize: 14, color: '#CCC', display: 'block' }}>加载中...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'stats' && (
              <>
                {/* 圆环卡片 */}
                <View style={{ margin: 12, marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, display: 'block', marginBottom: 12 }}>支出构成</Text>
                  {pieData.length > 0 ? (
                    <View style={{ display: 'flex', alignItems: 'center' }}>
                      {/* 圆环 */}
                      <View style={{ width: 130, height: 130, marginRight: 14, flexShrink: 0, position: 'relative' }}>
                        <View style={{ width: 130, height: 130, borderRadius: 65, background: pieGradientStr }} />
                        <View style={{ position: 'absolute', left: 37, top: 37, width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 20, fontWeight: '700', color: C.text, display: 'block', textAlign: 'center' }}>{pieData.length}</Text>
                          <Text style={{ fontSize: 10, color: C.sub, display: 'block', textAlign: 'center' }}>类</Text>
                        </View>
                      </View>
                      {/* 图例列表 */}
                      <View style={{ flex: 1 }}>
                        {pieData.slice(0, 5).map((d, i) => (
                          <View key={d.name + i} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color, marginRight: 8, flexShrink: 0 }} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, color: '#555', display: 'block' }} numberOfLines={1}>{d.label}</Text>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: C.text, display: 'block', marginLeft: 6 }}>{'\u00A5'}{fmt(d.amount)}</Text>
                              </View>
                              <View style={{ height: 3, borderRadius: 2, backgroundColor: '#F1F5F9', marginTop: 3, overflow: 'hidden' }}>
                                <View style={{ height: 3, borderRadius: 2, minWidth: Math.round(d.ratio * 100) > 0 ? 4 : 0, width: Math.round(d.ratio * 100) + '%', backgroundColor: d.color, opacity: 0.75 }} />
                              </View>
                            </View>
                          </View>
                        ))}
                        <Text style={{ fontSize: 11, color: C.sub, display: 'block', marginTop: 2 }}>总计 {'\u00A5'}{fmt(totalExpense)}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 20, paddingBottom: 10 }}>
                      <Text style={{ fontSize: 13, color: '#BBB', display: 'block' }}>暂无数据</Text>
                    </View>
                  )}
                </View>

                {/* 按项目统计 - 竖状柱状图 */}
                {projectStats.length > 0 && (
                  <View style={{ margin: 12, marginTop: 0, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, display: 'block', marginBottom: 12 }}>{'\uD83D\uDCCB'} 按项目统计</Text>
                    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 8, paddingBottom: 4, height: 130 }}>
                      {projectStats.slice(0, 7).map((p, i) => {
                        const mx = Math.max(...projectStats.slice(0, 7).map(x => x.amount))
                        const barH = Math.max((p.amount / mx) * 100, 6)
                        return (
                          <View key={p.id} style={{ alignItems: 'center', width: '13%' }}>
                            <Text style={{ fontSize: 10, color: '#999', display: 'block', marginBottom: 3 }}>{p.amount >= 1000 ? (p.amount / 1000).toFixed(1) + 'k' : p.amount}</Text>
                            <View style={{ width: 22, minHeight: barH, borderRadius: '6px 6px 0 0', backgroundColor: C.orange, opacity: 0.65 + (i * 0.05) }} />
                            <Text style={{ fontSize: 10, color: '#666', display: 'block', marginTop: 5, textAlign: 'center', lineHeight: 1.2 }} numberOfLines={1}>{p.name.replace(/新昌|徒步|旅游/g, '')}</Text>
                          </View>
                        )
                      })}
                    </View>
                  </View>
                )}

                {/* 每月趋势 */}
                {monthlyStats.length > 1 && (
                  <View style={{ margin: 12, marginTop: 0, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 80 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, display: 'block', marginBottom: 12 }}>{'\uD83D\uDCC5'} 每月趋势</Text>
                    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 8, paddingBottom: 4, height: 110 }}>
                      {monthlyStats.slice(-7).map((m, i) => {
                        const mx = Math.max(...monthlyStats.slice(-7).map(x => x.amount))
                        const barH = Math.max((m.amount / mx) * 85, 6)
                        return (
                          <View key={m.month} style={{ alignItems: 'center', width: '13%' }}>
                            <Text style={{ fontSize: 10, color: '#999', display: 'block', marginBottom: 3 }}>{m.amount >= 1000 ? (m.amount / 1000).toFixed(1) + 'k' : m.amount}</Text>
                            <View style={{ width: 20, minHeight: barH, borderRadius: '5px 5px 0 0', backgroundColor: C.green, opacity: 0.6 + (i * 0.05) }} />
                            <Text style={{ fontSize: 10, color: '#666', display: 'block', marginTop: 5 }}>{m.month.split('-')[1]}月</Text>
                          </View>
                        )
                      })}
                    </View>
                  </View>
                )}
              </>
            )}

            {activeTab === 'detail' && (
              <>
                {!groupedBills.length ? (
                  <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
                    <Text style={{ fontSize: 14, color: '#BBB', display: 'block' }}>暂无账单记录</Text>
                  </View>
                ) : (
                  <View style={{ padding: 12, paddingTop: 4, paddingBottom: 80 }}>
                    {groupedBills.map(g => (
                      <View key={g.date} style={{ marginBottom: 14 }}>
                        {/* 日期行 */}
                        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, display: 'block' }}>{fmtDate(g.date)}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: C.orange, display: 'block' }}>{'\u00A5'}{fmt(g.total)}</Text>
                        </View>
                        {/* 账单列表 */}
                        {g.bills.map(bill => {
                          const k = resolveCat(bill.category)
                          const cfg = CATEGORY_CONFIG[k] || CATEGORY_CONFIG.other
                          return (
                            <View key={bill.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 11, marginBottom: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}>
                                <Text style={{ fontSize: 18 }}>{cfg.icon}</Text>
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={{ fontSize: 14, fontWeight: '500', color: C.text, display: 'block' }} numberOfLines={1}>{bill.note || cfg.label}</Text>
                                <Text style={{ fontSize: 11, color: '#AAA', display: 'block', marginTop: 1 }}>{bill.payer || ''}</Text>
                              </View>
                              <Text style={{ fontSize: 15, fontWeight: '600', color: C.orange, display: 'block', marginLeft: 8, flexShrink: 0 }}>{'\u00A5'}{fmt(bill.amount)}</Text>
                            </View>
                          )
                        })}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {activeTab === 'map' && (
              <View style={{ padding: 12, paddingTop: 4, paddingBottom: 80 }}>
                {/* 地图卡片 */}
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, display: 'block' }}>{'\uD83D\uDDFA'} 足迹城市</Text>
                    <Text style={{ fontSize: 12, color: C.sub, display: 'block' }}>{cityList.length} 个城市</Text>
                  </View>
                  {/* 地图区域 */}
                  <View style={{ marginLeft: 12, marginRight: 12, marginBottom: 12, height: 220, backgroundColor: '#FAFCFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8F0FE', borderStyle: 'solid', position: 'relative', overflow: 'hidden' }}>
                    {/* 中国轮廓 */}
                    <View style={{ position: 'absolute', left: '10%', top: '8%', width: '78%', height: '82%', borderRadius: '46% 54% 48% 52% / 52% 48% 56% 44%', backgroundColor: '#F0F7FF', borderWidth: 1.5, borderColor: '#BAE0FF', borderStyle: 'solid' }} />
                    {/* 城市点位 */}
                    {cityList.map(city => {
                      const posMap: Record<string, { x: number; y: number }> = { '绍兴市': { x: 0.62, y: 0.58 }, '杭州市': { x: 0.63, y: 0.52 }, '宁波市': { x: 0.70, y: 0.56 } }
                      const pos = posMap[city] || { x: 0.3 + Math.random() * 0.4, y: 0.25 + Math.random() * 0.45 }
                      return (
                        <View key={city} style={{ position: 'absolute', left: pos.x * 100 + '%', top: pos.y * 100 + '%' }}>
                          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#6B9FD5', marginLeft: -3.5, marginTop: -3.5 }} />
                          <Text style={{ fontSize: 9, color: '#6B9FD5', display: 'block', marginTop: 2, whiteSpace: 'nowrap', textAlign: 'center' }}>{city.replace(/市|区|县/g, '')}</Text>
                        </View>
                      )
                    })}
                    {!cityList.length && (
                      <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Text style={{ fontSize: 30, color: '#DDD', display: 'block' }}>{'\uD83D\uDDFA'}</Text>
                        <Text style={{ fontSize: 13, color: '#CCC', display: 'block', marginTop: 8 }}>暂无足迹数据</Text>
                      </View>
                    )}
                  </View>
                  {/* 城市标签 */}
                  {cityList.length > 0 && (
                    <View style={{ backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: C.border, padding: 12 }}>
                      <View style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {cityList.map(city => (
                          <View key={city} style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 10, paddingRight: 10, paddingTop: 4, paddingBottom: 4, backgroundColor: '#F0F7FF', borderRadius: 12 }}>
                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#6B9FD5' }} />
                            <Text style={{ fontSize: 11, color: '#555', display: 'block' }}>{city}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {/* 统计栏 */}
                  <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: C.border }}>
                    <Text style={{ fontSize: 12, color: C.sub, display: 'block' }}>累计点亮 <Text style={{ color: C.primary, fontWeight: '600' }}>{cityList.length}</Text> 市</Text>
                    <Text style={{ fontSize: 12, color: C.sub, display: 'block' }}>总花费 <Text style={{ color: C.text, fontWeight: '600' }}>{'\u00A5'}{fmt(filteredBills.reduce((s, b) => s + b.amount, 0))}</Text></Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {/* ===== 类别选择弹窗 ===== */}
      {showCatPicker && (
        <View onClick={() => setShowCatPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.15)' }}>
          <View onClick={(e: any) => e.stopPropagation()} style={{ backgroundColor: '#FFF', borderRadius: 14, maxHeight: 400, overflow: 'hidden', margin: 80 }}>
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>选择分类</Text>
            </View>
            {[{ key: 'all', label: '全部类别' }, ...Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map(opt => (
              <View key={opt.key} onClick={() => { setFilterCategory(opt.key); setShowCatPicker(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, backgroundColor: opt.key === filterCategory ? '#F0F7FF' : 'transparent' }}
              >
                {opt.key !== 'all' && <Text style={{ fontSize: 17 }}>{CATEGORY_CONFIG[opt.key]?.icon}</Text>}
                <Text style={{ fontSize: 14, color: C.text }}>{opt.label}</Text>
                {opt.key === filterCategory && <Text style={{ marginLeft: 'auto', color: C.primary, fontSize: 14 }}>&#x2713;</Text>}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ===== 日期选择弹窗 ===== */}
      {showDatePicker && (
        <View onClick={() => setShowDatePicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.15)' }}>
          <View onClick={(e: any) => e.stopPropagation()} style={{ backgroundColor: '#FFF', borderRadius: 14, maxHeight: 500, margin: 60 }}>
            <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>选择日期范围</Text>
              <Text onClick={() => setShowDatePicker(false)} style={{ fontSize: 18, color: '#AAA', padding: 4 }}>&#x2715;</Text>
            </View>
            <View style={{ paddingLeft: 14, paddingRight: 14 }}>
              {quickOptions.map(qo => (
                <View key={qo.key} onClick={() => { setDateRange(qo.key as DateRange); setShowDatePicker(false); setShowCalendar(false); if (qo.key !== 'custom') { setCustomStartDate(''); setCustomEndDate('') } }}
                  style={{ paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}
                >
                  <Text style={{ fontSize: 14, color: dateRange === qo.key ? C.primary : C.text, fontWeight: dateRange === qo.key ? '600' : '400' }}>{qo.label}</Text>
                </View>
              ))}
              <View onClick={() => { setShowDatePicker(false); setShowCalendar(true) }} style={{ paddingTop: 12, paddingBottom: 12 }}>
                <Text style={{ fontSize: 14, color: C.primary }}>自定义时间{customStartDate ? (' (' + dateDisplayText + ')') : ''}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ===== 自定义日历弹窗 ===== */}
      {showCalendar && (() => {
        const days = getCalendarDays()
        const today = new Date().toISOString().split('T')[0]
        return (
          <View onClick={() => setShowCalendar(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.25)' }}>
            <View onClick={(e: any) => e.stopPropagation()} style={{ backgroundColor: '#FFF', borderRadius: 16, margin: 50, overflow: 'hidden' }}>
              <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>自定义日历</Text>
                <Text onClick={() => setShowCalendar(false)} style={{ fontSize: 18, color: '#AAA', padding: 4 }}>&#x2715;</Text>
              </View>
              <View style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 4 }}>
                <Text style={{ textAlign: 'center', fontSize: 15, color: C.text, display: 'block' }}>{new Date().getFullYear()}年{'一二三四五六七八九十十一二'.split('')[new Date().getMonth()]}月</Text>
              </View>
              <View style={{ display: 'flex', paddingLeft: 12, paddingRight: 12, paddingBottom: 8 }}>
                {['日', '一', '二', '三', '四', '五', '六'].map(d => <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#999', display: 'block' }}>{d}</Text>)}
              </View>
              <View style={{ display: 'flex', flexWrap: 'wrap', gap: 2, paddingLeft: 8, paddingRight: 8 }}>
                {(new Array(days[0].getDay()).fill(0)).map((_, i) => <View key={'sp' + i} style={{ width: '14.28%', height: 34 }} />)}
                {days.map(d => {
                  const ds = d.toISOString().split('T')[0]; const isToday = ds === today
                  const inRange = (customStartDate && ds >= customStartDate && (!customEndDate || ds <= customEndDate))
                  return (
                    <View key={ds} onClick={() => pickDate(d)}
                      style={{ width: '14.28%', height: 34, borderRadius: 17, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: isToday ? C.primary : inRange ? '#E6F4FF' : ds === customStartDate || ds === customEndDate ? '#D0EBFF' : 'transparent'
                      }}
                    >
                      <Text style={{ fontSize: 13, color: (d.toString() === new Date(customStartDate)?.toString() || d.toString() === new Date(customEndDate)?.toString()) ? '#FFF' : '#374151', fontWeight: isToday ? '600' : '400' }}>{d.getDate()}</Text>
                    </View>
                  )
                })}
              </View>
              <View style={{ display: 'flex', gap: 10, padding: 16 }}>
                <View onClick={resetDateRange} style={{ flex: 1, height: 38, borderRadius: 19, backgroundColor: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#666' }}>重置</Text>
                </View>
                <View onClick={confirmDate} style={{ flex: 1, height: 38, borderRadius: 19, backgroundColor: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#FFF', fontWeight: '600' }}>确定</Text>
                </View>
              </View>
            </View>
          </View>
        )
      })()}
    </View>
  )
}
