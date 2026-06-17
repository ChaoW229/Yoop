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
  Gamepad2,
  Coffee,
  Plane,
  Ellipsis,
} from 'lucide-react-taro'

/* ======== 配色方案 ======== */
const THEME = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
}

/* 类别配置（图标 + 颜色）—— 细节页和统计页共用 */
const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  '交通': { icon: Car, color: '#F59E0B', bg: '#FFFBEB' },
  '餐饮': { icon: Utensils, color: '#EF4444', bg: '#FEF2F2' },
  '住宿': { icon: House, color: '#3B82F6', bg: '#EFF6FF' },
  '购物': { icon: ShoppingBag, color: '#EC4899', bg: '#FDF2F8' },
  '娱乐': { icon: Gamepad2, color: '#A855F7', bg: '#FAF5FF' },
  '咖啡': { icon: Coffee, color: '#92400E', bg: '#FFF7ED' },
  '门票': { icon: Plane, color: '#06B6D4', bg: '#ECFEFF' },
  '纪念品': { icon: Ellipsis, color: '#D97706', bg: '#FFFBEB' },
  '其他': { icon: Ellipsis, color: '#9CA3AF', bg: '#F9FAFB' },
}

function getCategoryConfig(name: string) {
  return CATEGORY_CONFIG[name] || CATEGORY_CONFIG['其他']
}

/* 环形图专用配色（低饱和度、高辨识度） */
const PIE_COLORS = [
  '#6366F1', // indigo
  '#EC4899', // pink
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EF4444', // red
  '#06B6D4', // cyan
  '#84CC16', // lime
]

function getPieColor(index: number) {
  return PIE_COLORS[index % PIE_COLORS.length]
}

/* ======== 中文地级市数据库 ======== */
const CITY_DB: Record<string, { name: string; province: string; lat: number; lng: number }> = {
  '北京': { name: '北京', province: '北京', lat: 40, lng: 116 },
  '上海': { name: '上海', province: '上海', lat: 31, lng: 121 },
  '天津': { name: '天津', province: '天津', lat: 39, lng: 117 },
  '重庆': { name: '重庆', province: '重庆', lat: 29, lng: 106 },
  '杭州': { name: '杭州', province: '浙江', lat: 30, lng: 120 },
  '宁波': { name: '宁波', province: '浙江', lat: 29, lng: 121 },
  '温州': { name: '温州', province: '浙江', lat: 28, lng: 120 },
  '绍兴': { name: '绍兴', province: '浙江', lat: 30, lng: 120 },
  '嘉兴': { name: '嘉兴', province: '浙江', lat: 30, lng: 120 },
  '湖州': { name: '湖州', province: '浙江', lat: 30, lng: 120 },
  '金华': { name: '金华', province: '浙江', lat: 29, lng: 119 },
  '台州': { name: '台山', province: '浙江', lat: 28, lng: 121 },
  '舟山': { name: '舟山', province: '浙江', lat: 30, lng: 122 },
  '丽水': { name: '丽水', province: '浙江', lat: 28, lng: 119 },
  '广州': { name: '广州', province: '广东', lat: 23, lng: 113 },
  '深圳': { name: '深圳', province: '广东', lat: 22, lng: 114 },
  '珠海': { name: '珠海', province: '广东', lat: 22, lng: 113 },
  '佛山': { name: '佛山', province: '广东', lat: 23, lng: 113 },
  '东莞': { name: '东莞', province: '广东', lat: 23, lng: 113 },
  '惠州': { name: '惠州', province: '广东', lat: 23, lng: 114 },
  '汕头': { name: '汕头', province: '广东', lat: 23, lng: 116 },
  '中山': { name: '中山', province: '广东', lat: 22, lng: 113 },
  '江门': { name: '江门', province: '广东', lat: 22, lng: 112 },
  '湛江': { name: '湛江', province: '广东', lat: 21, lng: 110 },
  '南京': { name: '南京', province: '江苏', lat: 32, lng: 118 },
  '苏州': { name: '苏州', province: '江苏', lat: 31, lng: 120 },
  '无锡': { name: '无锡', province: '江苏', lat: 31, lng: 120 },
  '常州': { name: '常州', province: '江苏', lat: 31, lng: 119 },
  '徐州': { name: '徐州', province: '江苏', lat: 34, lng: 117 },
  '扬州': { name: '扬州', province: '江苏', lat: 32, lng: 119 },
  '镇江': { name: '镇江', province: '江苏', lat: 32, lng: 119 },
  '成都': { name: '成都', province: '四川', lat: 30, lng: 104 },
  '绵阳': { name: '绵阳', province: '四川', lat: 31, lng: 104 },
  '乐山': { name: '乐山', province: '四川', lat: 29, lng: 103 },
  '宜宾': { name: '宜宾', province: '四川', lat: 28, lng: 104 },
  '泸州': { name: '泸州', province: '四川', lat: 28, lng: 105 },
  '阿坝': { name: '阿坝', province: '四川', lat: 32, lng: 102 },
  '甘孜': { name: '甘孜', province: '四川', lat: 30, lng: 101 },
  '昆明': { name: '昆明', province: '云南', lat: 25, lng: 102 },
  '大理': { name: '大理', province: '云南', lat: 25, lng: 100 },
  '丽江': { name: '丽江', province: '云南', lat: 26, lng: 100 },
  '西双版纳': { name: '西双版纳', province: '云南', lat: 21, lng: 100 },
  '香格里拉': { name: '香格里拉', province: '云南', lat: 27, lng: 99 },
  '普洱': { name: '普洱', province: '云南', lat: 22, lng: 100 },
  '腾冲': { name: '腾冲', province: '云南', lat: 25, lng: 98 },
  '长沙': { name: '长沙', province: '湖南', lat: 28, lng: 112 },
  '张家界': { name: '张家界', province: '湖南', lat: 29, lng: 110 },
  '湘西': { name: '湘西', province: '湖南', lat: 28, lng: 109 },
  '岳阳': { name: '岳阳', province: '湖南', lat: 29, lng: 113 },
  '武汉': { name: '武汉', province: '湖北', lat: 30, lng: 114 },
  '宜昌': { name: '宜昌', province: '湖北', lat: 30, lng: 111 },
  '恩施': { name: '恩施', province: '湖北', lat: 30, lng: 109 },
  '西安': { name: '西安', province: '陕西', lat: 34, lng: 108 },
  '延安': { name: '延安', province: '陕西', lat: 36, lng: 109 },
  '青岛': { name: '青岛', province: '山东', lat: 36, lng: 120 },
  '济南': { name: '济南', province: '山东', lat: 36, lng: 117 },
  '烟台': { name: '烟台', province: '山东', lat: 37, lng: 121 },
  '威海': { name: '威海', province: '山东', lat: 37, lng: 122 },
  '厦门': { name: '厦门', province: '福建', lat: 24, lng: 118 },
  '福州': { name: '福州', province: '福建', lat: 26, lng: 119 },
  '泉州': { name: '泉州', province: '福建', lat: 24, lng: 118 },
  '漳州': { name: '漳州', province: '福建', lat: 24, lng: 117 },
  '三亚': { name: '三亚', province: '海南', lat: 18, lng: 109 },
  '海口': { name: '海口', province: '海南', lat: 20, lng: 110 },
  '桂林': { name: '桂林', province: '广西', lat: 25, lng: 110 },
  '北海': { name: '北海', province: '广西', lat: 21, lng: 109 },
  '阳朔': { name: '阳朔', province: '广西', lat: 24, lng: 110 },
  '贵阳': { name: '贵阳', province: '贵州', lat: 26, lng: 106 },
  '拉萨': { name: '拉萨', province: '西藏', lat: 29, lng: 91 },
  '林芝': { name: '林芝', province: '西藏', lat: 29, lng: 94 },
  '乌鲁木齐': { name: '乌鲁木齐', province: '新疆', lat: 43, lng: 87 },
  '喀什': { name: '喀什', province: '新疆', lat: 39, lng: 75 },
  '呼和浩特': { name: '呼和浩特', province: '内蒙古', lat: 40, lng: 111 },
  '呼伦贝尔': { name: '呼伦贝尔', province: '内蒙古', lat: 49, lng: 119 },
  '兰州': { name: '兰州', province: '甘肃', lat: 36, lng: 103 },
  '敦煌': { name: '敦煌', province: '甘肃', lat: 40, lng: 94 },
  '张掖': { name: '张掖', province: '甘肃', lat: 38, lng: 100 },
  '南昌': { name: '南昌', province: '江西', lat: 28, lng: 115 },
  '景德镇': { name: '景德镇', province: '江西', lat: 29, lng: 117 },
  '郑州': { name: '郑州', province: '河南', lat: 34, lng: 113 },
  '洛阳': { name: '洛阳', province: '河南', lat: 34, lng: 112 },
  '黄山': { name: '黄山', province: '安徽', lat: 30, lng: 118 },
  '合肥': { name: '合肥', province: '安徽', lat: 31, lng: 117 },
  '大同': { name: '大同', province: '山西', lat: 40, lng: 113 },
  '大连': { name: '大连', province: '辽宁', lat: 38, lng: 121 },
  '沈阳': { name: '沈阳', province: '辽宁', lat: 41, lng: 123 },
  '长春': { name: '长春', province: '吉林', lat: 43, lng: 125 },
  '哈尔滨': { name: '哈尔滨', province: '黑龙江', lat: 45, lng: 126 },
  '香港': { name: '香港', province: '香港', lat: 22, lng: 114 },
  '澳门': { name: '澳门', province: '澳门', lat: 22, lng: 113 },
  '台湾': { name: '台湾', province: '台湾', lat: 23, lng: 121 },
}

function recognizeCity(text: string): typeof CITY_DB[string] | null {
  if (!text) return null
  const t = text.trim()
  if (CITY_DB[t]) return CITY_DB[t]
  for (const [cityName, cityInfo] of Object.entries(CITY_DB)) {
    if (t.includes(cityName)) return cityInfo
  }
  return null
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

interface ProjectItem {
  id: string; name: string; destination?: string; total_amount?: number;
}

const TIME_OPTIONS = [
  { key: 'month', label: '本月' },
  { key: 'week', label: '近7天' },
  { key: 'all', label: '全部' },
]

/* ======== 主组件 ======== */
function StatsPage() {
  type TabType = 'detail' | 'chart' | 'map'
  const [activeTab, setActiveTab] = useState<TabType>('detail')
  const [bills, setBills] = useState<Bill[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [dateRange, setDateRange] = useState<string>('month')
  const [detailCategory, setDetailCategory] = useState<string>('all')

  const statusBarH = Taro.getSystemInfoSync().statusBarHeight || 20
  let capsuleBottom = statusBarH + 44
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === Taro.ENV_TYPE.TT
  if (isWeapp) {
    try {
      const mb = Taro.getMenuButtonBoundingClientRect()
      if (mb && mb.bottom > 0) capsuleBottom = mb.bottom + 6
    } catch (_) {}
  }

  useEffect(() => { fetchData(); fetchProjects() }, [])
  useDidShow(() => { fetchData(); fetchProjects() })

  /* 动态类别列表：从账单数据中提取 */
  const allCategories = useMemo(() => {
    const cats = new Set<string>()
    bills.forEach(b => { if (b.category) cats.add(b.category) })
    return ['all', ...Array.from(cats)]
  }, [bills])

  /* 时间筛选 */
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

  const detailFilteredBills = useMemo(() => {
    if (detailCategory === 'all') return filteredBills
    return filteredBills.filter(b => b.category === detailCategory)
  }, [filteredBills, detailCategory])

  /* 总支出 */
  const totalExpense = useMemo(() =>
    filteredBills.filter(b => !b.is_treat).reduce((s, b) => s + Math.abs(Number(b.amount)), 0),
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
    return categoryStats.map((c, i) => ({
      ...c,
      percent: total > 0 ? ((c.amount / total) * 100).toFixed(1) : '0',
      angle: total > 0 ? (c.amount / total) * 360 : 0,
      color: getPieColor(i),
    }))
  }, [categoryStats])

  const maxCatAmount = categoryStats.length > 0 ? Math.max(...categoryStats.map(c => c.amount)) : 1

  /* 目的地统计 */
  const destinationList = useMemo(() => {
    const m = new Map<string, { amount: number; count: number; info: ReturnType<typeof recognizeCity> }>()
    filteredBills.forEach(b => {
      const dest = b.destination || ''
      if (dest) {
        const cityInfo = recognizeCity(dest)
        const key = cityInfo?.name || dest
        const prev = m.get(key) || { amount: 0, count: 0, info: cityInfo }
        m.set(key, { amount: prev.amount + Math.abs(Number(b.amount)), count: prev.count + 1, info: cityInfo || prev.info })
      }
    })
    projects.forEach(p => {
      const textToCheck = p.destination || p.name || ''
      if (textToCheck) {
        const cityInfo = recognizeCity(textToCheck)
        if (cityInfo) {
          const key = cityInfo.name
          const projAmount = p.total_amount ? Number(p.total_amount) : 0
          const prev = m.get(key) || { amount: 0, count: 0, info: cityInfo }
          m.set(key, { amount: prev.amount + Math.abs(projAmount), count: prev.count + 1, info: cityInfo })
        }
      }
    })
    return Array.from(m.entries())
      .map(([city, v]) => ({ city, ...v }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredBills, projects])

  const fetchData = async () => {
    try {
      const res = await Network.request({ url: '/api/bills?limit=200&offset=0' })
      console.log('[Stats] bills:', JSON.stringify(res.data))
      setBills(res.data?.data?.items || res.data?.data || [])
    } catch (e) { console.error(e) }
  }

  const fetchProjects = async () => {
    try {
      const res = await Network.request({ url: '/api/projects?limit=50&offset=0' })
      console.log('[Stats] projects:', JSON.stringify(res.data))
      setProjects(res.data?.data?.items || res.data?.data || [])
    } catch (e) { console.error(e) }
  }

  /* ====== Header高度 ====== */
  const detailHeaderH = capsuleBottom + 72   // 轻量化：标题+金额行，更紧凑
  const chartHeaderH = capsuleBottom + 88
  const mapHeaderH = capsuleBottom + 48

  /* ====== 底部三段式Tab（轻量风格） ====== */
  const renderBottomTabs = () => (
    <View style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex', flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderTopWidth: 0.5, borderTopColor: '#E5E7EB',
      zIndex: 200,
      paddingBottom: 4,
    }}
    >
      {(['detail', 'chart', 'map'] as TabType[]).map(tab => {
        const labels: Record<TabType, { icon: any; text: string }> = {
          detail: { icon: FileText, text: '明细' },
          chart: { icon: FileChartPie, text: '统计' },
          map: { icon: MapIcon, text: '地图' },
        }
        const isActive = activeTab === tab
        const IconComp = labels[tab].icon
        return (
          <View key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, paddingTop: 8, paddingBottom: 18,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}
          >
            <IconComp size={20} color={isActive ? THEME.primary : '#9CA3AF'} />
            <Text style={{
              fontSize: 11,
              fontWeight: isActive ? '600' : '400',
              color: isActive ? THEME.primary : '#9CA3AF',
            }}
            >{labels[tab].text}</Text>
            {/* 活动指示条 */}
            <View style={{
              width: 16, height: 2.5, borderRadius: 2,
              backgroundColor: isActive ? THEME.primary : 'transparent',
              marginTop: 2,
            }}
            />
          </View>
        )
      })}
    </View>
  )

  /* ====== 轻量分类标签栏 ====== */
  const renderCategoryChips = () => (
    <ScrollView scrollX enhanced show-scrollbar={false}
      style={{ marginTop: 12, marginLeft: 16, marginRight: 16 }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
        {allCategories.map(cat => {
          const isActive = detailCategory === cat
          return (
            <View key={cat}
              onClick={() => setDetailCategory(cat)}
              style={{
                paddingTop: 6, paddingBottom: 6, paddingLeft: 14, paddingRight: 14,
                borderRadius: 20,
                backgroundColor: isActive ? THEME.primary : '#F3F4F6',
                flexShrink: 0,
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: isActive ? '600' : '400',
                color: isActive ? '#FFFFFF' : '#6B7280',
              }}
              >{cat === 'all' ? '全部' : cat}</Text>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )

  /* ====== 时间选择标签栏（横向胶囊按钮） ====== */
  const renderTimePills = () => (
    <View style={{
      display: 'flex', flexDirection: 'row', gap: 8, paddingLeft: 16, paddingRight: 16, marginTop: 8,
    }}
    >
      {TIME_OPTIONS.map(opt => {
        const isActive = dateRange === opt.key
        return (
          <View key={opt.key}
            onClick={() => setDateRange(opt.key)}
            style={{
              paddingTop: 5, paddingBottom: 5, paddingLeft: 14, paddingRight: 14,
              borderRadius: 15,
              backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : 'transparent',
              borderWidth: isActive ? 0 : 1,
              borderColor: 'rgba(255,255,255,0.35)',
              flexShrink: 0,
            }}
          >
            <Text style={{
              fontSize: 13, fontWeight: isActive ? '600' : '400',
              color: '#FFFFFF',
            }}
            >{opt.label}</Text>
          </View>
        )
      })}
    </View>
  )

  return (
    <View className="flex flex-col h-full" style={{ backgroundColor: '#F8FAFC' }}>

      {/* ==================== 明细 Tab ==================== */}
      {activeTab === 'detail' && (
        <>
          {/* 固定Header（轻量渐变） */}
          <View style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
          }}
          >
            <View style={{
              paddingTop: statusBarH, height: capsuleBottom,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            >
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>记账本</Text>
            </View>
            {/* 金额行 */}
            <View style={{
              padding: '12px 16px 14px', display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 8,
            }}
            >
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>总支出</Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF' }}>¥{totalExpense.toFixed(2)}</Text>
            </View>
          </View>

          {/* 分类标签栏（固定在header下方） */}
          <View style={{ position: 'fixed', top: detailHeaderH, left: 0, right: 0, zIndex: 99, backgroundColor: '#F8FAFC', paddingBottom: 4 }}>
            {renderCategoryChips()}
          </View>

          {/* 滚动内容 */}
          <ScrollView scrollY enhanced showScrollbar={false}
            style={{ flex: 1, marginTop: detailHeaderH + 52, marginBottom: 64 }}
          >
            <View style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(() => {
                const grouped: Record<string, Bill[]> = {}
                detailFilteredBills.forEach(b => {
                  const date = (b.bill_date || '').split('T')[0]
                  if (!grouped[date]) grouped[date] = []
                  grouped[date].push(b)
                })
                const sortedDates = Object.keys(grouped).sort().reverse()

                if (!sortedDates.length) return (
                  <View style={{
                    borderRadius: 16, backgroundColor: '#FFFFFF', padding: 40, alignItems: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  >
                    <Text style={{ fontSize: 32 }}>📋</Text>
                    <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8, display: 'block' }}>暂无明细</Text>
                  </View>
                )

                return sortedDates.map(date => {
                  const items = grouped[date]
                  const dayOut = items.filter(i => !i.is_treat).reduce((s, i) => s + Math.abs(Number(i.amount)), 0)

                  return (
                    <View key={date} style={{
                      borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                    >
                      {/* 日期头 */}
                      <View style={{
                        paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14,
                        display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        backgroundColor: '#FAFBFC',
                      }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', display: 'block' }}>{getDayLabel(date)}</Text>
                        <Text style={{ fontSize: 12, color: '#9CA3AF', display: 'block' }}>¥{dayOut.toFixed(2)}</Text>
                      </View>
                      {/* 账单项 */}
                      {items.map((bill, bi) => {
                        const cc = getCategoryConfig(bill.category)
                        const IconComp = cc.icon
                        const amt = Number(bill.amount)
                        return (
                          <View key={`${bill.id}-${bi}`} style={{
                            paddingTop: 11, paddingBottom: 11, paddingLeft: 14, paddingRight: 14,
                            display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10,
                            borderBottomWidth: bi < items.length - 1 ? 0.5 : 0, borderBottomColor: '#F3F4F6',
                          }}
                          >
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: cc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <IconComp size={16} color={cc.color} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ fontSize: 14, color: '#1F2937', display: 'block' }}>{bill.name}</Text>
                              <Text style={{ fontSize: 11, color: '#9CA3AF', display: 'block', marginTop: 1 }}>
                                {[bill.payer, bill.note].filter(Boolean).join(' · ')}
                              </Text>
                            </View>
                            <Text style={{
                              fontSize: 15, fontWeight: '600',
                              color: bill.is_treat ? '#D97706' : '#1F2937', flexShrink: 0,
                            }}
                            >
                              ¥{Math.abs(amt).toFixed(2)}
                            </Text>
                          </View>
                        )
                      })}
                    </View>
                  )
                })
              })()}
            </View>
          </ScrollView>
        </>
      )}

      {/* ==================== 统计 Tab ==================== */}
      {activeTab === 'chart' && (
        <>
          {/* 固定Header */}
          <View style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
          }}
          >
            <View style={{
              paddingTop: statusBarH, height: capsuleBottom,
              paddingLeft: 16, paddingRight: 16,
              display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}
            >
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>支出分析</Text>
              {renderTimePills()}
            </View>
            {/* 金额行 */}
            <View style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 14 }}>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', display: 'block' }}>共支出</Text>
              <Text style={{ fontSize: 28, fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                ¥{totalExpense.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* 滚动内容 */}
          <ScrollView scrollY enhanced showScrollbar={false}
            style={{ flex: 1, marginTop: chartHeaderH, marginBottom: 64 }}
          >
            <View style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 支出构成卡片 */}
              <View style={{
                borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: 14 }}>💰 支出构成</Text>

                {categoryStats.length > 0 ? (
                  <>
                    {/* 改进环形图：使用 Canvas 方式绘制正圆 */}
                    <View style={{ alignItems: 'center', marginBottom: 18 }}>
                      <View style={{
                        width: 160, height: 160, borderRadius: 80,
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                      >
                        {/* 外圈 conic-gradient */}
                        <View style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          borderRadius: 80,
                          background: pieData.length > 0
                            ? `conic-gradient(${pieData.map(d => `${d.color} ${d.angle}%`).join(', ')})`
                            : '#E5E7EB',
                        }}
                        />
                        {/* 内圆遮罩形成环形 */}
                        <View style={{
                          position: 'absolute',
                          top: 38, left: 38, right: 38, bottom: 38,
                          borderRadius: 42,
                          backgroundColor: '#FFFFFF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        >
                          <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>共</Text>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>
                              {categoryStats.length}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>类</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* 分类排行列表（紧凑版） */}
                    <View style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {categoryStats.map((cat, idx) => {
                        const cfg = getCategoryConfig(cat.name)
                        const IconComp = cfg.icon
                        const pct = maxCatAmount > 0 ? (cat.amount / maxCatAmount) * 100 : 0
                        const pieColor = pieData[idx]?.color || PIE_COLORS[0]
                        return (
                          <View key={cat.name} style={{
                            display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10,
                            paddingTop: 6, paddingBottom: 6,
                          }}
                          >
                            {/* 图标圆 */}
                            <View style={{
                              width: 32, height: 32, borderRadius: 16,
                              backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}
                            >
                              <IconComp size={14} color={cfg.color} />
                            </View>
                            {/* 名称+占比 */}
                            <View style={{ width: 50, flexShrink: 0 }}>
                              <Text style={{ fontSize: 13, color: '#374151' }}>{cat.name}</Text>
                              <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{pieData[idx]?.percent || 0}%</Text>
                            </View>
                            {/* 进度条 */}
                            <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
                              <View style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: pieColor }} />
                            </View>
                            {/* 金额 */}
                            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>¥{cat.amount.toFixed(2)}</Text>
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 24 }}>
                    <Text style={{ fontSize: 36 }}>📊</Text>
                    <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8, display: 'block' }}>暂无数据</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </>
      )}

      {/* ==================== 地图 Tab ==================== */}
      {activeTab === 'map' && (
        <>
          <View style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)' }}>
            <View style={{ paddingTop: statusBarH, height: capsuleBottom, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>目的地地图</Text>
            </View>
          </View>

          <ScrollView scrollY enhanced showScrollbar={false}
            style={{ flex: 1, marginTop: mapHeaderH, marginBottom: 64 }}
          >
            <View style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <View style={{ borderRadius: 16, backgroundColor: '#EFF6FF', padding: 20, minHeight: 280, position: 'relative' }}>
                <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
                  {destinationList.length > 0 ? (
                    <View style={{ position: 'relative', width: '100%', height: 240 }}>
                      {destinationList.slice(0, 12).map((dest, i) => {
                        const info = dest.info
                        const rawLng = info?.lng || (80 + (i % 6) * 10)
                        const rawLat = info?.lat || (20 + Math.floor(i / 6) * 10)
                        const x = ((rawLng - 70) / 66) * 85 + 5
                        const y = ((55 - rawLat) / 38) * 75 + 5
                        return (
                          <View key={`marker-${dest.city}-${i}`} style={{ position: 'absolute', left: `${x}%`, top: `${y}%` }}>
                            <View style={{ alignItems: 'center' }}>
                              <View style={{
                                width: dest.amount > 0 ? 10 : 6, height: dest.amount > 0 ? 10 : 6,
                                borderRadius: dest.amount > 0 ? 5 : 3,
                                backgroundColor: dest.amount > 0 ? THEME.primary : '#CCC',
                                borderWidth: dest.amount > 0 ? 2 : 0, borderColor: '#FFF',
                              }}
                              />
                              {(i < 6 || dest.amount > 0) && (
                                <Text style={{ fontSize: 9, color: '#374151', marginTop: 2, whiteSpace: 'nowrap' }}>{dest.city}</Text>
                              )}
                            </View>
                          </View>
                        )
                      })}
                      {destinationList.filter(d => !d.info).slice(0, 6).map((dest, i) => {
                        const positions = [
                          { x: 25, y: 35 }, { x: 55, y: 25 }, { x: 75, y: 45 },
                          { x: 35, y: 60 }, { x: 60, y: 65 }, { x: 80, y: 30 },
                        ]
                        const pos = positions[i % positions.length]
                        return (
                          <View key={`fallback-${dest.city}-${i}`} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%` }}>
                            <View style={{ alignItems: 'center' }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB', borderWidth: 1.5, borderColor: '#FFF' }} />
                              <Text style={{ fontSize: 9, color: '#9CA3AF', marginTop: 1, whiteSpace: 'nowrap' }}>{dest.city}</Text>
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <MapIcon size={44} color="#C7D2FE" />
                      <Text style={{ fontSize: 14, color: '#94A3B8', marginTop: 12, display: 'block' }}>暂无目的地数据</Text>
                      <Text style={{ fontSize: 12, color: '#CBD5E1', marginTop: 4, display: 'block' }}>请在项目中设置目的地</Text>
                    </View>
                  )}
                </View>
              </View>

              {destinationList.length > 0 && (
                <View style={{ borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: 10 }}>📍 目的地花费</Text>
                  {destinationList.map((dest, i) => (
                    <View key={dest.city}
                      style={{
                        display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingTop: 9, paddingBottom: 9,
                        borderBottomWidth: i < destinationList.length - 1 ? 0.5 : 0,
                        borderBottomColor: '#F3F4F6',
                      }}
                    >
                      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: i < 3 ? THEME.primary : '#9CA3AF', width: 20 }}>#{i + 1}</Text>
                        <Text style={{ fontSize: 14, color: '#374151', display: 'block' }}>{dest.city}</Text>
                        <Text style={{ fontSize: 11, color: '#9CA3AF', display: 'block' }}>{dest.info?.province || ''}{dest.count > 1 ? ` (${dest.count}笔)` : ''}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>¥{dest.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </>
      )}

      {/* 底部Tab */}
      {renderBottomTabs()}
    </View>
  )
}

export default StatsPage