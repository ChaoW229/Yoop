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

/* ======== 主题色（与小程序整体一致：蓝色系）======== */
const THEME = {
  primary: '#5B9BD5',
  primaryLight: '#7BA8EA',
  primaryDark: '#3A82C8',
  primaryBg: 'linear-gradient(135deg, #5B9BD5, #7BA8EA)',
  headerBg: 'linear-gradient(160deg, #5B9BD5, #6BA8D8)',
}

/* 与项目详情页一致的类别配置，环形图使用此颜色 */
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

/* ======== 中文地级市数据库（用于地图识别）======== */
const CITY_DB: Record<string, { name: string; province: string; lat: number; lng: number }> = {
  /* 直辖市 */
  '北京': { name: '北京', province: '北京', lat: 40, lng: 116 },
  '上海': { name: '上海', province: '上海', lat: 31, lng: 121 },
  '天津': { name: '天津', province: '天津', lat: 39, lng: 117 },
  '重庆': { name: '重庆', province: '重庆', lat: 29, lng: 106 },
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
  /* 浙江 */
  '杭州': { name: '杭州', province: '浙江', lat: 30, lng: 120 },
  '宁波': { name: '宁波', province: '浙江', lat: 29, lng: 121 },
  '温州': { name: '温州', province: '浙江', lat: 28, lng: 120 },
  '绍兴': { name: '绍兴', province: '浙江', lat: 30, lng: 120 },
  '嘉兴': { name: '嘉兴', province: '浙江', lat: 30, lng: 120 },
  '湖州': { name: '湖州', province: '浙江', lat: 30, lng: 120 },
  '金华': { name: '金华', province: '浙江', lat: 29, lng: 119 },
  '台州': { name: '台州', province: '浙江', lat: 28, lng: 121 },
  '舟山': { name: '舟山', province: '浙江', lat: 30, lng: 122 },
  '丽水': { name: '丽水', province: '浙江', lat: 28, lng: 119 },
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
  '黔东南': { name: '黔东南', province: '贵州', lat: 26, lng: 107 },
  /* 西藏 */
  '拉萨': { name: '拉萨', province: '西藏', lat: 29, lng: 91 },
  '林芝': { name: '林芝', province: '西藏', lat: 29, lng: 94 },
  /* 新疆 */
  '乌鲁木齐': { name: '乌鲁木齐', province: '新疆', lat: 43, lng: 87 },
  '喀什': { name: '喀什', province: '新疆', lat: 39, lng: 75 },
  '伊犁': { name: '伊犁', province: '新疆', lat: 43, lng: 81 },
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
  '庐山': { name: '庐山', province: '江西', lat: 29, lng: 116 },
  /* 河南 */
  '郑州': { name: '郑州', province: '河南', lat: 34, lng: 113 },
  '洛阳': { name: '洛阳', province: '河南', lat: 34, lng: 112 },
  /* 安徽 */
  '黄山': { name: '黄山', province: '安徽', lat: 30, lng: 118 },
  '合肥': { name: '合肥', province: '安徽', lat: 31, lng: 117 },
  /* 山西 */
  '大同': { name: '大同', province: '山西', lat: 40, lng: 113 },
  '平遥': { name: '平遥', province: '山西', lat: 37, lng: 112 },
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

/* 从项目名称或目的地中识别地级市 */
function recognizeCity(text: string): typeof CITY_DB[string] | null {
  if (!text) return null
  const t = text.trim()
  /* 精确匹配 */
  if (CITY_DB[t]) return CITY_DB[t]
  /* 模糊匹配：检查是否包含城市名 */
  for (const [cityName, cityInfo] of Object.entries(CITY_DB)) {
    if (t.includes(cityName) || cityName.includes(t)) return cityInfo
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

/* ======== 主组件 ======== */
function StatsPage() {
  /* 三段式Tab：明细 | 统计 | 地图 */
  type TabType = 'detail' | 'chart' | 'map'
  const [activeTab, setActiveTab] = useState<TabType>('detail')

  const [bills, setBills] = useState<Bill[]>([])
  const [dateRange, setDateRange] = useState<string>('month')
  const [detailCategory, setDetailCategory] = useState<string>('all')

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

  /* 明细页分类过滤 */
  const detailFilteredBills = useMemo(() => {
    if (detailCategory === 'all') return filteredBills
    return filteredBills.filter(b => b.category === detailCategory)
  }, [filteredBills, detailCategory])

  /* 只计算支出（不含请客项） */
  const totalExpense = useMemo(() =>
    filteredBills.filter(b => !b.is_treat).reduce((s, b) => s + Math.abs(Number(b.amount)), 0),
    [filteredBills])

  /* 分类统计（环形图+排行）*/
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

  /* 目的地统计（用于地图）——从项目名称和destination中提取城市 */
  const destinationList = useMemo(() => {
    const m = new Map<string, { amount: number; count: number; info: ReturnType<typeof recognizeCity> }>()
    /* 先从bill的destination字段收集 */
    filteredBills.forEach(b => {
      const dest = b.destination || ''
      if (!dest) return
      const cityInfo = recognizeCity(dest)
      const key = cityInfo?.name || dest
      const prev = m.get(key) || { amount: 0, count: 0, info: cityInfo }
      m.set(key, { amount: prev.amount + Math.abs(Number(b.amount)), count: prev.count + 1, info: cityInfo || prev.info })
    })
    /* 如果没有destination数据，尝试从项目名称推断（需要额外获取projects） */
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

  /* 切换时间范围 */
  const cycleDateRange = () => {
    const next: Record<string, string> = { month: 'week', week: 'all', all: 'month' }
    setDateRange(next[dateRange] || 'month')
  }

  /* 切换明细页分类 */
  const cycleDetailCategory = () => {
    const cats = ['all', ...Object.keys(CATEGORY_CONFIG)]
    const idx = cats.indexOf(detailCategory)
    setDetailCategory(cats[(idx + 1) % cats.length])
  }

  /* ====== Header高度 ====== */
  const detailHeaderH = capsuleBottom + 108   // 明细页header
  const chartHeaderH = capsuleBottom + 120     // 统计页header
  const mapHeaderH = capsuleBottom + 48        // 地图页header(只有标题)

  /* ====== 底部三段式Tab渲染 ====== */
  const renderBottomTabs = () => (
    <View style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex', flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1, borderTopColor: '#EEF0F4',
      zIndex: 100,
    }}
    >
      {/* 明细 */}
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
      {/* 统计 */}
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
      {/* 地图 */}
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

  /* ====== 渲染 ====== */
  return (
    <View className="flex flex-col h-full" style={{ backgroundColor: '#F5F5F5' }}>
      {/* ==================== 明细 Tab ==================== */}
      {activeTab === 'detail' && (
        <>
          {/* 固定蓝色Header */}
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

            {/* 筛选行 —— 可点击切换类型和时间 */}
            <View style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 8, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* 分类筛选按钮（可点击循环切换） */}
              <View onClick={cycleDetailCategory}
                style={{
                  paddingTop: 5, paddingBottom: 5, paddingLeft: 12, paddingRight: 12,
                  borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)',
                }}
              >
                <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '500' }}>
                  {detailCategory === 'all' ? '全部类型' : detailCategory}
                </Text>
              </View>
              {/* 时间筛选按钮（可点击循环切换） */}
              <View onClick={cycleDateRange}
                style={{
                  paddingTop: 5, paddingBottom: 5, paddingLeft: 12, paddingRight: 12,
                  borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)',
                }}
              >
                <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '500' }}>
                  {{ all: '全部时间', month: '本月', week: '近7天' }[dateRange]}
                </Text>
              </View>
            </View>

            {/* 汇总行 */}
            <View style={{
              paddingLeft: 16, paddingRight: 16, paddingBottom: 14,
              display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
            >
              <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>{currentMonthLabel}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{'\u25BC'}</Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>总支出 \u00a5{totalExpense.toFixed(2)}</Text>
            </View>
          </View>

          {/* 滚动内容区（无浮动记一笔按钮）*/}
          <ScrollView scrollY enhanced showScrollbar={false}
            style={{ flex: 1, marginTop: detailHeaderH, marginBottom: 70 }}
          >
            <View style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(() => {
                /* 按日期分组 */
                const grouped: Record<string, Bill[]> = {}
                detailFilteredBills.forEach(b => {
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
                    <Text style={{ fontSize: 36 }}>\uD83D\uDCCB</Text>
                    <Text style={{ fontSize: 14, color: '#BBB', marginTop: 8, display: 'block' }}>暂无明细</Text>
                  </View>
                )

                return sortedDates.map(date => {
                  const items = grouped[date]
                  const dayOut = items.filter(i => !i.is_treat).reduce((s, i) => s + Math.abs(Number(i.amount)), 0)

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
                              color: bill.is_treat ? '#F5A623' : '#333',
                              flexShrink: 0,
                            }}
                            >\u00a5{Math.abs(amt).toFixed(2)}</Text>
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
          {/* 固定蓝色Header（只显示支出，无入账切换）*/}
          <View style={{
            position: 'fixed',
            top: 0, left: 0, right: 0,
            zIndex: 100,
            background: THEME.headerBg,
          }}
          >
            {/* 标题行 + 日期选择器（可点击切换） */}
            <View style={{
              paddingTop: statusBarH,
              height: capsuleBottom,
              paddingLeft: 16, paddingRight: 16,
              display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}
            >
              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}
                onClick={cycleDateRange}
              >
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#FFFFFF' }}>
                  {{ all: '全部时间', month: currentMonthLabel, week: '近7天' }[dateRange]}
                </Text>
                <Text style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>📅</Text>
              </View>

              {/* 只显示"支出"标签，不提供切换 */}
              <View style={{
                paddingTop: 5, paddingBottom: 5, paddingLeft: 14, paddingRight: 14,
                borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)',
              }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>支出</Text>
              </View>
            </View>

            {/* 金额区 */}
            <View style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 20 }}>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', display: 'block', marginBottom: 2 }}>共支出</Text>
              <Text style={{ fontSize: 34, fontWeight: '700', color: '#FFFFFF', fontFamily: '"Georgia","Times New Roman",serif' }}>
                \u00a5{totalExpense.toFixed(2)}
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
                    }}
                    />
                    {/* 百分比标注 */}
                    {pieData.slice(0, 2).map((item, i) => {
                      const isTop = i === 0
                      return (
                        <View key={`lbl-${i}`}
                          style={{
                            position: 'absolute',
                            ...(isTop ? { top: -4, left: '55%' } : { bottom: -4, right: '15%' }),
                            display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4,
                          }}
                        >
                          <View style={{ width: isTop ? 14 : 18, height: 1, backgroundColor: '#DDD' }} />
                          <Text style={{ fontSize: 12, color: '#666', display: 'block' }}>
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
                          <Text style={{ fontSize: 15, color: '#333', width: 50, flexShrink: 0, display: 'block' }}>{cat.name}</Text>
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
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#333', display: 'block' }}>\u00a5{cat.amount.toFixed(0)}</Text>
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
                  <Text style={{ fontSize: 36 }}>\uD83D\uDCCA</Text>
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
          {/* 固定蓝色Header */}
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
            style={{ flex: 1, marginTop: mapHeaderH + 8, marginBottom: 70 }}
          >
            <View style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 中国地图示意卡片 */}
              <View style={{
                borderRadius: 16, backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
              >
                {/* 地图区域 */}
                <View style={{
                  width: '100%',
                  height: 300,
                  backgroundColor: '#F0F6FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                  borderBottomWidth: 1, borderBottomColor: '#E4EDF7',
                }}
                >
                  {/* 中国轮廓文字提示 */}
                  <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 42, opacity: 0.25 }}>🗺️</Text>
                    <Text style={{ fontSize: 12, color: '#BBB', opacity: 0.6, display: 'block' }}>中国地级市示意图</Text>
                  </View>

                  {/* 城市标记点 —— 使用识别到的城市坐标或预设散布位置 */}
                  {destinationList.slice(0, 10).map((dest, i) => {
                    const cityInfo = dest.info
                    let posTop: string
                    let posLeft: string

                    if (cityInfo) {
                      /* 有精确城市信息 → 用经纬度映射到相对位置（简化映射） */
                      posTop = `${Math.max(5, Math.min(90, 95 - cityInfo.lat * 1.8))}%`
                      posLeft = `${Math.max(5, Math.min(92, (cityInfo.lng - 70) * 3.5))}%`
                    } else {
                      /* 无精确信息 → 用散布位置 */
                      const fallbackPositions = [
                        { t: '18%', l: '38%' }, { t: '42%', l: '58%' }, { t: '54%', l: '46%' },
                        { t: '60%', l: '62%' }, { t: '45%', l: '28%' }, { t: '30%', l: '68%' },
                        { t: '66%', l: '38%' }, { t: '35%', l: '18%' }, { t: '22%', l: '82%' },
                        { t: '50%', l: '85%' },
                      ]
                      const fp = fallbackPositions[i % fallbackPositions.length]
                      posTop = fp.t; posLeft = fp.l
                    }

                    return (
                      <View key={`marker-${i}`} style={{
                        position: 'absolute',
                        top: posTop,
                        left: posLeft,
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                      }}
                      >
                        {/* 标记点圆点 */}
                        <View style={{
                          width: 10, height: 10, borderRadius: 5,
                          backgroundColor: THEME.primary,
                          borderWidth: 2, borderColor: '#FFFFFF',
                          boxShadow: '0 2px 6px rgba(91,155,213,0.35)',
                        }}
                        />
                        {/* 城市名标签 */}
                        <Text style={{
                          fontSize: 9, color: THEME.primaryDark,
                          whiteSpace: 'nowrap', marginTop: 2,
                          backgroundColor: 'rgba(255,255,255,0.85)',
                          paddingLeft: 3, paddingRight: 3, borderRadius: 3,
                        }}
                        >{dest.city}</Text>
                      </View>
                    )
                  })}
                </View>

                {/* 目的地花费排行列表 */}
                {destinationList.length > 0 ? (
                  <View style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#555', display: 'block', marginBottom: 2 }}>
                      目的地花费排行
                    </Text>
                    {destinationList.map((dest, i) => (
                      <View key={`dest-rank-${i}`}
                        style={{
                          display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10,
                          paddingTop: i > 0 ? 10 : 0,
                          borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#F0F0F0',
                        }}
                      >
                        {/* 排名 */}
                        <Text style={{
                          fontSize: 14, fontWeight: '700', color: i < 3 ? THEME.primary : '#AAA',
                          width: 20, textAlign: 'center',
                        }}
                        >{i + 1}</Text>
                        {/* 城市名 + 省份 */}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 14, color: '#333', display: 'block' }}>{dest.city}</Text>
                          {dest.info?.province && dest.info.province !== dest.city && (
                            <Text style={{ fontSize: 11, color: '#AAA', display: 'block' }}>{dest.info.province}</Text>
                          )}
                        </View>
                        {/* 金额 */}
                        <Text style={{ fontSize: 14, fontWeight: '600', color: THEME.primaryDark, flexShrink: 0 }}>
                          \u00a5{dest.amount.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ fontSize: 30 }}>🗺️</Text>
                    <Text style={{ fontSize: 13, color: '#BBB', marginTop: 8, display: 'block' }}>
                      暂无目的地数据{'\n'}请在项目中设置目的地
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </>
      )}

      {/* ====== 底部三段式Tab（始终显示）====== */}
      {renderBottomTabs()}
    </View>
  )
}

export default StatsPage
