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
  ChevronDown,
  ChevronRight,
} from 'lucide-react-taro'

/* ======== 主题色（与小程序整体一致：蓝色系）======== */
const THEME = {
  primary: '#5B9BD5',
  primaryLight: '#7BA8EA',
  primaryDark: '#3A82C8',
  headerBg: 'linear-gradient(160deg, #5B9BD5, #7BA8EA)',
}

/* 类别配置（与add-bill页面一致，环形图使用此颜色） */
const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  '交通': { icon: Car, color: '#F5A623', bg: '#FFF7E6' },
  '餐饮': { icon: Utensils, color: '#E85D4F', bg: '#FFF0ED' },
  '住宿': { icon: House, color: '#5B8DEE', bg: '#EEF2FF' },
  '购物': { icon: ShoppingBag, color: '#EB2F96', bg: '#FFF0F6' },
  '娱乐': { icon: Gamepad2, color: '#9254DE', bg: '#F9F0FF' },
  '咖啡': { icon: Coffee, color: '#8B572A', bg: '#FBF5ED' },
  '门票': { icon: Plane, color: '#13C2C2', bg: '#E6FFFE' },
  '纪念品': { icon: Ellipsis, color: '#FA8C16', bg: '#FFF7E6' },
  '其他': { icon: Ellipsis, color: '#8C8C8C', bg: '#FAFAFA' },
}

function getCategoryConfig(name: string) {
  return CATEGORY_CONFIG[name] || CATEGORY_CONFIG['其他']
}

/* ======== 中文地级市数据库 ======== */
const CITY_DB: Record<string, { name: string; province: string; lat: number; lng: number }> = {
  /* 直辖市 */
  '北京': { name: '北京', province: '北京', lat: 40, lng: 116 },
  '上海': { name: '上海', province: '上海', lat: 31, lng: 121 },
  '天津': { name: '天津', province: '天津', lat: 39, lng: 117 },
  '重庆': { name: '重庆', province: '重庆', lat: 29, lng: 106 },
  /* 浙江 */
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
  /* 广东 */
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
  /* 江苏 */
  '南京': { name: '南京', province: '江苏', lat: 32, lng: 118 },
  '苏州': { name: '苏州', province: '江苏', lat: 31, lng: 120 },
  '无锡': { name: '无锡', province: '江苏', lat: 31, lng: 120 },
  '常州': { name: '常州', province: '江苏', lat: 31, lng: 119 },
  '徐州': { name: '徐州', province: '江苏', lat: 34, lng: 117 },
  '扬州': { name: '扬州', province: '江苏', lat: 32, lng: 119 },
  '镇江': { name: '镇江', province: '江苏', lat: 32, lng: 119 },
  /* 四川 */
  '成都': { name: '成都', province: '四川', lat: 30, lng: 104 },
  '绵阳': { name: '绵阳', province: '四川', lat: 31, lng: 104 },
  '乐山': { name: '乐山', province: '四川', lat: 29, lng: 103 },
  '宜宾': { name: '宜宾', province: '四川', lat: 28, lng: 104 },
  '泸州': { name: '泸州', province: '四川', lat: 28, lng: 105 },
  '阿坝': { name: '阿坝', province: '四川', lat: 32, lng: 102 },
  '甘孜': { name: '甘孜', province: '四川', lat: 30, lng: 101 },
  /* 云南 */
  '昆明': { name: '昆明', province: '云南', lat: 25, lng: 102 },
  '大理': { name: '大理', province: '云南', lat: 25, lng: 100 },
  '丽江': { name: '丽江', province: '云南', lat: 26, lng: 100 },
  '西双版纳': { name: '西双版纳', province: '云南', lat: 21, lng: 100 },
  '香格里拉': { name: '香格里拉', province: '云南', lat: 27, lng: 99 },
  '普洱': { name: '普洱', province: '云南', lat: 22, lng: 100 },
  '腾冲': { name: '腾冲', province: '云南', lat: 25, lng: 98 },
  /* 湖南 */
  '长沙': { name: '长沙', province: '湖南', lat: 28, lng: 112 },
  '张家界': { name: '张家界', province: '湖南', lat: 29, lng: 110 },
  '湘西': { name: '湘西', province: '湖南', lat: 28, lng: 109 },
  '岳阳': { name: '岳阳', province: '湖南', lat: 29, lng: 113 },
  /* 湖北 */
  '武汉': { name: '武汉', province: '湖北', lat: 30, lng: 114 },
  '宜昌': { name: '宜昌', province: '湖北', lat: 30, lng: 111 },
  '恩施': { name: '恩施', province: '湖北', lat: 30, lng: 109 },
  /* 陕西 */
  '西安': { name: '西安', province: '陕西', lat: 34, lng: 108 },
  '延安': { name: '延安', province: '陕西', lat: 36, lng: 109 },
  /* 山东 */
  '青岛': { name: '青岛', province: '山东', lat: 36, lng: 120 },
  '济南': { name: '济南', province: '山东', lat: 36, lng: 117 },
  '烟台': { name: '烟台', province: '山东', lat: 37, lng: 121 },
  '威海': { name: '威海', province: '山东', lat: 37, lng: 122 },
  /* 福建 */
  '厦门': { name: '厦门', province: '福建', lat: 24, lng: 118 },
  '福州': { name: '福州', province: '福建', lat: 26, lng: 119 },
  '泉州': { name: '泉州', province: '福建', lat: 24, lng: 118 },
  '漳州': { name: '漳州', province: '福建', lat: 24, lng: 117 },
  /* 海南 */
  '三亚': { name: '三亚', province: '海南', lat: 18, lng: 109 },
  '海口': { name: '海口', province: '海南', lat: 20, lng: 110 },
  /* 广西 */
  '桂林': { name: '桂林', province: '广西', lat: 25, lng: 110 },
  '北海': { name: '北海', province: '广西', lat: 21, lng: 109 },
  '阳朔': { name: '阳朔', province: '广西', lat: 24, lng: 110 },
  /* 贵州 */
  '贵阳': { name: '贵阳', province: '贵州', lat: 26, lng: 106 },
  /* 西藏 */
  '拉萨': { name: '拉萨', province: '西藏', lat: 29, lng: 91 },
  '林芝': { name: '林芝', province: '西藏', lat: 29, lng: 94 },
  /* 新疆 */
  '乌鲁木齐': { name: '乌鲁木齐', province: '新疆', lat: 43, lng: 87 },
  '喀什': { name: '喀什', province: '新疆', lat: 39, lng: 75 },
  /* 内蒙古 */
  '呼和浩特': { name: '呼和浩特', province: '内蒙古', lat: 40, lng: 111 },
  '呼伦贝尔': { name: '呼伦贝尔', province: '内蒙古', lat: 49, lng: 119 },
  /* 甘肃 */
  '兰州': { name: '兰州', province: '甘肃', lat: 36, lng: 103 },
  '敦煌': { name: '敦煌', province: '甘肃', lat: 40, lng: 94 },
  '张掖': { name: '张掖', province: '甘肃', lat: 38, lng: 100 },
  /* 江西 */
  '南昌': { name: '南昌', province: '江西', lat: 28, lng: 115 },
  '景德镇': { name: '景德镇', province: '江西', lat: 29, lng: 117 },
  /* 河南 */
  '郑州': { name: '郑州', province: '河南', lat: 34, lng: 113 },
  '洛阳': { name: '洛阳', province: '河南', lat: 34, lng: 112 },
  /* 安徽 */
  '黄山': { name: '黄山', province: '安徽', lat: 30, lng: 118 },
  '合肥': { name: '合肥', province: '安徽', lat: 31, lng: 117 },
  /* 山西 */
  '大同': { name: '大同', province: '山西', lat: 40, lng: 113 },
  /* 辽宁 */
  '大连': { name: '大连', province: '辽宁', lat: 38, lng: 121 },
  '沈阳': { name: '沈阳', province: '辽宁', lat: 41, lng: 123 },
  /* 吉林 */
  '长春': { name: '长春', province: '吉林', lat: 43, lng: 125 },
  /* 黑龙江 */
  '哈尔滨': { name: '哈尔滨', province: '黑龙江', lat: 45, lng: 126 },
  /* 港澳台 */
  '香港': { name: '香港', province: '香港', lat: 22, lng: 114 },
  '澳门': { name: '澳门', province: '澳门', lat: 22, lng: 113 },
  '台湾': { name: '台湾', province: '台湾', lat: 23, lng: 121 },
}

/* 从文本中识别地级市（精确匹配+包含匹配） */
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

/* 时间筛选选项 */
const TIME_OPTIONS = [
  { key: 'month', label: '本月' },
  { key: 'week', label: '近7天' },
  { key: 'all', label: '全部时间' },
]

const CATEGORY_LIST = ['all', ...Object.keys(CATEGORY_CONFIG)]

/* ======== 主组件 ======== */
function StatsPage() {
  type TabType = 'detail' | 'chart' | 'map'
  const [activeTab, setActiveTab] = useState<TabType>('detail')

  const [bills, setBills] = useState<Bill[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [dateRange, setDateRange] = useState<string>('month')
  const [detailCategory, setDetailCategory] = useState<string>('all')

  /* 下拉筛选状态 */
  const [showTimeDropdown, setShowTimeDropdown] = useState(false)
  const [showCatDropdown, setShowCatDropdown] = useState(false)

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

  /* 只计算支出 */
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

  /* 环形图数据 —— 使用类别颜色 */
  const pieData = useMemo(() => {
    if (!categoryStats.length) return []
    const total = categoryStats.reduce((s, c) => s + c.amount, 0)
    return categoryStats.map(c => ({
      ...c,
      percent: total > 0 ? ((c.amount / total) * 100).toFixed(1) : '0',
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

  /* 目的地统计 —— 同时从bill.destination和project.name中识别城市 */
  const destinationList = useMemo(() => {
    const m = new Map<string, { amount: number; count: number; info: ReturnType<typeof recognizeCity> }>()

    /* 从bill的destination字段收集 */
    filteredBills.forEach(b => {
      const dest = b.destination || ''
      if (dest) {
        const cityInfo = recognizeCity(dest)
        const key = cityInfo?.name || dest
        const prev = m.get(key) || { amount: 0, count: 0, info: cityInfo }
        m.set(key, { amount: prev.amount + Math.abs(Number(b.amount)), count: prev.count + 1, info: cityInfo || prev.info })
      }
    })

    /* 从projects数据中识别城市名 */
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

  const currentMonthLabel = (() => {
    const now = new Date()
    return `${now.getFullYear()}年${now.getMonth() + 1}月`
  })()

  const dateRangeLabel = TIME_OPTIONS.find(o => o.key === dateRange)?.label || '本月'

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

  /* 选择时间范围 */
  const selectDateRange = (key: string) => {
    setDateRange(key)
    setShowTimeDropdown(false)
  }

  /* 选择分类 */
  const selectCategory = (cat: string) => {
    setDetailCategory(cat)
    setShowCatDropdown(false)
  }

  /* ====== Header高度 ====== */
  const detailHeaderH = capsuleBottom + 100
  const chartHeaderH = capsuleBottom + 115
  const mapHeaderH = capsuleBottom + 48

  /* ====== 底部三段式Tab ====== */
  const renderBottomTabs = () => (
    <View style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex', flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1, borderTopColor: '#EEF0F4',
      zIndex: 200,
    }}
    >
      <View onClick={() => setActiveTab('detail')}
        style={{
          flex: 1, paddingTop: 10, paddingBottom: 24,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          backgroundColor: activeTab === 'detail' ? THEME.primary : '#FFFFFF',
        }}
      >
        <FileText size={22} color={activeTab === 'detail' ? '#FFFFFF' : '#8896A6'} />
        <Text style={{ fontSize: 11, fontWeight: activeTab === 'detail' ? '600' : '400', color: activeTab === 'detail' ? '#FFFFFF' : '#8896A6' }}>明细</Text>
      </View>
      <View onClick={() => setActiveTab('chart')}
        style={{
          flex: 1, paddingTop: 10, paddingBottom: 24,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          backgroundColor: activeTab === 'chart' ? THEME.primary : '#FFFFFF',
        }}
      >
        <FileChartPie size={22} color={activeTab === 'chart' ? '#FFFFFF' : '#8896A6'} />
        <Text style={{ fontSize: 11, fontWeight: activeTab === 'chart' ? '600' : '400', color: activeTab === 'chart' ? '#FFFFFF' : '#8896A6' }}>统计</Text>
      </View>
      <View onClick={() => setActiveTab('map')}
        style={{
          flex: 1, paddingTop: 10, paddingBottom: 24,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          backgroundColor: activeTab === 'map' ? THEME.primary : '#FFFFFF',
        }}
      >
        <MapIcon size={22} color={activeTab === 'map' ? '#FFFFFF' : '#8896A6'} />
        <Text style={{ fontSize: 11, fontWeight: activeTab === 'map' ? '600' : '400', color: activeTab === 'map' ? '#FFFFFF' : '#8896A6' }}>地图</Text>
      </View>
    </View>
  )

  /* ====== 下拉筛选面板（通用） ====== */
  const renderDropdownPanel = (visible: boolean, onClose: () => void, title: string, options: { key: string; label: string }[], selected: string, onSelect: (k: string) => void) => {
    if (!visible) return null
    return (
      <>
        {/* 遮罩 */}
        <View className="absolute inset-0" style={{ zIndex: 199, top: capsuleBottom }} onClick={onClose}>
          <View style={{ height: '100%', backgroundColor: 'rgba(0,0,0,0.15)' }} />
        </View>
        {/* 面板 */}
        <View style={{
          position: 'absolute', left: 0, right: 0, top: capsuleBottom,
          zIndex: 200, backgroundColor: '#FFFFFF',
          borderRadius: 12, marginLeft: 12, marginRight: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          padding: 8,
        }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#333', paddingLeft: 14, paddingRight: 14, paddingTop: 6, paddingBottom: 8 }}>{title}</Text>
          {options.map(opt => (
            <View key={opt.key} onClick={() => onSelect(opt.key)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingLeft: 14, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
                borderBottomWidth: options[options.length - 1].key !== opt.key ? 0.5 : 0,
                borderBottomColor: '#F0F0F0',
              }}
            >
              <Text style={{ fontSize: 14, color: selected === opt.key ? THEME.primary : '#333' }}>{opt.label}</Text>
              {selected === opt.key && <Text style={{ fontSize: 14, color: THEME.primary, fontWeight: '700' }}>✓</Text>}
            </View>
          ))}
        </View>
      </>
    )
  }

  return (
    <View className="flex flex-col h-full" style={{ backgroundColor: '#F5F5F5' }}>
      {/* ==================== 明细 Tab ==================== */}
      {activeTab === 'detail' && (
        <>
          {/* 固定Header */}
          <View style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: showCatDropdown || showTimeDropdown ? 198 : 100, background: THEME.headerBg }}>
            {/* 标题行 */}
            <View style={{
              paddingTop: statusBarH, height: capsuleBottom,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>记账本</Text>
            </View>

            {/* 筛选行：类型下拉 + 时间下拉 */}
            <View style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 8, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* 分类下拉按钮 */}
              <View style={{ position: 'relative' }}>
                <View onClick={() => { setShowCatDropdown(!showCatDropdown); setShowTimeDropdown(false) }}
                  style={{
                    paddingTop: 5, paddingBottom: 5, paddingLeft: 12, paddingRight: 10,
                    borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '500' }}>
                    {detailCategory === 'all' ? '全部类型' : detailCategory}
                  </Text>
                  <ChevronDown size={12} color="#FFFFFF" />
                </View>
              </View>

              {/* 时间下拉按钮 */}
              <View style={{ position: 'relative' }}>
                <View onClick={() => { setShowTimeDropdown(!showTimeDropdown); setShowCatDropdown(false) }}
                  style={{
                    paddingTop: 5, paddingBottom: 5, paddingLeft: 12, paddingRight: 10,
                    borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '500' }}>{dateRangeLabel}</Text>
                  <ChevronDown size={12} color="#FFFFFF" />
                </View>
              </View>

              {/* 日期选择器箭头 */}
              <View style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{currentMonthLabel}</Text>
                <ChevronDown size={12} color="rgba(255,255,255,0.65)" />
              </View>
            </View>

            {/* 汇总行 */}
            <View style={{
              paddingLeft: 16, paddingRight: 16, paddingBottom: 14,
              display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
            >
              <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>总支出</Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>¥{totalExpense.toFixed(2)}</Text>
            </View>
          </View>

          {/* 下拉面板 */}
          {renderDropdownPanel(showCatDropdown, () => setShowCatDropdown(false), '选择分类',
            CATEGORY_LIST.map(k => ({ key: k, label: k === 'all' ? '全部类型' : k })),
            detailCategory, selectCategory)}
          {renderDropdownPanel(showTimeDropdown, () => setShowTimeDropdown(false), '选择时间',
            TIME_OPTIONS, dateRange, selectDateRange)}

          {/* 滚动内容 */}
          <ScrollView scrollY enhanced showScrollbar={false}
            style={{ flex: 1, marginTop: detailHeaderH, marginBottom: 70 }}
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
                  <View style={{ borderRadius: 16, backgroundColor: '#FFFFFF', padding: 40, alignItems: 'center' }}>
                    <Text style={{ fontSize: 36 }}>📋</Text>
                    <Text style={{ fontSize: 14, color: '#BBB', marginTop: 8, display: 'block' }}>暂无明细</Text>
                  </View>
                )

                return sortedDates.map(date => {
                  const items = grouped[date]
                  const dayOut = items.filter(i => !i.is_treat).reduce((s, i) => s + Math.abs(Number(i.amount)), 0)

                  return (
                    <View key={date} style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                      {/* 日期头 */}
                      <View style={{
                        paddingTop: 10, paddingBottom: 10, paddingLeft: 16, paddingRight: 16,
                        display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
                      }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#333', display: 'block' }}>{getDayLabel(date)}</Text>
                        <Text style={{ fontSize: 12, color: '#999', display: 'block' }}>出 {dayOut.toFixed(2)}</Text>
                      </View>
                      {/* 账单项 */}
                      {items.map((bill, bi) => {
                        const cc = getCategoryConfig(bill.category)
                        const IconComp = cc.icon
                        const amt = Number(bill.amount)
                        return (
                          <View key={`${bill.id}-${bi}`} style={{
                            paddingTop: 12, paddingBottom: 12, paddingLeft: 16, paddingRight: 16,
                            display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12,
                            borderBottomWidth: bi < items.length - 1 ? 1 : 0, borderBottomColor: '#F5F5F5',
                          }}
                          >
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: cc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <IconComp size={18} color={cc.color} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ fontSize: 15, color: '#333', display: 'block' }}>{bill.name}</Text>
                              {(bill.note || bill.payer) && (
                                <Text style={{ fontSize: 11, color: '#AAA', display: 'block', marginTop: 1 }}>
                                  {[bill.payer, bill.note].filter(Boolean).join(' | ')}
                                </Text>
                              )}
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: bill.is_treat ? '#F5A623' : '#333', flexShrink: 0 }}>
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
          {/* 固定Header（只显示支出） */}
          <View style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: THEME.headerBg }}>
            <View style={{
              paddingTop: statusBarH, height: capsuleBottom,
              paddingLeft: 16, paddingRight: 16,
              display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}
            >
              {/* 时间下拉按钮 */}
              <View style={{ position: 'relative' }}>
                <View onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                  style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ fontSize: 17, fontWeight: '600', color: '#FFFFFF' }}>{dateRangeLabel}</Text>
                  <ChevronDown size={14} color="rgba(255,255,255,0.75)" />
                </View>
              </View>
            </View>

            {/* 金额行 */}
            <View style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 16 }}>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', display: 'block' }}>共支出</Text>
              <Text style={{ fontSize: 32, fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.5px' }}>¥{totalExpense.toFixed(2)}</Text>
            </View>
          </View>

          {/* 时间下拉面板 */}
          {renderDropdownPanel(showTimeDropdown, () => setShowTimeDropdown(false), '选择时间范围',
            TIME_OPTIONS, dateRange, selectDateRange)}

          {/* 滚动内容 */}
          <ScrollView scrollY enhanced showScrollbar={false}
            style={{ flex: 1, marginTop: chartHeaderH, marginBottom: 70 }}
          >
            <View style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 支出构成窗口 */}
              <View style={{ borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B', display: 'block', marginBottom: 16 }}>支出构成</Text>

                {categoryStats.length > 0 ? (
                  <>
                    {/* 环形饼图 */}
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      <View style={{
                        width: 180, height: 180, borderRadius: 90,
                        background: conicGradient,
                        position: 'relative',
                      }}
                      >
                        {/* 中心镂空 */}
                        <View style={{
                          position: 'absolute', top: 35, left: 35, right: 35, bottom: 35,
                          borderRadius: 45, backgroundColor: '#FFFFFF',
                        }}
                        />
                        {/* 百分比标注 */}
                        {pieData.map((d, i) => {
                          const midAngle = (() => {
                            let start = 0
                            for (let j = 0; j < i; j++) start += pieData[j].angle
                            return start + d.angle / 2
                          })()
                          const rad = (midAngle * Math.PI) / 180
                          const r = 105
                          const x = 90 + r * Math.cos(rad)
                          const y = 90 + r * Math.sin(rad)
                          const labelX = 90 + r * 1.45 * Math.cos(rad)
                          const labelY = 90 + r * 1.45 * Math.sin(rad)
                          return (
                            <View key={`lbl-${d.name}`}>
                              {/* 连线点 */}
                              <View style={{ position: 'absolute', left: x - 2, top: y - 2, width: 4, height: 4, borderRadius: 2, backgroundColor: d.color }} />
                              {/* 标签 */}
                              <View style={{ position: 'absolute', left: Math.min(labelX, 170), top: labelY - 8 }}>
                                <Text style={{ fontSize: 11, color: '#666', display: 'block' }}>{d.name} {d.percent}%</Text>
                              </View>
                            </View>
                          )
                        })}
                      </View>
                    </View>

                    {/* 分类排行 */}
                    <View style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {categoryStats.map((cat) => {
                        const cfg = getCategoryConfig(cat.name)
                        const IconComp = cfg.icon
                        const pct = maxCatAmount > 0 ? (cat.amount / maxCatAmount) * 100 : 0
                        return (
                          <View key={cat.name} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            {/* 圆形图标 */}
                            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <IconComp size={16} color={cfg.color} />
                            </View>
                            {/* 名称 */}
                            <Text style={{ fontSize: 14, color: '#333', width: 50, flexShrink: 0 }}>{cat.name}</Text>
                            {/* 进度条 */}
                            <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#F0F0F0', overflow: 'hidden' }}>
                              <View style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: cfg.color }} />
                            </View>
                            {/* 金额 */}
                            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                              <Text style={{ fontSize: 15, fontWeight: '600', color: '#333' }}>¥{cat.amount.toFixed(2)}</Text>
                              <ChevronRight size={14} color="#CCC" />
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', paddingTop: 30, paddingBottom: 30 }}>
                    <Text style={{ fontSize: 40 }}>📊</Text>
                    <Text style={{ fontSize: 14, color: '#AAA', marginTop: 8, display: 'block' }}>暂无数据</Text>
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
          <View style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: THEME.headerBg }}>
            <View style={{ paddingTop: statusBarH, height: capsuleBottom, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>目的地地图</Text>
            </View>
          </View>

          <ScrollView scrollY enhanced showScrollbar={false}
            style={{ flex: 1, marginTop: mapHeaderH, marginBottom: 70 }}
          >
            <View style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 地图区域 */}
              <View style={{ borderRadius: 16, backgroundColor: '#EBF4FF', padding: 20, minHeight: 280, position: 'relative' }}>
                {/* 中国地图轮廓示意（用CSS绘制简化形状） */}
                <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
                  {destinationList.length > 0 ? (
                    <View style={{ position: 'relative', width: '100%', height: 240 }}>
                      {/* 城市标记点 */}
                      {destinationList.slice(0, 12).map((dest, i) => {
                        const info = dest.info
                        /* 将经纬度映射到相对位置 (lng: 73-136 -> 5%-95%, lat: 18-54 -> 80%-10%) */
                        const rawLng = info?.lng || (80 + (i % 6) * 10)
                        const rawLat = info?.lat || (20 + Math.floor(i / 6) * 10)
                        const x = ((rawLng - 70) / 66) * 85 + 5
                        const y = ((55 - rawLat) / 38) * 75 + 5
                        return (
                          <View key={`marker-${dest.city}-${i}`} style={{ position: 'absolute', left: `${x}%`, top: `${y}%` }}>
                            <View style={{ alignItems: 'center' }}>
                              {/* 标记圆点 */}
                              <View style={{
                                width: dest.amount > 0 ? 10 : 6, height: dest.amount > 0 ? 10 : 6,
                                borderRadius: dest.amount > 0 ? 5 : 3,
                                backgroundColor: dest.amount > 0 ? THEME.primary : '#CCC',
                                borderWidth: dest.amount > 0 ? 2 : 0, borderColor: '#FFF',
                                
                                
                              }}
                              />
                              {/* 城市名标签 */}
                              {(i < 6 || dest.amount > 0) && (
                                <Text style={{ fontSize: 9, color: '#444', marginTop: 2, whiteSpace: 'nowrap' }}>
                                  {dest.city}
                                </Text>
                              )}
                            </View>
                          </View>
                        )
                      })}

                      {/* 无坐标的城市用散布位置 */}
                      {destinationList.filter(d => !d.info).slice(0, 6).map((dest, i) => {
                        const positions = [
                          { x: 25, y: 35 }, { x: 55, y: 25 }, { x: 75, y: 45 },
                          { x: 35, y: 60 }, { x: 60, y: 65 }, { x: 80, y: 30 },
                        ]
                        const pos = positions[i % positions.length]
                        return (
                          <View key={`fallback-${dest.city}-${i}`} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%` }}>
                            <View style={{ alignItems: 'center' }}>
                              <View style={{
                                width: 8, height: 8, borderRadius: 4, backgroundColor: '#AAA',
                                borderWidth: 1.5, borderColor: '#FFF',
                              }}
                              />
                              <Text style={{ fontSize: 9, color: '#888', marginTop: 1, whiteSpace: 'nowrap' }}>{dest.city}</Text>
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <MapIcon size={48} color="#C5DAE8" />
                      <Text style={{ fontSize: 14, color: '#A0B8CC', marginTop: 12, display: 'block' }}>中国地级市示意图</Text>
                      <Text style={{ fontSize: 12, color: '#C0D0E0', marginTop: 4, display: 'block' }}>
                        暂无目的地数据 请在项目中设置目的地
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 目的地排行榜 */}
              {destinationList.length > 0 && (
                <View style={{ borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B', display: 'block', marginBottom: 12 }}>📍 目的地花费</Text>
                  {destinationList.map((dest, i) => (
                    <View key={dest.city}
                      style={{
                        display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingTop: 10, paddingBottom: 10,
                        borderBottomWidth: i < destinationList.length - 1 ? 0.5 : 0,
                        borderBottomColor: '#F0F0F0',
                      }}
                    >
                      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: i < 3 ? THEME.primary : '#8896A6', width: 20 }}>#{i + 1}</Text>
                        <View>
                          <Text style={{ fontSize: 14, color: '#333', display: 'block' }}>{dest.city}</Text>
                          <Text style={{ fontSize: 11, color: '#AAA', display: 'block' }}>{dest.info?.province || ''}{dest.count > 1 ? ` (${dest.count}笔)` : ''}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#333' }}>¥{dest.amount.toFixed(2)}</Text>
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
