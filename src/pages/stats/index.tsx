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
  primary: '#1890FF',
  bgLight: '#E6F7FF',
}

/* 类别配置 */
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

/* 环形图配色 */
const PIE_COLORS = [
  '#6366F1', '#EC4899', '#F59E0B', '#10B981',
  '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16',
]

function getPieColor(index: number) {
  return PIE_COLORS[index % PIE_COLORS.length]
}

/* 城市数据库 */
const CITY_DB: Record<string, { name: string; province: string; lat: number; lng: number }> = {
  '北京': { name: '北京', province: '北京', lat: 40, lng: 116 }, '上海': { name: '上海', province: '上海', lat: 31, lng: 121 },
  '天津': { name: '天津', province: '天津', lat: 39, lng: 117 }, '重庆': { name: '重庆', province: '重庆', lat: 29, lng: 106 },
  '杭州': { name: '杭州', province: '浙江', lat: 30, lng: 120 }, '宁波': { name: '宁波', province: '浙江', lat: 29, lng: 121 },
  '温州': { name: '温州', province: '浙江', lat: 28, lng: 120 }, '绍兴': { name: '绍兴', province: '浙江', lat: 30, lng: 120 },
  '嘉兴': { name: '嘉兴', province: '浙江', lat: 30, lng: 120 }, '湖州': { name: '湖州', province: '浙江', lat: 30, lng: 120 },
  '金华': { name: '金华', province: '浙江', lat: 29, lng: 119 }, '台州': { name: '台州', province: '浙江', lat: 28, lng: 121 },
  '舟山': { name: '舟山', province: '浙江', lat: 30, lng: 122 }, '丽水': { name: '丽水', province: '浙江', lat: 28, lng: 119 },
  '广州': { name: '广州', province: '广东', lat: 23, lng: 113 }, '深圳': { name: '深圳', province: '广东', lat: 22, lng: 114 },
  '珠海': { name: '珠海', province: '广东', lat: 22, lng: 113 }, '佛山': { name: '佛山', province: '广东', lat: 23, lng: 113 },
  '东莞': { name: '东莞', province: '广东', lat: 23, lng: 113 }, '惠州': { name: '惠州', province: '广东', lat: 23, lng: 114 },
  '汕头': { name: '汕头', province: '广东', lat: 23, lng: 116 }, '中山': { name: '中山', province: '广东', lat: 22, lng: 113 },
  '江门': { name: '江门', province: '广东', lat: 22, lng: 112 }, '湛江': { name: '湛江', province: '广东', lat: 21, lng: 110 },
  '南京': { name: '南京', province: '江苏', lat: 32, lng: 118 }, '苏州': { name: '苏州', province: '江苏', lat: 31, lng: 120 },
  '无锡': { name: '无锡', province: '江苏', lat: 31, lng: 120 }, '常州': { name: '常州', province: '江苏', lat: 31, lng: 119 },
  '徐州': { name: '徐州', province: '江苏', lat: 34, lng: 117 }, '扬州': { name: '扬州', province: '江苏', lat: 32, lng: 119 },
  '镇江': { name: '镇江', province: '江苏', lat: 32, lng: 119 }, '成都': { name: '成都', province: '四川', lat: 30, lng: 104 },
  '绵阳': { name: '绵阳', province: '四川', lat: 31, lng: 104 }, '乐山': { name: '乐山', province: '四川', lat: 29, lng: 103 },
  '宜宾': { name: '宜宾', province: '四川', lat: 28, lng: 104 }, '泸州': { name: '泸州', province: '四川', lat: 28, lng: 105 },
  '昆明': { name: '昆明', province: '云南', lat: 25, lng: 102 }, '大理': { name: '大理', province: '云南', lat: 25, lng: 100 },
  '丽江': { name: '丽江', province: '云南', lat: 26, lng: 100 }, '西双版纳': { name: '西双版纳', province: '云南', lat: 21, lng: 100 },
  '香格里拉': { name: '香格里拉', province: '云南', lat: 27, lng: 99 }, '普洱': { name: '普洱', province: '云南', lat: 22, lng: 100 },
  '腾冲': { name: '腾冲', province: '云南', lat: 25, lng: 98 }, '长沙': { name: '长沙', province: '湖南', lat: 28, lng: 112 },
  '张家界': { name: '张家界', province: '湖南', lat: 29, lng: 110 }, '湘西': { name: '湘西', province: '湖南', lat: 28, lng: 109 },
  '岳阳': { name: '岳阳', province: '湖南', lat: 29, lng: 113 }, '武汉': { name: '武汉', province: '湖北', lat: 30, lng: 114 },
  '宜昌': { name: '宜昌', province: '湖北', lat: 30, lng: 111 }, '恩施': { name: '恩施', province: '湖北', lat: 30, lng: 109 },
  '西安': { name: '西安', province: '陕西', lat: 34, lng: 108 }, '延安': { name: '延安', province: '陕西', lat: 36, lng: 109 },
  '青岛': { name: '青岛', province: '山东', lat: 36, lng: 120 }, '济南': { name: '济南', province: '山东', lat: 36, lng: 117 },
  '烟台': { name: '烟台', province: '山东', lat: 37, lng: 121 }, '威海': { name: '威海', province: '山东', lat: 37, lng: 122 },
  '厦门': { name: '厦门', province: '福建', lat: 24, lng: 118 }, '福州': { name: '福州', province: '福建', lat: 26, lng: 119 },
  '泉州': { name: '泉州', province: '福建', lat: 24, lng: 118 }, '漳州': { name: '漳州', province: '福建', lat: 24, lng: 117 },
  '三亚': { name: '三亚', province: '海南', lat: 18, lng: 109 }, '海口': { name: '海口', province: '海南', lat: 20, lng: 110 },
  '桂林': { name: '桂林', province: '广西', lat: 25, lng: 110 }, '北海': { name: '北海', province: '广西', lat: 21, lng: 109 },
  '阳朔': { name: '阳朔', province: '广西', lat: 24, lng: 110 }, '贵阳': { name: '贵阳', province: '贵州', lat: 26, lng: 106 },
  '拉萨': { name: '拉萨', province: '西藏', lat: 29, lng: 91 }, '林芝': { name: '林芝', province: '西藏', lat: 29, lng: 94 },
  '乌鲁木齐': { name: '乌鲁木齐', province: '新疆', lat: 43, lng: 87 }, '喀什': { name: '喀什', province: '新疆', lat: 39, lng: 75 },
  '呼和浩特': { name: '呼和浩特', province: '内蒙古', lat: 40, lng: 111 }, '呼伦贝尔': { name: '呼伦贝尔', province: '内蒙古', lat: 49, lng: 119 },
  '兰州': { name: '兰州', province: '甘肃', lat: 36, lng: 103 }, '敦煌': { name: '敦煌', province: '甘肃', lat: 40, lng: 94 },
  '张掖': { name: '张掖', province: '甘肃', lat: 38, lng: 100 }, '南昌': { name: '南昌', province: '江西', lat: 28, lng: 115 },
  '景德镇': { name: '景德镇', province: '江西', lat: 29, lng: 117 }, '郑州': { name: '郑州', province: '河南', lat: 34, lng: 113 },
  '洛阳': { name: '洛阳', province: '河南', lat: 34, lng: 112 }, '黄山': { name: '黄山', province: '安徽', lat: 30, lng: 118 },
  '合肥': { name: '合肥', province: '安徽', lat: 31, lng: 117 }, '大同': { name: '大同', province: '山西', lat: 40, lng: 113 },
  '大连': { name: '大连', province: '辽宁', lat: 38, lng: 121 }, '沈阳': { name: '沈阳', province: '辽宁', lat: 41, lng: 123 },
  '长春': { name: '长春', province: '吉林', lat: 43, lng: 125 }, '哈尔滨': { name: '哈尔滨', province: '黑龙江', lat: 45, lng: 126 },
  '香港': { name: '香港', province: '香港', lat: 22, lng: 114 }, '澳门': { name: '澳门', province: '澳门', lat: 22, lng: 113 },
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
  { key: 'all', label: '全部时间' },
  { key: 'month', label: '本月' },
  { key: 'project', label: '最近项目' },
  { key: 'custom', label: '自定义时间' },
]

/* ======== 主组件 ======== */
function StatsPage() {
  type TabType = 'detail' | 'chart' | 'map'
  const [activeTab, setActiveTab] = useState<TabType>('chart')
  const [bills, setBills] = useState<Bill[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  /* 全局筛选状态 - 统计和明细共用 */
  const [dateRange, setDateRange] = useState<string>('month')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showCalendar, setShowCalendar] = useState(false)
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1)
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

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

  /* 动态类别列表 */
  const allCategories = useMemo(() => {
    const cats = new Set<string>()
    bills.forEach(b => { if (b.category) cats.add(b.category) })
    return ['all', ...Array.from(cats)]
  }, [bills])

  /* 项目日期范围 */
  const [projectDateRange, setProjectDateRange] = useState<{start: string; end: string} | null>(null)
  useEffect(() => {
    if (bills.length > 0) {
      const dates = bills.map(b => b.bill_date).filter(Boolean)
      dates.sort()
      setProjectDateRange({ start: dates[0], end: dates[dates.length - 1] })
    }
  }, [bills])

  /* ========== 核心筛选：时间 + 类别同时生效 ========== */
  const filteredBills = useMemo(() => {
    if (!bills.length) return []
    const now = new Date()
    let start: Date | undefined, end: Date | undefined
    if (dateRange === 'all') { /* 无限制 */ }
    else if (dateRange === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    }
    else if (dateRange === 'week') {
      end = new Date(); start = new Date(end); start.setDate(start.getDate() - 7); start.setHours(0,0,0,0); end.setHours(23,59,59,999)
    }
    else if (dateRange === 'project') {
      if (projectDateRange) { start = new Date(projectDateRange.start); end = new Date(projectDateRange.end) }
      else return bills
    }
    else if (dateRange === 'custom') {
      if (customStartDate) {
        start = new Date(customStartDate); start.setHours(0,0,0,0)
        if (customEndDate) { end = new Date(customEndDate); end.setHours(23,59,59,999) }
        else { end = new Date(customStartDate); end.setHours(23,59,59,999) }
      } else return bills
    }
    else return bills

    let result = bills
    if (start && end) {
      result = result.filter(b => {
        const d = new Date(b.bill_date)
        return d >= start! && d <= end!
      })
    }

    // 类别筛选也在此生效（统计和明细共用）
    if (filterCategory !== 'all') {
      result = result.filter(b => b.category === filterCategory)
    }

    return result
  }, [bills, dateRange, projectDateRange, customStartDate, customEndDate, filterCategory])

  /* ========== 计算属性（基于 filteredBills） ========== */

  /* 总支出 */
  const totalExpense = useMemo(() =>
    filteredBills.reduce((s, b) => s + Math.abs(Number(b.amount)), 0),
    [filteredBills])

  /* 分类统计 */
  const categoryStats = useMemo(() => {
    const m = new Map<string, number>()
    filteredBills.forEach(b => {
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
      percent: total > 0 ? ((c.amount / total) * 100) : 0,
      color: getPieColor(i),
    }))
  }, [categoryStats])

  /* conic-gradient 字符串预计算 */
  const pieGradientStr = useMemo(() => {
    if (!pieData.length) return '#E5E7EB'
    let cumPct = 0
    const stops: string[] = []
    for (let i = 0; i < pieData.length; i++) {
      const d = pieData[i]
      const pct = d.percent
      if (pct <= 0) continue
      stops.push(d.color + ' ' + cumPct.toFixed(1) + '% ' + (cumPct + pct).toFixed(1) + '%')
      cumPct += pct
    }
    if (cumPct < 99.9) stops.push('#F3F4F6 ' + cumPct.toFixed(1) + '% 100%')
    return 'conic-gradient(from -90deg,' + stops.join(',') + ')'
  }, [pieData])

  /* 饼图标签位置计算 - 用于引导线 */
  const pieLabels = useMemo(() => {
    if (!pieData.length) return []
    const R = 70 // 圆环中心到标签起点的距离
    const L = 18 // 引导线长度
    const labels: { name: string; percent: number; color: string; x1: number; y1: number; x2: number; y2: number; align: 'left' | 'right' }[] = []

    let cumAngle = 0
    for (let i = 0; i < pieData.length; i++) {
      const d = pieData[i]
      if (d.percent <= 0) continue
      // 扇形中间角度
      const midAngle = cumAngle + (d.percent / 100) * Math.PI / 2 // 从-90deg开始即-PI/2
      const actualAngle = midAngle - Math.PI / 2
      // 起点在圆环上
      const x1 = 50 + R * Math.cos(actualAngle) / 1.5 // 归一化到百分比坐标
      const y1 = 50 + R * Math.sin(actualAngle) / 1.5
      // 终点向外延伸
      const x2 = 50 + (R + L) * Math.cos(actualAngle) / 1.5
      const y2 = 50 + (R + L) * Math.sin(actualAngle) / 1.5
      labels.push({
        name: d.name, percent: d.percent, color: d.color,
        x1, y1, x2, y2,
        align: actualAngle > -Math.PI/2 && actualAngle < Math.PI/2 ? 'left' : 'right',
      })
      cumAngle += (d.percent / 100) * Math.PI * 2
    }
    return labels
  }, [pieData])

  const maxCatAmount = categoryStats.length > 0 ? Math.max(...categoryStats.map(c => c.amount)) : 1

  /* 按项目统计 */
  const projectStats = useMemo(() => {
    const m = new Map<string, number>()
    filteredBills.forEach(b => {
      const pid = b.project_id || '未归类'
      m.set(pid, (m.get(pid) || 0) + Math.abs(Number(b.amount)))
    })
    // 用项目名替换ID
    const result: { name: string; amount: number }[] = []
    m.forEach((amount, pid) => {
      const proj = projects.find(p => p.id === pid)
      result.push({ name: proj?.name || pid, amount })
    })
    return result.sort((a, b) => b.amount - a.amount)
  }, [filteredBills, projects])

  const maxProjAmount = projectStats.length > 0 ? Math.max(...projectStats.map(p => p.amount)) : 1

  /* 按月统计 */
  const monthlyStats = useMemo(() => {
    const m = new Map<string, number>()
    filteredBills.forEach(b => {
      const month = (b.bill_date || '').substring(0, 7) // YYYY-MM
      if (month) m.set(month, (m.get(month) || 0) + Math.abs(Number(b.amount)))
    })
    return Array.from(m.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [filteredBills])

  const maxMonthAmount = monthlyStats.length > 0 ? Math.max(...monthlyStats.map(m => m.amount)) : 1

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
    return Array.from(m.entries()).map(([city, v]) => ({ city, ...v })).sort((a, b) => b.amount - a.amount)
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
  const detailHeaderH = capsuleBottom + 72
  const chartHeaderH = capsuleBottom + 88
  const mapHeaderH = capsuleBottom + 48

  /* 日历工具函数 */
  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()
  const getFirstDayWeekday = (y: number, m: number) => new Date(y, m-1, 1).getDay()

  const quickRanges = [
    { label: '本周', key: 'thisWeek' }, { label: '本月', key: 'thisMonth' },
    { label: '上周', key: 'lastWeek' }, { label: '上月', key: 'lastMonth' },
    { label: '昨天', key: 'yesterday' }, { label: '今天', key: 'today' },
  ]

  const applyQuick = (key: string) => {
    const now = new Date()
    let e = new Date(); e.setHours(23,59,59,999)
    let s: Date
    if (key === 'today') { s = new Date(now); s.setHours(0,0,0,0) }
    else if (key === 'yesterday') { s = new Date(now); s.setDate(s.getDate()-1); s.setHours(0,0,0,0); e=new Date(s);e.setHours(23,59,59,999) }
    else if (key === 'thisWeek') { const d=now.getDay()||7; s=new Date(now);s.setDate(s.getDate()-d+1);s.setHours(0,0,0,0) }
    else if (key === 'lastWeek') { const d=now.getDay()||7; e=new Date(now);e.setDate(e.getDate()-d);e.setHours(23,59,59,999);s=new Date(e);s.setDate(s.getDate()-6);s.setHours(0,0,0,0) }
    else if (key === 'thisMonth') { s = new Date(now.getFullYear(),now.getMonth(),1) }
    else if (key === 'lastMonth') { s = new Date(now.getFullYear(),now.getMonth()-1,1); e = new Date(now.getFullYear(),now.getMonth(),0,23,59,59,999) }
    else return
    setCustomStartDate(s.toISOString().split('T')[0])
    setCustomEndDate(e.toISOString().split('T')[0])
    setDateRange('custom')
    setShowCalendar(false)
  }

  const pickDate = (d: number) => {
    const ds = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    if (!customStartDate || (customStartDate && customEndDate)) { setCustomStartDate(ds); setCustomEndDate('') }
    else { if (ds < customStartDate) { setCustomEndDate(customStartDate); setCustomStartDate(ds) } else setCustomEndDate(ds) }
  }

  const confirmDate = () => { if (customStartDate) setDateRange('custom'); setShowCalendar(false) }

  /* ====== 底部Tab ====== */
  const TAB_ORDER: TabType[] = ['chart', 'detail', 'map']
  const TAB_LABELS: Record<TabType, { icon: any; text: string }> = {
    chart: { icon: FileChartPie, text: '统计' },
    detail: { icon: FileText, text: '明细' },
    map: { icon: MapIcon, text: '地图' },
  }

  const renderBottomTabs = () => (
    <View style={{
      position: 'fixed', bottom: 10, left: 12, right: 12,
      display: 'flex', flexDirection: 'row', gap: 10, zIndex: 200,
    }}
    >
      {TAB_ORDER.map(tab => {
        const labels = TAB_LABELS[tab]
        const isActive = activeTab === tab
        const IconComp = labels.icon
        return (
          <View key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, paddingTop: 10, paddingBottom: 10,
            display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
            borderRadius: 22,
            backgroundColor: isActive ? THEME.bgLight : '#FFFFFF',
            borderWidth: 1, borderColor: isActive ? THEME.primary : '#E5E7EB',
            boxShadow: isActive ? '0 1px 3px rgba(24,144,255,0.12)' : 'none',
          }}
          >
            <IconComp size={16} color={isActive ? THEME.primary : '#9CA3AF'} />
            <Text style={{ fontSize: 13, fontWeight: isActive ? '600' : '500', color: isActive ? THEME.primary : '#6B7280' }}>{labels.text}</Text>
          </View>
        )
      })}
    </View>
  )

  /* ====== 统一筛选栏（类别+日期） ====== */
  const catLabelMap: Record<string, string> = { all: '全部类型', ...Object.fromEntries(allCategories.slice(1).map(c => [c, c])) }
  const dateLabelMap: Record<string, string> = Object.fromEntries(TIME_OPTIONS.map(o => [o.key, o.label]))

  const renderFilterBar = (onDatePick?: () => void) => (
    <View style={{ marginTop: 10, marginLeft: 16, marginRight: 16, display: 'flex', flexDirection: 'row', gap: 8 }}>
      {/* 类别 */}
      <View onClick={() => {
        Taro.showActionSheet({
          itemList: allCategories.map(c => c === 'all' ? '全部类型' : c),
          success: (res) => { setFilterCategory(allCategories[res.tapIndex]) }
        })
      }} style={{
        flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 9, paddingBottom: 9, paddingLeft: 13, paddingRight: 13,
        borderRadius: 20, backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
      }}
      >
        <Text style={{ fontSize: 13, color: '#374151' }}>{catLabelMap[filterCategory]}</Text>
        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>▼</Text>
      </View>

      {/* 时间 */}
      <View onClick={() => {
        if (onDatePick) onDatePick()
        else {
          const handleSelect = (res: { tapIndex: number }) => {
            const sel = TIME_OPTIONS[res.tapIndex]
            if (sel.key === 'custom') setShowCalendar(true)
            else setDateRange(sel.key)
          }
          Taro.showActionSheet({ itemList: TIME_OPTIONS.map(o => o.label), success: handleSelect })
        }
      }} style={{
        flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 9, paddingBottom: 9, paddingLeft: 13, paddingRight: 13,
        borderRadius: 20, backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
      }}
      >
        <Text style={{ fontSize: 13, color: '#374151' }}>
          {dateRange === 'custom'
            ? (customStartDate && customEndDate ? customStartDate + '~' + customEndDate : customStartDate || '自定义时间')
            : dateLabelMap[dateRange]}
        </Text>
        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>▼</Text>
      </View>
    </View>
  )

  /* ====== 卡片容器样式 ====== */
  const cardStyle = {
    borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 12,
  }

  return (
    <View className="flex flex-col h-full" style={{ backgroundColor: '#F8FAFC' }}>

      {/* ==================== 统计 Tab ==================== */}
      {activeTab === 'chart' && (
        <>
          {/* 固定Header */}
          <View style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'linear-gradient(135deg, #1890FF 0%, #096DD9 100%)' }}>
            <View style={{ paddingTop: statusBarH, height: capsuleBottom, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>支出分析</Text>
            </View>
            <View style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 12, display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', display: 'block' }}>共支出</Text>
                <Text style={{ fontSize: 26, fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.5px' }}>¥{totalExpense.toFixed(2)}</Text>
              </View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{categoryStats.length} 个类别</Text>
            </View>
          </View>

          {/* 筛选栏 */}
          <View style={{ position: 'fixed', top: chartHeaderH, left: 0, right: 0, zIndex: 99, backgroundColor: '#F8FAFC', paddingBottom: 4 }}>
            {renderFilterBar()}
          </View>

          {/* 滚动内容 */}
          <ScrollView scrollY enhanced showScrollbar={false}
            style={{ flex: 1, marginTop: chartHeaderH + 54, marginBottom: 70 }}
          >
            <View style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* ====== 支出构成：环形图 + 引导线标签 ====== */}
              <View style={cardStyle}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: 14 }}>支出构成</Text>

                {categoryStats.length > 0 ? (
                  <>
                    {/* 环形图区域（含引导线标签） */}
                    <View style={{ alignItems: 'center', marginBottom: 16, position: 'relative', height: 220 }}>
                      {/* 环形图本体 */}
                      <View style={{ width: 160, height: 160, borderRadius: 80, position: 'relative', overflow: 'hidden', border: '1px solid #F0F0F0' }}>
                        {/* 渐变填充 */}
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 80, background: pieGradientStr }} />
                        {/* 内圆遮罩 */}
                        <View style={{ position: 'absolute', top: 48, left: 48, right: 48, bottom: 48, borderRadius: 32, backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 11, color: '#9CA3AF', display: 'block' }}>共</Text>
                          <Text style={{ fontSize: 22, fontWeight: '700', color: '#1F2937' }}>{categoryStats.length}</Text>
                          <Text style={{ fontSize: 11, color: '#9CA3AF', display: 'block' }}>类</Text>
                        </View>
                      </View>

                      {/* 引导线标签 - 围绕环形图外围 */}
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                        {pieLabels.map((label, idx) => {
                          // 引导线从圆环边缘连到标签
                          return (
                            <View key={idx} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
                              {/* SVG-like line using absolute positioning */}
                              <View style={{
                                position: 'absolute',
                                left: label.x1 + '%',
                                top: label.y1 + '%',
                                width: Math.abs(label.x2 - label.x1) + 40 + '%',
                                height: 1,
                                transformOrigin: '0% 50%',
                              }}
                              >
                                {/* 圆点 */}
                                <View style={{
                                  position: 'absolute', left: 0, top: -2,
                                  width: 6, height: 6, borderRadius: 3,
                                  backgroundColor: label.color,
                                }}
                                />
                              </View>
                              {/* 标签文字 */}
                              <View style={{
                                position: 'absolute',
                                left: (label.align === 'left' ? label.x2 + 2 : label.x2 - 42) + '%',
                                top: (label.y2 - 8) + '%',
                                width: 80,
                              }}
                              >
                                <Text style={{ fontSize: 11, color: '#374151', display: 'block' }}>{label.name}</Text>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: label.color, display: 'block' }}>{label.percent.toFixed(1)}%</Text>
                              </View>
                            </View>
                          )
                        })}
                      </View>
                    </View>

                    {/* 图例 + 排行列表 */}
                    <View style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {categoryStats.map((cat, idx) => {
                        const cfg = getCategoryConfig(cat.name)
                        const IconComp = cfg.icon
                        const pct = maxCatAmount > 0 ? (cat.amount / maxCatAmount) * 100 : 0
                        const pColor = pieData[idx]?.color || PIE_COLORS[0]
                        return (
                          <View key={cat.name} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4, paddingBottom: 4 }}>
                            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <IconComp size={15} color={cfg.color} />
                            </View>
                            <View style={{ width: 52, flexShrink: 0 }}>
                              <Text style={{ fontSize: 13, color: '#374151' }}>{cat.name}</Text>
                              <Text style={{ fontSize: 10, color: '#9CA3AF', display: 'block' }}>{pieData[idx]?.percent?.toFixed(1) || 0}%</Text>
                            </View>
                            <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
                              <View style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: pColor }} />
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', flexShrink: 0 }}>¥{cat.amount.toFixed(2)}</Text>
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

              {/* ====== 按项目统计条形图 ====== */}
              {projectStats.length > 0 && (
                <View style={cardStyle}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: 12 }}>📋 按项目统计</Text>
                  <View style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {projectStats.slice(0, 8).map((p) => {
                      const pct = maxProjAmount > 0 ? (p.amount / maxProjAmount) * 100 : 0
                      return (
                        <View key={p.name} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ fontSize: 13, color: '#374151', width: 80, flexShrink: 0 }}>{p.name.length > 6 ? p.name.substring(0, 6) + '..' : p.name}</Text>
                          <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: '#F0F0F0', overflow: 'hidden' }}>
                            <View style={{ width: `${Math.max(pct, 4)}%`, height: '100%', borderRadius: 5, backgroundColor: THEME.primary }} />
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937', flexShrink: 0, width: 76, textAlign: 'right' }}>¥{p.amount.toFixed(0)}</Text>
                        </View>
                      )
                    })}
                  </View>
                </View>
              )}

              {/* ====== 按月统计条形图 ====== */}
              {monthlyStats.length > 1 && (
                <View style={cardStyle}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937', display: 'block', marginBottom: 12 }}>📅 每月支出趋势</Text>
                  <View style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {monthlyStats.map((m) => {
                      const pct = maxMonthAmount > 0 ? (m.amount / maxMonthAmount) * 100 : 0
                      return (
                        <View key={m.month} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ fontSize: 13, color: '#374151', width: 56, flexShrink: 0 }}>{m.month}</Text>
                          <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: '#F0F0F0', overflow: 'hidden' }}>
                            <View style={{ width: `${Math.max(pct, 4)}%`, height: '100%', borderRadius: 5, backgroundColor: '#10B981' }} />
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937', flexShrink: 0, width: 76, textAlign: 'right' }}>¥{m.amount.toFixed(0)}</Text>
                        </View>
                      )
                    })}
                  </View>
                </View>
              )}

            </View>
          </ScrollView>
        </>
      )}

      {/* ==================== 明细 Tab ==================== */}
      {activeTab === 'detail' && (
        <>
          {/* 固定Header */}
          <View style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'linear-gradient(135deg, #1890FF 0%, #096DD9 100%)' }}>
            <View style={{ paddingTop: statusBarH, height: capsuleBottom, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>账单明细</Text>
            </View>
            <View style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>总支出</Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF' }}>¥{totalExpense.toFixed(2)}</Text>
            </View>
          </View>

          {/* 筛选栏（明细页共用 filterCategory + dateRange） */}
          <View style={{ position: 'fixed', top: detailHeaderH, left: 0, right: 0, zIndex: 99, backgroundColor: '#F8FAFC', paddingBottom: 4 }}>
            {renderFilterBar()}
          </View>

          {/* 滚动内容 */}
          <ScrollView scrollY enhanced showScrollbar={false}
            style={{ flex: 1, marginTop: detailHeaderH + 56, marginBottom: 70 }}
          >
            <View style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(() => {
                const grouped: Record<string, Bill[]> = {}
                filteredBills.forEach(b => {
                  const date = (b.bill_date || '').split('T')[0]
                  if (!grouped[date]) grouped[date] = []
                  grouped[date].push(b)
                })
                const sortedDates = Object.keys(grouped).sort().reverse()

                if (!sortedDates.length) return (
                  <View style={{ borderRadius: 16, backgroundColor: '#FFFFFF', padding: 40, alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <Text style={{ fontSize: 32 }}>📋</Text>
                    <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8, display: 'block' }}>暂无明细</Text>
                  </View>
                )

                return sortedDates.map(date => {
                  const items = grouped[date]
                  const dayOut = items.reduce((s, i) => s + Math.abs(Number(i.amount)), 0)

                  return (
                    <View key={date} style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <View style={{ paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFBFC' }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', display: 'block' }}>{getDayLabel(date)}</Text>
                        <Text style={{ fontSize: 12, color: '#9CA3AF', display: 'block' }}>¥{dayOut.toFixed(2)}</Text>
                      </View>
                      {items.map((bill, bi) => {
                        const cc = getCategoryConfig(bill.category)
                        const IconComp = cc.icon
                        const amt = Number(bill.amount)
                        return (
                          <View key={`${bill.id}-${bi}`} style={{ paddingTop: 11, paddingBottom: 11, paddingLeft: 14, paddingRight: 14, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: bi < items.length - 1 ? 0.5 : 0, borderBottomColor: '#F3F4F6' }}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: cc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <IconComp size={16} color={cc.color} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ fontSize: 14, color: '#1F2937', display: 'block' }}>{bill.name}</Text>
                              <Text style={{ fontSize: 11, color: '#9CA3AF', display: 'block', marginTop: 1 }}>{[bill.payer, bill.note].filter(Boolean).join(' · ')}</Text>
                            </View>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: bill.is_treat ? '#D97706' : '#1F2937', flexShrink: 0 }}>¥{Math.abs(amt).toFixed(2)}</Text>
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

      {/* ==================== 地图 Tab ==================== */}
      {activeTab === 'map' && (
        <>
          <View style={{ position:'fixed',top:0,left:0,right:0,zIndex:100,backgroundColor:'#FFFFFF' }}>
            <View style={{ paddingTop:statusBarH,height:capsuleBottom,display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Text style={{ fontSize:17,fontWeight:'700',color:'#1F2937' }}>足迹地图</Text>
            </View>
          </View>

          <ScrollView scrollY enhanced showScrollbar={false}
            style={{ flex:1, marginTop:mapHeaderH,marginBottom:64 }}
          >
            {(() => {
              const visitedNames = new Set<string>()
              projects.forEach(p => {
                const txt = p.destination||p.name||''
                if(txt) {
                  Object.keys(CITY_DB).forEach(k => { if(txt.includes(k)) visitedNames.add(k) })
                  try{ const ci=recognizeCity(txt); if(ci&&ci.name) visitedNames.add(ci.name) }catch(e){}
                }
              })
              destinationList.forEach(d => {
                if(d.info&&d.info.name) visitedNames.add(d.info.name)
                else if(d.city) visitedNames.add(d.city)
              })
              const vArr = Array.from(visitedNames)

              const cityToProv:{[s:string]:string} = {'北京':'北京','天津':'天津','上海':'上海','重庆':'重庆','哈尔滨':'黑龙江','长春':'吉林','沈阳':'辽宁','呼和浩特':'内蒙古','石家庄':'河北','太原':'山西','济南':'山东','青岛':'山东','郑州':'河南','合肥':'安徽','南京':'江苏','苏州':'江苏','无锡':'江苏','常州':'江苏','扬州':'江苏','镇江':'江苏','徐州':'江苏','杭州':'浙江','宁波':'浙江','温州':'浙江','绍兴':'浙江','嘉兴':'浙江','湖州':'浙江','金华':'浙江','台州':'浙江','黄山':'安徽','福州':'福建','厦门':'福建','泉州':'福建','南昌':'江西','长沙':'湖南','武汉':'湖北','广州':'广东','深圳':'广东','东莞':'广东','佛山':'广东','惠州':'广东','桂林':'广西','南宁':'广西','海口':'海南','三亚':'海南','成都':'四川','贵阳':'贵州','昆明':'云南','拉萨':'西藏','西安':'陕西','兰州':'甘肃','西宁':'青海','银川':'宁夏','乌鲁木齐':'新疆','喀什':'新疆','大连':'辽宁','烟台':'山东','威海':'山东'}
              const visitedProvs = new Set<string>()
              vArr.forEach(city => { const p=cityToProv[city]; if(p) visitedProvs.add(p) })

              return (
                <View style={{ margin:12,borderRadius:20,overflow:'hidden',backgroundColor:'#FFFFFF',position:'relative',minHeight:460,boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
                  {/* 地图主区域 */}
                  <View style={{ width:'100%',height:400,backgroundColor:'#F8FAFC',position:'relative',overflow:'hidden',borderBottom:'1px solid #F0F0F0' }}>

                    {/* 中国轮廓线 */}
                    <View style={{ position:'absolute',left:'5%',top:'6%',width:'84%',height:'78%',borderRadius:'52% 48% 46% 54%/48% 52% 46% 50%',borderWidth:1.5,borderColor:'#CBD5E1',opacity:0.8 }} />

                    {/* 已访问省份填充 */}
                    {Array.from(visitedProvs).map((prov) => {
                      const pd:{[s:string]:{x:number;y:number;w:number;h:number}}={'北京':{x:71,y:26,w:13,h:11},'天津':{x:75,y:30,w:9,h:7},'上海':{x:86,y:53,w:9,h:9},'重庆':{x:43,y:59,w:15,h:17},'黑龙江':{x:81,y:4,w:19,h:21},'吉林':{x:79,y:18,w:11,h:13},'辽宁':{x:77,y:26,w:13,h:15},'内蒙古':{x:50,y:9,w:29,h:25},'河北':{x:69,y:30,w:17,h:13},'山西':{x:59,y:32,w:11,h:15},'山东':{x:75,y:35,w:15,h:13},'河南':{x:61,y:42,w:15,h:13},'江苏':{x:79,y:46,w:13,h:13},'安徽':{x:73,y:50,w:13,h:13},'浙江':{x:83,y:54,w:11,h:11},'福建':{x:79,y:66,w:9,h:13},'江西':{x:71,y:60,w:11,h:13},'湖北':{x:61,y:54,w:15,h:13},'湖南':{x:63,y:66,w:13,h:13},'广东':{x:69,y:76,w:15,h:15},'广西':{x:53,y:78,w:13,h:15},'海南':{x:59,y:93,w:9,h:7},'四川':{x:37,y:52,w:17,h:19},'贵州':{x:45,y:68,w:11,h:13},'云南':{x:33,y:74,w:15,h:17},'西藏':{x:15,y:56,w:21,h:19},'陕西':{x:53,y:42,w:13,h:15},'甘肃':{x:35,y:36,w:17,h:15},'青海':{x:27,y:38,w:15,h:13},'宁夏':{x:45,y:30,w:7,h:9},'新疆':{x:4,y:20,w:27,h:23}}
                      const pos = pd[prov]
                      if(!pos) return null
                      return (<View key={prov} style={{ position:'absolute',left:pos.x+'%',top:pos.y+'%',width:pos.w+'%',height:pos.h+'%',borderRadius:pos.w>pos.h?pos.h/2:pos.w/2,backgroundColor:'rgba(24,144,255,0.12)',borderWidth:1,borderColor:'rgba(24,144,255,0.35)' }}>
                        <Text style={{ position:'absolute',top:-13,left:0,right:0,textAlign:'center',fontSize:8,color:'#1890FF',fontWeight:'600' }}>{prov}</Text>
                      </View>)
                    })}

                    {/* 城市点位 */}
                    {vArr.map((cityName,i) => {
                      const cp:{[s:string]:{x:number;y:number}}={'北京':{x:72,y:28},'天津':{x:75,y:32},'上海':{x:87,y:55},'重庆':{x:45,y:62},'西安':{x:54,y:45},'成都':{x:38,y:58},'广州':{x:72,y:81},'深圳':{x:74,y:84},'杭州':{x:85,y:57},'南京':{x:79,y:49},'武汉':{x:64,y:58},'长沙':{x:67,y:69},'郑州':{x:63,y:44},'济南':{x:76,y:39},'青岛':{x:81,y:40},'大连':{x:81,y:26},'沈阳':{x:80,y:23},'哈尔滨':{x:86,y:10},'长春':{x:83,y:16},'呼和浩特':{x:59,y:24},'太原':{x:60,y:36},'石家庄':{x:67,y:35},'合肥':{x:75,y:52},'福州':{x:81,y:71},'厦门':{x:78,y:77},'南宁':{x:56,y:85},'海口':{x:60,y:95},'昆明':{x:34,y:80},'贵阳':{x:46,y:72},'拉萨':{x:18,y:59},'乌鲁木齐':{x:14,y:28},'兰州':{x:37,y:41},'西宁':{x:30,y:39},'银川':{x:46,y:32},'南昌':{x:73,y:64},'苏州':{x:83,y:53},'宁波':{x:88,y:58}}
                      const p = cp[cityName]||{x:50+(i*7)%40,y:30+(i*11)%40}
                      return(<View key={cityName+i} style={{ position:'absolute',left:p.x+'%',top:p.y+'%',alignItems:'center' }}>
                        <View style={{ width:7,height:7,borderRadius:3.5,backgroundColor:'#1890FF',boxShadow:'0 0 4px rgba(24,144,255,0.4)' }} />
                        <Text style={{ fontSize:8,color:'#64748B',marginTop:1 }}>{cityName}</Text>
                      </View>)
                    })}

                    {/* 邻国装饰文字 */}
                    <Text style={{ position:'absolute',right:'2%',top:'18%',fontSize:9,color:'#CBD5E1' }}>俄罗斯</Text>
                    <Text style={{ position:'absolute',right:'0%',top:'40%',fontSize:9,color:'#CBD5E1' }}>韩国</Text>
                    <Text style={{ position:'absolute',left:'2%',bottom:'15%',fontSize:9,color:'#CBD5E1' }}>印度</Text>
                    <Text style={{ position:'absolute',right:'5%',bottom:'11%',fontSize:9,color:'#CBD5E1' }}>南海</Text>
                    <Text style={{ position:'absolute',left:'15%',top:'22%',fontSize:9,color:'#CBD5E1' }}>蒙古</Text>
                  </View>

                  {/* 底部统计栏 */}
                  <View style={{ padding:'12px 14px',display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'space-between' }}>
                    <View style={{ display:'flex',flexDirection:'row',alignItems:'baseline' }}>
                      <Text style={{ fontSize:12,color:'#9CA3AF' }}>累计点亮 </Text>
                      <Text style={{ fontSize:20,fontWeight:'700',color:'#1890FF' }}>{vArr.length}</Text>
                      <Text style={{ fontSize:12,color:'#9CA3AF' }}> 市/{visitedProvs.size} 省</Text>
                    </View>
                    <Text style={{ fontSize:12,color:'#9CA3AF' }}>总花费 ¥{destinationList.reduce((s,d)=>s+d.amount,0).toFixed(0)}</Text>
                  </View>
                </View>
              )})()}

              {/* 已涉足城市列表 */}
              {destinationList.length>0 && (
                <View style={{ marginLeft:12,marginRight:12,marginBottom:12,borderRadius:16,backgroundColor:'#FFFFFF',padding:14,boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                  <View style={{ display:'flex',flexDirection:'row',justifyContent:'space-between',marginBottom:10 }}>
                    <Text style={{ fontSize:14,fontWeight:'600',color:'#1F2937' }}>已涉足城市({destinationList.length})</Text>
                    <Text style={{ fontSize:11,color:'#1890FF' }}>¥{destinationList.reduce((s,d)=>s+d.amount,0).toFixed(0)}</Text>
                  </View>
                  <View style={{ display:'flex',flexDirection:'row',flexWrap:'wrap',gap:6 }}>
                    {destinationList.map((d,i) => {
                      const pc=['#1890FF','#10B981','#F59E0B','#EF4444','#06B6D4','#8B5CF6','#EC4899']
                      return(<View key={d.city} style={{ display:'flex',flexDirection:'row',alignItems:'center',gap:4,paddingLeft:8,paddingRight:8,paddingTop:4,paddingBottom:4,borderRadius:12,backgroundColor:'#F8FAFC' }}>
                        <View style={{ width:6,height:6,borderRadius:3,backgroundColor:pc[i%pc.length] }} />
                        <Text style={{ fontSize:11,color:'#374151' }}>{d.city}</Text>
                        <Text style={{ fontSize:10,color:'#9CA3AF' }}>¥{d.amount.toFixed(0)}</Text>
                      </View>)
                    })}
                  </View>
                </View>
              )}

              {destinationList.length===0 && (
                <View style={{ margin:12,borderRadius:16,backgroundColor:'#FFFFFF',padding:40,alignItems:'center',boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                  <MapIcon size={44} color="#D1D5DB" />
                  <Text style={{ fontSize:14,color:'#9CA3AF',marginTop:12,display:'block' }}>暂无足迹数据</Text>
                  <Text style={{ fontSize:12,color:'#D1D5DB',marginTop:4,display:'block' }}>添加项目后这里将展示你的旅行轨迹</Text>
                </View>
              )}
          </ScrollView>
        </>
      )}

      {/* 日历选择器弹层 */}
      {showCalendar && (
        <View style={{ position:'fixed',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.45)',zIndex:999,display:'flex',flexDirection:'column' }}
          onClick={() => setShowCalendar(false)}
        >
          <View style={{ marginTop:'30%',marginLeft:16,marginRight:16,borderRadius:20,backgroundColor:'#FFF',overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            <View style={{ display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:'1px solid #F0F0F0' }}>
              <Text style={{ fontSize:15,fontWeight:'600',color:'#1F2937' }}>选择日期范围</Text>
              <Text onClick={() => setShowCalendar(false)} style={{ fontSize:18,color:'#9CA3AF',lineHeight:1 }}>✕</Text>
            </View>

            <View style={{ display:'flex',flexDirection:'row' }}>
              {/* 快捷选项 */}
              <View style={{ width:90,padding:'10px 8px',borderRight:'1px solid #F0F0F0',backgroundColor:'#FAFBFC' }}>
                {quickRanges.map(qr => (
                  <Text key={qr.key} onClick={() => applyQuick(qr.key)}
                    style={{ fontSize:12,color:THEME.primary,padding:'6px 8px',borderRadius:8,marginBottom:4,backgroundColor:'#EFF6FF',display:'block' }}
                  >{qr.label}</Text>
                ))}
              </View>

              {/* 日历 */}
              <View style={{ flex:1,padding:10 }}>
                <View style={{ display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                  <Text onClick={() => { if(calMonth===1){setCalYear(calYear-1);setCalMonth(12)}else setCalMonth(calMonth-1) }} style={{ fontSize:14,color:THEME.primary,padding:'2px 6px' }}>◀</Text>
                  <Text style={{ fontSize:14,fontWeight:'600',color:'#1F2937' }}>{calYear}年{calMonth}月</Text>
                  <Text onClick={() => { if(calMonth===12){setCalYear(calYear+1);setCalMonth(1)}else setCalMonth(calMonth+1) }} style={{ fontSize:14,color:THEME.primary,padding:'2px 6px' }}>▶</Text>
                </View>
                <View style={{ display:'flex',flexDirection:'row',marginBottom:4 }}>
                  {['日','一','二','三','四','五','六'].map(d => (<Text key={d} style={{ flex:1,fontSize:11,color:'#9CA3AF',textAlign:'center',display:'block' }}>{d}</Text>))}
                </View>
                <View style={{ display:'flex',flexDirection:'row',flexWrap:'wrap' }}>
                  {(() => {
                    const total = getDaysInMonth(calYear,calMonth)
                    const firstWd = getFirstDayWeekday(calYear,calMonth)
                    const cells:any[] = []
                    for(let i=0;i<firstWd;i++) cells.push(<Text key={'e'+i} style={{ width:'14.28%',height:26 }} />)
                    for(let d=1;d<=total;d++) {
                      const ds = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                      const sel = ds===customStartDate||ds===customEndDate
                      const inR = customStartDate&&customEndDate&&ds>customStartDate&&ds<customEndDate
                      const today = ds===new Date().toISOString().split('T')[0]
                      cells.push(
                        <Text key={d} onClick={() => pickDate(d)}
                          style={{ width:'14.28%',height:26,textAlign:'center',lineHeight:'26px',fontSize:12,borderRadius:'50%',
                            backgroundColor: sel?THEME.primary:inR?'#DBEAFE':'transparent',
                            color: sel?'#FFF':today?THEME.primary:'#374151'
                          }}
                        >{d}</Text>
                      )
                    }
                    return cells
                  })()}
                </View>
                {(customStartDate||customEndDate) && (
                  <View style={{ marginTop:6,alignItems:'center' }}>
                    <Text style={{ fontSize:11,color:'#6B7280',display:'block' }}>{customStartDate||'开始'} ~ {customEndDate||'结束'}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ display:'flex',flexDirection:'row',gap:10,padding:'12px 16px',borderTop:'1px solid #F0F0F0' }}>
              <View onClick={() => { setCustomStartDate('');setCustomEndDate('');setDateRange('all');setShowCalendar(false) }}
                style={{ flex:1,textAlign:'center',paddingTop:9,paddingBottom:9,borderRadius:18,backgroundColor:'#F3F4F6' }}
              ><Text style={{ fontSize:13,color:'#6B7280' }}>重置</Text></View>
              <View onClick={confirmDate}
                style={{ flex:1,textAlign:'center',paddingTop:9,paddingBottom:9,borderRadius:18,backgroundColor:THEME.primary }}
              ><Text style={{ fontSize:13,color:'#FFFFFF' }}>确定</Text></View>
            </View>
          </View>
        </View>
      )}

      {renderBottomTabs()}
    </View>
  )
}

export default StatsPage
