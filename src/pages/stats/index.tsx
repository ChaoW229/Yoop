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

/* ======== 统一配色：以 #1890FF 为主题的低饱和度专业色板 ======== */
const C = {
  primary: '#1890FF',
  primaryR: '#E6F4FF',
  primaryLight: '#BAE0FF',
  text: '#1F2937',
  text2: '#374151',
  sub: '#9CA3AF',
  border: '#E5E7EB',
  bg: '#F5F7FA',
  card: '#FFFFFF',
}

/* 饼图配色 - 全部基于主色衍生，低饱和度统一风格 */
const PIE_COLORS = [
  '#5B8FF9', /* 蓝系 */
  '#61DDAA', /* 绿系 */
  '#F6BD16', /* 黄系 */
  '#726DD1', /* 紫系 */
  '#78D3F8', /* 天蓝 */
  '#F6903D', /* 橙系 */
  '#95DE64', /* 浅绿 */
  '#B37FEB', /* 淡紫 */
  '#FFA39E', /* 淡红 */
]

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  '交通': { icon: Car, color: '#FA8C16', bg: '#FFF7E6' },
  '餐饮': { icon: Utensils, color: '#F5222D', bg: '#FFF1F0' },
  '住宿': { icon: House, color: '#1890FF', bg: '#E6F7FF' },
  '购物': { icon: ShoppingBag, color: '#EB2F96', bg: '#FFF0F6' },
  '娱乐': { icon: Gamepad2, color: '#722ED1', bg: '#F9F0FF' },
  '咖啡': { icon: Coffee, color: '#8C6D1F', bg: '#FFFBE6' },
  '门票': { icon: Plane, color: '#13C2C2', bg: '#E6FFFB' },
  '纪念品': { icon: Ellipsis, color: '#D48806', bg: '#FFFBE6' },
  '其他': { icon: Ellipsis, color: '#8C8C8C', bg: '#FAFAFA' },
}
function getCategoryConfig(name: string) {
  return CATEGORY_CONFIG[name] || CATEGORY_CONFIG['其他']
}
function getPieColor(i: number) {
  return PIE_COLORS[i % PIE_COLORS.length]
}

/* 城市数据库 */
const CITY_DB: Record<string, { name: string; province: string; lat: number; lng: number }> = {
  '北京':{name:'北京',province:'北京',lat:40,lng:116},'上海':{name:'上海',province:'上海',lat:31,lng:121},
  '天津':{name:'天津',province:'天津',lat:39,lng:117},'重庆':{name:'重庆',province:'重庆',lat:29,lng:106},
  '杭州':{name:'杭州',province:'浙江',lat:30,lng:120},'宁波':{name:'宁波',province:'浙江',lat:29,lng:121},
  '温州':{name:'温州',province:'浙江',lat:28,lng:120},'绍兴':{name:'绍兴',province:'浙江',lat:30,lng:120},
  '嘉兴':{name:'嘉兴',province:'浙江',lat:30,lng:120},'湖州':{name:'湖州',province:'浙江',lat:30,lng:120},
  '金华':{name:'金华',province:'浙江',lat:29,lng:119},'台州':{name:'台州',province:'浙江',lat:28,lng:121},
  '舟山':{name:'舟山',province:'浙江',lat:30,lng:122},'丽水':{name:'丽水',province:'浙江',lat:28,lng:119},
  '广州':{name:'广州',province:'广东',lat:23,lng:113},'深圳':{name:'深圳',province:'广东',lat:22,lng:114},
  '珠海':{name:'珠海',province:'广东',lat:22,lng:113},'佛山':{name:'佛山',province:'广东',lat:23,lng:113},
  '东莞':{name:'东莞',province:'广东',lat:23,lng:113},'惠州':{name:'惠州',province:'广东',lat:23,lng:114},
  '汕头':{name:'汕头',province:'广东',lat:23,lng:116},'中山':{name:'中山',province:'广东',lat:22,lng:113},
  '江门':{name:'江门',province:'广东',lat:22,lng:112},'湛江':{name:'湛江',province:'广东',lat:21,lng:110},
  '南京':{name:'南京',province:'江苏',lat:32,lng:118},'苏州':{name:'苏州',province:'江苏',lat:31,lng:120},
  '无锡':{name:'无锡',province:'江苏',lat:31,lng:120},'常州':{name:'常州',province:'江苏',lat:31,lng:119},
  '徐州':{name:'徐州',province:'江苏',lat:34,lng:117},'扬州':{name:'扬州',province:'江苏',lat:32,lng:119},
  '镇江':{name:'镇江',province:'江苏',lat:32,lng:119},'成都':{name:'成都',province:'四川',lat:30,lng:104},
  '绵阳':{name:'绵阳',province:'四川',lat:31,lng:104},'乐山':{name:'乐山',province:'四川',lat:29,lng:103},
  '宜宾':{name:'宜宾',province:'四川',lat:28,lng:104},'泸州':{name:'泸州',province:'四川',lat:28,lng:105},
  '昆明':{name:'昆明',province:'云南',lat:25,lng:102},'大理':{name:'大理',province:'云南',lat:25,lng:100},
  '丽江':{name:'丽江',province:'云南',lat:26,lng:100},'西双版纳':{name:'西双版纳',province:'云南',lat:21,lng:100},
  '香格里拉':{name:'香格里拉',province:'云南',lat:27,lng:99},'普洱':{name:'普洱',province:'云南',lat:22,lng:100},
  '腾冲':{name:'腾冲',province:'云南',lat:25,lng:98},'长沙':{name:'长沙',province:'湖南',lat:28,lng:112},
  '张家界':{name:'张家界',province:'湖南',lat:29,lng:110},'湘西':{name:'湘西',province:'湖南',lat:28,lng:109},
  '岳阳':{name:'岳阳',province:'湖南',lat:29,lng:113},'武汉':{name:'武汉',province:'湖北',lat:30,lng:114},
  '宜昌':{name:'宜昌',province:'湖北',lat:30,lng:111},'恩施':{name:'恩施',province:'湖北',lat:30,lng:109},
  '西安':{name:'西安',province:'陕西',lat:34,lng:108},'延安':{name:'延安',province:'陕西',lat:36,lng:109},
  '青岛':{name:'青岛',province:'山东',lat:36,lng:120},'济南':{name:'济南',province:'山东',lat:36,lng:117},
  '烟台':{name:'烟台',province:'山东',lat:37,lng:121},'威海':{name:'威海',province:'山东',lat:37,lng:122},
  '厦门':{name:'厦门',province:'福建',lat:24,lng:118},'福州':{name:'福州',province:'福建',lat:26,lng:119},
  '泉州':{name:'泉州',province:'福建',lat:24,lng:118},'漳州':{name:'漳州',province:'福建',lat:24,lng:117},
  '三亚':{name:'三亚',province:'海南',lat:18,lng:109},'海口':{name:'海口',province:'海南',lat:20,lng:110},
  '桂林':{name:'桂林',province:'广西',lat:25,lng:110},'北海':{name:'北海',province:'广西',lat:21,lng:109},
  '阳朔':{name:'阳朔',province:'广西',lat:24,lng:110},'贵阳':{name:'贵阳',province:'贵州',lat:26,lng:106},
  '拉萨':{name:'拉萨',province:'西藏',lat:29,lng:91},'林芝':{name:'林芝',province:'西藏',lat:29,lng:94},
  '乌鲁木齐':{name:'乌鲁木齐',province:'新疆',lat:43,lng:87},'喀什':{name:'喀什',province:'新疆',lat:39,lng:75},
  '呼和浩特':{name:'呼和浩特',province:'内蒙古',lat:40,lng:111},'呼伦贝尔':{name:'呼伦贝尔',province:'内蒙古',lat:49,lng:119},
  '兰州':{name:'兰州',province:'甘肃',lat:36,lng:103},'敦煌':{name:'敦煌',province:'甘肃',lat:40,lng:94},
  '张掖':{name:'张掖',province:'甘肃',lat:38,lng:100},'南昌':{name:'南昌',province:'江西',lat:28,lng:115},
  '景德镇':{name:'景德镇',province:'江西',lat:29,lng:117},'郑州':{name:'郑州',province:'河南',lat:34,lng:113},
  '洛阳':{name:'洛阳',province:'河南',lat:34,lng:112},'黄山':{name:'黄山',province:'安徽',lat:30,lng:118},
  '合肥':{name:'合肥',province:'安徽',lat:31,lng:117},'大同':{name:'大同',province:'山西',lat:40,lng:113},
  '大连':{name:'大连',province:'辽宁',lat:38,lng:121},'沈阳':{name:'沈阳',province:'辽宁',lat:41,lng:123},
  '长春':{name:'长春',province:'吉林',lat:43,lng:125},'哈尔滨':{name:'哈尔滨',province:'黑龙江',lat:45,lng:126},
  '香港':{name:'香港',province:'香港',lat:22,lng:114},'澳门':{name:'澳门',province:'澳门',lat:22,lng:113},
  '台湾':{name:'台湾',province:'台湾',lat:23,lng:121},
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
  const md = d.getMonth() + 1 + '月' + d.getDate() + '日'
  const weeks = ['日','一','二','三','四','五','六']
  return md + ' 星期' + weeks[d.getDay()]
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
  { key: 'week', label: '本周' },
  { key: 'project', label: '最近项目' },
  { key: 'custom', label: '自定义时间' },
]

export default function StatsPage() {
  type TabType = 'chart' | 'detail' | 'map'
  const [activeTab, setActiveTab] = useState<TabType>('chart')
  const [bills, setBills] = useState<Bill[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [dateRange, setDateRange] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showCalendar, setShowCalendar] = useState(false)
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1)
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  const statusBarH = (Taro.getSystemInfoSync() as any).statusBarHeight || (Taro.getSystemInfoSync() as any).statusBarH || 20
  let capsuleBottom = statusBarH + 44
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === Taro.ENV_TYPE.TT
  if (isWeapp) {
    try { const mb = Taro.getMenuButtonBoundingClientRect(); if (mb && mb.bottom > 0) capsuleBottom = mb.bottom + 6 } catch (_) {}
  }

  useEffect(() => { fetchData(); fetchProjects() }, [])
  useDidShow(() => { fetchData(); fetchProjects() })

  const allCategories = useMemo(() => {
    const cats = new Set<string>()
    bills.forEach(b => { if (b.category) cats.add(b.category) })
    return ['all', ...Array.from(cats)]
  }, [bills])

  const [projectDateRange, setProjectDateRange] = useState<{start:string;end:string} | null>(null)
  useEffect(() => {
    if (bills.length > 0) {
      const dates = bills.map(b => b.bill_date).filter(Boolean)
      dates.sort()
      setProjectDateRange({ start: dates[0], end: dates[dates.length - 1] })
    }
  }, [bills])

  /* ========== 核心筛选：时间+类别同时生效 ========== */
  const filteredBills = useMemo(() => {
    if (!bills.length) return []
    const now = new Date()
    let start: Date | undefined, end: Date | undefined
    if (dateRange === 'all') { /* no filter */ }
    else if (dateRange === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    }
    else if (dateRange === 'week') {
      end = new Date(); start = new Date(end); start.setDate(start.getDate() - 7); start.setHours(0,0,0,0); end.setHours(23,59,59,999)
    }
    else if (dateRange === 'project') {
      if (projectDateRange) { start = new Date(projectDateRange.start); end = new Date(projectDateRange.end) } else return bills
    }
    else if (dateRange === 'custom') {
      if (customStartDate) {
        start = new Date(customStartDate); start.setHours(0,0,0,0)
        if (customEndDate) { end = new Date(customEndDate); end.setHours(23,59,59,999) }
        else { end = new Date(customStartDate); end.setHours(23,59,59,999) }
      } else return bills
    } else return bills

    let result = bills
    if (start && end) result = result.filter(b => { const d = new Date(b.bill_date); return d >= start! && d <= end! })
    if (filterCategory !== 'all') result = result.filter(b => b.category === filterCategory)
    return result
  }, [bills, dateRange, projectDateRange, customStartDate, customEndDate, filterCategory])

  /* ========== 计算属性 ========== */
  const totalExpense = useMemo(() =>
    filteredBills.reduce((s, b) => s + Math.abs(Number(b.amount)), 0),
    [filteredBills])

  const categoryStats = useMemo(() => {
    const m = new Map<string, number>()
    filteredBills.forEach(b => m.set(b.category, (m.get(b.category) || 0) + Math.abs(Number(b.amount))))
    return Array.from(m.entries()).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount)
  }, [filteredBills])

  const pieData = useMemo(() => {
    if (!categoryStats.length) return []
    const total = categoryStats.reduce((s, c) => s + c.amount, 0)
    return categoryStats.map((c, i) => ({
      ...c,
      percent: total > 0 ? (c.amount / total) * 100 : 0,
      color: getPieColor(i),
    }))
  }, [categoryStats])

  /* conic-gradient 预计算 */
  const pieGradientStr = useMemo(() => {
    if (!pieData.length) return '#EEF2F6'
    let cumPct = 0
    const stops: string[] = []
    for (let i = 0; i < pieData.length; i++) {
      const d = pieData[i]; const pct = d.percent
      if (pct <= 0) continue
      stops.push(d.color + ' ' + cumPct.toFixed(1) + '% ' + (cumPct + pct).toFixed(1) + '%')
      cumPct += pct
    }
    if (cumPct < 99.9) stops.push('#F0F2F5 ' + cumPct.toFixed(1) + '% 100%')
    return 'conic-gradient(from -90deg,' + stops.join(',') + ')'
  }, [pieData])

  /* 引导线标签数据 - 每个扇区中点角度 -> 外部标签位置 */
  const leaderLabels = useMemo(() => {
    if (!pieData.length) return []
    const RING_R = 56       /* 圆环中心到环中点的半径 */
    const LABEL_DIST = 88   /* 标签距离中心的距离 */
    const cx = 80, cy = 80  /* 圆心坐标 */
    return pieData.map((d, i) => {
      let cumAngle = 0
      for (let j = 0; j < i; j++) cumAngle += (pieData[j].percent / 100) * 360
      const midAngle = cumAngle + (d.percent / 100) * 180  /* 扇区中点角度（度） */
      const rad = (midAngle - 90) * Math.PI / 180             /* 转弧度，-90使0度在12点钟方向 */
      /* 环上点（引导线起点） */
      const ringX = cx + RING_R * Math.cos(rad)
      const ringY = cy + RING_R * Math.sin(rad)
      /* 标签点（引导线终点） */
      const labelX = cx + LABEL_DIST * Math.cos(rad)
      const labelY = cy + LABEL_DIST * Math.sin(rad)
      /* 折点（让引导线先水平再垂直） */
      const elbowX = cx + (RING_R + 18) * Math.cos(rad)
      const elbowY = cy + (RING_R + 18) * Math.sin(rad)
      const align = rad > Math.PI / 6 && rad < Math.PI * 5 / 6 ? 'right' : 'left'
      return { ...d, ringX, ringY, labelX, labelY, elbowX, elbowY, align }
    })
  }, [pieData])

  const maxCatAmount = categoryStats.length > 0 ? Math.max(...categoryStats.map(c => c.amount)) : 1

  /* 按项目统计 */
  const projectStats = useMemo(() => {
    const m = new Map<string, number>()
    filteredBills.forEach(b => { const pid = b.project_id || '未归类'; m.set(pid, (m.get(pid)||0)+Math.abs(Number(b.amount))) })
    const result: { name: string; amount: number }[] = []
    m.forEach((amount, pid) => { const proj = projects.find(p=>p.id===pid); result.push({ name: proj?.name||pid, amount }) })
    return result.sort((a,b)=>b.amount-a.amount)
  }, [filteredBills, projects])
  const maxProjAmount = projectStats.length > 0 ? Math.max(...projectStats.map(p=>p.amount)) : 1

  /* 按月统计 */
  const monthlyStats = useMemo(() => {
    const m = new Map<string, number>()
    filteredBills.forEach(b => { const month=(b.bill_date||'').substring(0,7); if(month)m.set(month,(m.get(month)||0)+Math.abs(Number(b.amount))) })
    return Array.from(m.entries()).map(([month,amount])=>({month,amount})).sort((a,b)=>a.month.localeCompare(b.month))
  }, [filteredBills])
  const maxMonthAmount = monthlyStats.length > 0 ? Math.max(...monthlyStats.map(m=>m.amount)) : 1

  const destinationList = useMemo(() => {
    const m = new Map<string,{amount:number;count:number;info:ReturnType<typeof recognizeCity>}>()
    filteredBills.forEach(b => {
      const dest = b.destination||''
      if(dest){ const ci=recognizeCity(dest); const key=ci?.name||dest; const prev=m.get(key)||{amount:0,count:0,info:ci}; m.set(key,{amount:prev.amount+Math.abs(Number(b.amount)),count:prev.count+1,info:ci||prev.info}) }
    })
    projects.forEach(p => {
      const txt=p.destination||p.name||''
      if(txt){ const ci=recognizeCity(txt);if(ci){const key=ci.name;const pa=p.total_amount?Number(p.total_amount):0;const prev=m.get(key)||{amount:0,count:0,info:ci};m.set(key,{amount:prev.amount+Math.abs(pa),count:prev.count+1,info:ci||prev.info})}}
    })
    return Array.from(m.entries()).map(([city,v])=>({city,...v})).sort((a,b)=>b.amount-a.amount)
  }, [filteredBills,projects])

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
  const getDaysInMonth = (y:number,m:number) => new Date(y,m,0).getDate()
  const getFirstDayWeekday = (y:number,m:number) => new Date(y,m-1,1).getDay()

  const quickRanges = [
    {label:'本周',key:'thisWeek'},{label:'本月',key:'thisMonth'},
    {label:'上周',key:'lastWeek'},{label:'上月',key:'lastMonth'},
    {label:'昨天',key:'yesterday'},{label:'今天',key:'today'},
  ]

  const applyQuick = (key:string) => {
    const now = new Date(); let e=new Date(); e.setHours(23,59,59,999); let s:Date
    if(key==='today'){s=new Date(now);s.setHours(0,0,0,0)}
    else if(key==='yesterday'){s=new Date(now);s.setDate(s.getDate()-1);s.setHours(0,0,0,0);e=new Date(s);e.setHours(23,59,59,999)}
    else if(key==='thisWeek'){const d=now.getDay()||7;s=new Date(now);s.setDate(s.getDate()-d+1);s.setHours(0,0,0,0)}
    else if(key==='lastWeek'){const d=now.getDay()||7;e=new Date(now);e.setDate(e.getDate()-d);e.setHours(23,59,59,999);s=new Date(e);s.setDate(s.getDate()-6);s.setHours(0,0,0,0)}
    else if(key==='thisMonth'){s=new Date(now.getFullYear(),now.getMonth(),1)}
    else if(key==='lastMonth'){s=new Date(now.getFullYear(),now.getMonth()-1,1);e=new Date(now.getFullYear(),now.getMonth(),0,23,59,59,999)}
    else return
    setCustomStartDate(s.toISOString().split('T')[0])
    setCustomEndDate(e.toISOString().split('T')[0])
    setDateRange('custom'); setShowCalendar(false)
  }

  const pickDate = (d:number) => {
    const ds = calYear+'-'+String(calMonth).padStart(2,'0')+'-'+String(d).padStart(2,'0')
    if(!customStartDate||(customStartDate&&customEndDate)){setCustomStartDate(ds);setCustomEndDate('')}
    else{if(ds<customStartDate){setCustomEndDate(customStartDate);setCustomStartDate(ds)}else setCustomEndDate(ds)}
  }
  const resetDateRange = () => { setCustomStartDate(''); setCustomEndDate(''); setShowCalendar(false) }
  const confirmDate = () => { if(customStartDate) setDateRange('custom'); setShowCalendar(false) }

  /* ====== 底部Tab ====== */
  const TAB_ORDER: TabType[]=['chart','detail','map']
  const TAB_LABELS: Record<TabType,{icon:any;text:string}>={
    chart:{icon:FileChartPie,text:'统计'}, detail:{icon:FileText,text:'明细'}, map:{icon:MapIcon,text:'地图'},
  }

  const renderBottomTabs = () => (
    <View style={{position:'fixed',bottom:10,left:12,right:12,display:'flex',flexDirection:'row',gap:10,zIndex:200}}>
      {TAB_ORDER.map(tab=>{
        const l=TAB_LABELS[tab]; const isActive=activeTab===tab; const IconComp=l.icon
        return(
          <View key={tab} onClick={()=>setActiveTab(tab)} style={{
            flex:1,paddingTop:10,paddingBottom:10,display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,borderRadius:22,
            backgroundColor:isActive?C.primaryR:'#FFFFFF',borderWidth:1,borderColor:isActive?C.primary:C.border,
            boxShadow:isActive?'0 1px 4px rgba(24,144,255,0.15)':'none',
          }}
          >
            <IconComp size={16} color={isActive?C.primary:C.sub} />
            <Text style={{fontSize:13,fontWeight:isActive?'600':'500',color:isActive?C.primary:'#6B7280'}}>{l.text}</Text>
          </View>
        )
      })}
    </View>
  )

  /* ====== 统一筛选栏 ====== */
  const catLabelMap:Record<string,string>={all:'全部类型',...Object.fromEntries(allCategories.slice(1).map(c=>[c,c]))}
  const dateLabelMap:Record<string,string>=Object.fromEntries(TIME_OPTIONS.map(o=>[o.key,o.label]))

  const renderFilterBar=()=>(
    <View style={{marginTop:10,marginLeft:16,marginRight:16,display:'flex',flexDirection:'row',gap:8}}>
      {/* 类别筛选 */}
      <View onClick={()=>{Taro.showActionSheet({itemList:allCategories.map(c=>c==='all'?'全部类型':c),success:r=>{setFilterCategory(allCategories[r.tapIndex])}})}} style={{
        flex:1,display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'space-between',
        paddingTop:9,paddingBottom:9,paddingLeft:14,paddingRight:14,borderRadius:20,backgroundColor:C.card,border:'1px solid '+C.border,
      }}
      >
        <Text style={{fontSize:13,color:C.text2}}>{catLabelMap[filterCategory]}</Text>
        <Text style={{fontSize:11,color:C.sub}}>▼</Text>
      </View>
      {/* 时间筛选 */}
      <View onClick={()=>{
        const handleSelect=(r:{tapIndex:number})=>{const sel=TIME_OPTIONS[r.tapIndex];if(sel.key==='custom')setShowCalendar(true);else setDateRange(sel.key)}
        Taro.showActionSheet({itemList:TIME_OPTIONS.map(o=>o.label),success:handleSelect})
      }} style={{
        flex:1,display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'space-between',
        paddingTop:9,paddingBottom:9,paddingLeft:14,paddingRight:14,borderRadius:20,backgroundColor:C.card,border:'1px solid '+C.border,
      }}
      >
        <Text style={{fontSize:13,color:C.text2}}>
          {dateRange==='custom'?((customStartDate&&customEndDate)?customStartDate.slice(5)+'~'+customEndDate.slice(5):customStartDate||'自定义时间'):dateLabelMap[dateRange]}
        </Text>
        <Text style={{fontSize:11,color:C.sub}}>▼</Text>
      </View>
    </View>
  )

  /* ====== 日历弹窗 ====== */
  const renderCalendarModal=()=>{
    if(!showCalendar) return null
    return(
      <View onClick={()=>setShowCalendar(false)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.45)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
        <View onClick={(e:any)=>e.stopPropagation()} style={{width:'92%',borderRadius:20,backgroundColor:C.card,paddingBottom:20,overflow:'hidden'}}>
          <View style={{paddingTop:16,paddingBottom:12,paddingLeft:20,paddingRight:20,display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            <Text style={{fontSize:16,fontWeight:'600',color:C.text}}>选择日期范围</Text>
            <View onClick={()=>setShowCalendar(false)} style={{padding:4}}><Text style={{fontSize:18,color:C.sub}}>✕</Text></View>
          </View>
          <View style={{display:'flex',flexDirection:'row',paddingLeft:14,paddingRight:14,gap:8}}>
            <ScrollView scrollX enhanced showScrollbar={false} style={{whiteSpace:'nowrap',maxWidth:'34%'}}>
              {quickRanges.map(qr=>(
                <View key={qr.key} onClick={()=>applyQuick(qr.key)} style={{display:'inline-block',paddingTop:6,paddingBottom:6,paddingLeft:12,paddingRight:12,borderRadius:14,backgroundColor:C.bg,border:'1px solid '+C.border,marginRight:5}}>
                  <Text style={{fontSize:12,color:C.text2}}>{qr.label}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={{flex:1,minWidth:0}}>
              <View style={{display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:14,paddingBottom:8}}>
                <View onClick={()=>{if(calMonth===1){setCalMonth(12);setCalYear(y=>y-1)}else setCalMonth(m=>m-1)}}><Text style={{fontSize:16,color:C.primary}}>‹</Text></View>
                <Text style={{fontSize:14,fontWeight:'600',color:C.text}}>{calYear}年{calMonth}月</Text>
                <View onClick={()=>{if(calMonth===12){setCalMonth(1);setCalYear(y=>y+1)}else setCalMonth(m=>m+1)}}><Text style={{fontSize:16,color:C.primary}}>›</Text></View>
              </View>
              <View style={{display:'flex',flexDirection:'row'}}>{['日','一','二','三','四','五','六'].map(d=><View key={d} style={{flex:1,textAlign:'center',paddingBottom:5}}><Text style={{fontSize:10,color:C.sub}}>{d}</Text></View>)}</View>
              <View style={{display:'flex',flexDirection:'row',flexWrap:'wrap'}}>
                {Array.from({length:getFirstDayWeekday(calYear,calMonth)}).map((_,i)=><View key={'e'+i} style={{width:'14.28%',height:30}} />)}
                {Array.from({length:getDaysInMonth(calYear,calMonth)}).map((_,i)=>{
                  const day=i+1; const ds=calYear+'-'+String(calMonth).padStart(2,'0')+'-'+String(day).padStart(2,'0')
                  const isStart=ds===customStartDate; const isEnd=ds===customEndDate
                  const isBetween=customStartDate&&customEndDate&&ds>customStartDate&&ds<customEndDate
                  return(<View key={day} onClick={()=>pickDate(day)} style={{width:'14.28%',height:30,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <View style={{width:26,height:26,borderRadius:13,display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:(isStart||isEnd)?C.primary:(isBetween?C.primaryR:'transparent')}}><Text style={{fontSize:12,color:(isStart||isEnd)?'#FFF':C.text2}}>{day}</Text></View>
                  </View>)
                })}
              </View>
              {(customStartDate||customEndDate)&&(<View style={{textAlign:'center',paddingTop:6}}><Text style={{fontSize:11,color:C.primary}}>{customStartDate||'?'} ~ {customEndDate||'选择结束日期'}</Text></View>)}
            </View>
          </View>
          <View style={{display:'flex',flexDirection:'row',gap:12,paddingTop:14,paddingLeft:18,paddingRight:18}}>
            <View onClick={resetDateRange} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',paddingTop:10,paddingBottom:10,borderRadius:20,backgroundColor:C.bg}}><Text style={{fontSize:14,color:C.sub}}>重置</Text></View>
            <View onClick={confirmDate} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',paddingTop:10,paddingBottom:10,borderRadius:20,backgroundColor:C.primary}}><Text style={{fontSize:14,color:'#FFFFFF',fontWeight:'600'}}>确定</Text></View>
          </View>
        </View>
      </View>
    )
  }

  /* ====== 卡片容器样式 ====== */
  const cardStyle = { borderRadius: 16, backgroundColor: C.card, padding: 16, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }

  /* ====== 竖向柱状图组件 ====== */
  const renderVerticalBars = (data:{label:string;value:number}[], title:string, maxVal:number, barColor:string) => {
    if(!data.length) return null
    const barW = Math.max(18, Math.min(40, Math.floor(300/data.length)-10))
    return (
      <View style={cardStyle}>
        <Text style={{fontSize:15,fontWeight:'600',color:C.text,display:'block',marginBottom:16}}>{title}</Text>
        <View style={{display:'flex',flexDirection:'row',alignItems:'flex-end',justifyContent:'space-around',paddingLeft:6,paddingRight:6,height:170}}>
          {data.map(item=>{
            const hp = maxVal>0?(item.value/maxVal)*100:0
            const barH = Math.max(hp*1.5,6)
            return (
              <View key={item.label} style={{alignItems:'center',width:barW+6,flexShrink:0}}>
                <Text style={{fontSize:10,color:C.sub,marginBottom:4,display:'block'}}>
                  {'¥'+(item.value>=1000?(item.value/1000).toFixed(1)+'k':item.value.toFixed(0))}
                </Text>
                <View style={{width:barW,height:barH,borderRadius:[6,6,0,0] as any,backgroundColor:barColor,minHeight:6}} />
                <Text style={{fontSize:10,color:C.sub,marginTop:6,display:'block',textAlign:'center',maxWidth:barW+6}}>{item.label.length>4?item.label.substring(0,4):item.label}</Text>
              </View>
            )
          })}
        </View>
      </View>
    )
  }

  /* ====== 环形图组件：居中显示 + 引导线外部标签 ====== */
  const renderDonutChart=()=>{
    if(!categoryStats.length){
      return(
        <View style={{...cardStyle,alignItems:'center',paddingTop:32,paddingBottom:32}}>
          <FileChartPie size={40} color="#D1D5DB" />
          <Text style={{fontSize:14,color:C.sub,marginTop:10,display:'block'}}>暂无数据</Text>
        </View>
      )
    }
    return(
      <View style={cardStyle}>
        <Text style={{fontSize:15,fontWeight:'600',color:C.text,display:'block',marginBottom:8}}>支出构成</Text>

        {/* 环形图区域 - 居中布局，宽160高200留足引导线空间 */}
        <View style={{position:'relative',width:160,height:200,alignSelf:'center',marginTop:4,marginBottom:4}}>
          {/* 圆环本体 */}
          <View style={{position:'absolute',left:0,top:20,width:160,height:160,borderRadius:80,overflow:'hidden',border:'1px solid #F0F0F0'}}>
            <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,borderRadius:80,background:pieGradientStr}} />
            {/* 内圆遮罩 */}
            <View style={{position:'absolute',top:46,left:46,right:46,bottom:46,borderRadius:34,backgroundColor:C.card,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:12,color:C.sub,display:'block'}}>共</Text>
              <Text style={{fontSize:26,fontWeight:'700',color:C.text}}>{categoryStats.length}</Text>
              <Text style={{fontSize:12,color:C.sub,display:'block'}}>类</Text>
            </View>
          </View>

          {/* 引导线 + 外部标签 */}
          {leaderLabels.map(ll=>{
            const isRight=ll.labelX>=80
            return (
              <View key={ll.name}>
                {/* 引导线 + 标签容器 */}
                <View style={{
                  flexDirection:isRight?'row':'row-reverse',
                  alignItems:'flex-start',
                  position:'absolute',
                  left:isRight?ll.ringX:undefined,
                  right:isRight?undefined:160-ll.ringX,
                  top:ll.ringY-4,
                  width:160-(isRight?ll.ringX:160-ll.ringX)-8,
                }}
                >
                  {/* 小圆点 */}
                  <View style={{width:6,height:6,borderRadius:3,backgroundColor:ll.color,marginTop:4,flexShrink:0}} />
                  {/* 水平线 */}
                  <View style={{flex:1,height:1,backgroundColor:ll.color,opacity:0.4,marginTop:7,marginLeft:4}} />
                  {/* 标签 */}
                  <View style={{marginLeft:4}}>
                    <Text style={{fontSize:11,fontWeight:'600',color:ll.color}}>{ll.name}</Text>
                    <Text style={{fontSize:10,color:'#9CA3AF'}}>{ll.percent.toFixed(1)}%</Text>
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        {/* 底部总计 */}
        <Text style={{fontSize:12,color:C.sub,textAlign:'center',display:'block',marginTop:4}}>{'总计 ¥'+totalExpense.toFixed(0)}</Text>
      </View>
    )
  }

  return (
    <View className="flex flex-col h-full" style={{backgroundColor:C.bg}}>
      {renderCalendarModal()}

      {/* ==================== 统计 Tab ==================== */}
      {activeTab === 'chart' && (
        <>
          {/* 固定Header - 渐变蓝色 */}
          <View style={{position:'fixed',top:0,left:0,right:0,zIndex:100,background:'linear-gradient(135deg,#1890FF 0%,#096DD9 100%)'}}>
            <View style={{paddingTop:statusBarH,paddingBottom:capsuleBottom,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:17,fontWeight:'700',color:'#FFFFFF'}}>支出分析</Text>
            </View>
            <View style={{paddingLeft:16,paddingRight:16,paddingBottom:14,display:'flex',flexDirection:'row',alignItems:'baseline',justifyContent:'space-between'}}>
              <View><Text style={{fontSize:13,color:'rgba(255,255,255,0.8)',display:'block'}}>共支出</Text><Text style={{fontSize:28,fontWeight:'700',color:'#FFFFFF',letterSpacing:-0.5}}>{'¥'+totalExpense.toFixed(2)}</Text></View>
              <Text style={{fontSize:12,color:'rgba(255,255,255,0.65)'}}>{categoryStats.length+' 个类别'}</Text>
            </View>
          </View>

          {/* 筛选栏 - 固定在Header下方 */}
          <View style={{position:'fixed',top:chartHeaderH,left:0,right:0,zIndex:99,backgroundColor:C.bg,paddingBottom:6}}>
            {renderFilterBar()}
          </View>

          {/* 滚动内容 */}
          <ScrollView scrollY enhanced showScrollbar={false} style={{flex:1,marginTop:chartHeaderH+58,marginBottom:70}}>
            <View style={{padding:12,display:'flex',flexDirection:'column',gap:12}}>

              {/* 环形图 */}
              {renderDonutChart()}

              {/* 分类排行 - 横向条形图 */}
              {categoryStats.length>0 && (
                <View style={cardStyle}>
                  <Text style={{fontSize:15,fontWeight:'600',color:C.text,display:'block',marginBottom:14}}>分类排行</Text>
                  <View style={{display:'flex',flexDirection:'column',gap:12}}>
                    {categoryStats.map(cat=>{
                      const cfg=getCategoryConfig(cat.name); const IconComp=cfg.icon
                      const pct=maxCatAmount>0?(cat.amount/maxCatAmount)*100:0
                      const cColor=pieData.find(p=>p.name===cat.name)?.color||PIE_COLORS[0]
                      return (
                        <View key={cat.name}>
                          <View style={{display:'flex',flexDirection:'row',alignItems:'center',gap:10,marginBottom:5}}>
                            <View style={{width:32,height:32,borderRadius:16,backgroundColor:cfg.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><IconComp size={14} color={cfg.color} /></View>
                            <Text style={{fontSize:13,color:C.text2,flex:1}}>{cat.name}</Text>
                            <Text style={{fontSize:14,fontWeight:'600',color:C.text,flexShrink:0}}>{'¥'+cat.amount.toFixed(2)}</Text>
                          </View>
                          <View style={{height:7,borderRadius:3.5,backgroundColor:'#F3F4F6',overflow:'hidden',marginLeft:42}}>
                            <View style={{width:Math.max(pct,1.5)+'%',height:'100%',borderRadius:3.5,backgroundColor:cColor}} />
                          </View>
                        </View>
                      )
                    })}
                  </View>
                </View>
              )}

              {/* 竖向柱状图：按项目 */}
              {renderVerticalBars(projectStats.slice(0,7).map(p=>({label:p.name,value:p.amount})),'按项目统计',maxProjAmount,C.primary)}

              {/* 竖向柱状图：按月 */}
              {monthlyStats.length>0 && renderVerticalBars(monthlyStats.map(m=>({label:m.month.substring(5)+'月',value:m.amount})),'每月支出趋势',maxMonthAmount,'#61DDAA')}

            </View>
          </ScrollView>
        </>
      )}

      {/* ==================== 明细 Tab ==================== */}
      {activeTab === 'detail' && (
        <>
          <View style={{position:'fixed',top:0,left:0,right:0,zIndex:100,background:'linear-gradient(135deg,#1890FF 0%,#096DD9 100%)'}}>
            <View style={{paddingTop:statusBarH,paddingBottom:capsuleBottom,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:17,fontWeight:'700',color:'#FFFFFF'}}>账单明细</Text>
            </View>
            <View style={{padding:'12px 16px 14px',display:'flex',flexDirection:'row',alignItems:'baseline',gap:8}}>
              <Text style={{fontSize:13,color:'rgba(255,255,255,0.85)'}}>总支出</Text>
              <View style={{flex:1}} />
              <Text style={{fontSize:24,fontWeight:'700',color:'#FFFFFF'}}>{'¥'+totalExpense.toFixed(2)}</Text>
            </View>
          </View>

          <View style={{position:'fixed',top:detailHeaderH,left:0,right:0,zIndex:99,backgroundColor:C.bg,paddingBottom:6}}>
            {renderFilterBar()}
          </View>

          <ScrollView scrollY enhanced showScrollbar={false} style={{flex:1,marginTop:detailHeaderH+58,marginBottom:70}}>
            <View style={{padding:12,display:'flex',flexDirection:'column',gap:10}}>
              {(()=>{
                const grouped:Record<string,Bill[]>={}
                filteredBills.forEach(b=>{const date=(b.bill_date||'').split('T')[0];if(!grouped[date])grouped[date]=[];grouped[date].push(b)})
                const sortedDates=Object.keys(grouped).sort().reverse()
                if(!sortedDates.length)return(<View style={{...cardStyle,alignItems:'center',padding:40}}><FileText size={40}color="#D1D5DB" /><Text style={{fontSize:14,color:C.sub,marginTop:10,display:'block'}}>暂无明细</Text></View>)
                return sortedDates.map(date=>{
                  const items=grouped[date]; const dayOut=items.reduce((s,i)=>s+Math.abs(Number(i.amount)),0)
                  return(
                    <View key={date} style={{...cardStyle,marginBottom:10,overflow:'hidden'}}>
                      <View style={{paddingTop:10,paddingBottom:10,paddingLeft:14,paddingRight:14,display:'flex',flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#FAFBFC'}}>
                        <Text style={{fontSize:14,fontWeight:'600',color:C.text2,display:'block'}}>{getDayLabel(date)}</Text>
                        <Text style={{fontSize:12,color:C.sub,display:'block'}}>{'¥'+dayOut.toFixed(2)}</Text>
                      </View>
                      {items.map((bill,bi)=>{
                        const cc=getCategoryConfig(bill.category); const IconComp=cc.icon; const amt=Number(bill.amount)
                        return(
                          <View key={bill.id+'-'+bi} style={{paddingTop:11,paddingBottom:11,paddingLeft:14,paddingRight:14,display:'flex',flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:bi<items.length-1?0.5:0,borderBottomColor:'#F3F4F6'}}>
                            <View style={{width:36,height:36,borderRadius:18,backgroundColor:cc.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><IconComp size={16}color={cc.color} /></View>
                            <View style={{flex:1,minWidth:0}}>
                              <Text style={{fontSize:14,color:C.text,display:'block'}}>{bill.name}</Text>
                              <Text style={{fontSize:11,color:C.sub,display:'block',marginTop:1}}>{[bill.payer,bill.note].filter(Boolean).join(' · ')}</Text>
                            </View>
                            <Text style={{fontSize:15,fontWeight:'600',color:bill.is_treat?'#D97706':C.text,flexShrink:0}}>{'¥'+Math.abs(amt).toFixed(2)}</Text>
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
          <View style={{position:'fixed',top:0,left:0,right:0,zIndex:100,backgroundColor:C.card}}>
            <View style={{paddingTop:statusBarH,paddingBottom:capsuleBottom,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:17,fontWeight:'700',color:C.text}}>足迹地图</Text>
            </View>
          </View>

          <ScrollView scrollY enhanced showScrollbar={false} style={{flex:1,marginTop:mapHeaderH,marginBottom:70}}>
            {(()=>{
              const visitedNames=new Set<string>()
              projects.forEach(p=>{const txt=p.destination||p.name||'';if(txt){Object.keys(CITY_DB).forEach(k=>{if(txt.includes(k))visitedNames.add(k)});try{const ci=recognizeCity(txt);if(ci&&ci.name)visitedNames.add(ci.name)}catch(_){}}})
              destinationList.forEach(d=>{if(d.info&&d.info.name)visitedNames.add(d.info.name);else if(d.city)visitedNames.add(d.city)})
              const vArr=Array.from(visitedNames)

              const cityToProv:Record<string,string>={
                '北京':'北京','天津':'天津','上海':'上海','重庆':'重庆','哈尔滨':'黑龙江','长春':'吉林','沈阳':'辽宁','呼和浩特':'内蒙古','石家庄':'河北','太原':'山西','济南':'山东','青岛':'山东','郑州':'河南',
                '合肥':'安徽','南京':'江苏','苏州':'江苏','无锡':'江苏','常州':'江苏','扬州':'江苏','镇江':'江苏','徐州':'江苏','杭州':'浙江','宁波':'浙江','温州':'浙江','绍兴':'浙江','嘉兴':'浙江','湖州':'浙江','金华':'浙江','台州':'浙江',
                '黄山':'安徽','福州':'福建','厦门':'福建','泉州':'福建','南昌':'江西','长沙':'湖南','武汉':'湖北','广州':'广东','深圳':'广东','东莞':'广东','佛山':'广东','惠州':'广东','桂林':'广西','南宁':'广西','海口':'海南','三亚':'海南',
                '成都':'四川','贵阳':'贵州','昆明':'云南','拉萨':'西藏','西安':'陕西','兰州':'甘肃','西宁':'青海','银川':'宁夏','乌鲁木齐':'新疆','喀什':'新疆','大连':'辽宁','烟台':'山东','威海':'山东',
              }
              const visitedProvs=new Set<string>(); vArr.forEach(city=>{const p=cityToProv[city];if(p)visitedProvs.add(p)})
              const totalDestAmt=destinationList.reduce((s,d)=>s+d.amount,0)

              return(
                <View style={{padding:12,display:'flex',flexDirection:'column',gap:12}}>
                  {/* 地图卡片 */}
                  <View style={{...cardStyle,padding:0,overflow:'hidden'}}>
                    {/* 地图可视化区域 */}
                    <View style={{width:'100%',height:340,backgroundColor:'#F8FAFC',position:'relative',overflow:'hidden'}}>

                      {/* 中国地图轮廓 - 用View模拟 */}
                      <View style={{
                        position:'absolute',left:'8%',top:'6%',width:'78%',height:'80%',
                        borderRadius:'48% 52% 46% 54% / 52% 48% 52% 48%',
                        backgroundColor:'#F0F7FF',borderWidth:1.5,borderColor:'#BAE0FF',
                      }}
                      />
                      {/* 南海诸岛标注 */}
                      <View style={{position:'absolute',right:'12%',bottom:'8%',paddingLeft:10,paddingRight:8,paddingTop:4,paddingBottom:4,borderRadius:6,backgroundColor:'#F0F7FF',borderWidth:1,borderColor:'#E6F4FF'}}>
                        <Text style={{fontSize:9,color:C.sub}}>南海诸岛</Text>
                      </View>

                      {/* 已访问省份区域标记 */}
                      {Array.from(visitedProvs).map(prov=>{
                        const posMap:Record<string,{x:number;y:number}>={
                          '北京':{x:220,y:105},'天津':{x:235,y:115},'上海':{x:315,y:185},'重庆':{x:175,y:225},
                          '黑龙江':{x:275,y:45},'吉林':{x:270,y:75},'辽宁':{x:255,y:95},'内蒙古':{x:165,y:70},
                          '河北':{x:225,y:125},'山西':{x:195,y:140},'山东':{x:250,y:150},'河南':{x:210,y:175},
                          '江苏':{x:265,y:165},'安徽':{x:240,y:185},'浙江':{x:280,y:195},'福建':{x:270,y:235},
                          '江西':{x:240,y:215},'湖北':{x:205,y:195},'湖南':{x:210,y:235},'广东':{x:220,y:280},
                          '广西':{x:185,y:280},'海南':{x:205,y:320},'四川':{x:145,y:215},'贵州':{x:175,y:255},
                          '云南':{x:135,y:275},'西藏':{x:85,y:210},'陕西':{x:185,y:170},'甘肃':{x:145,y:145},
                          '青海':{x:120,y:170},'宁夏':{x:165,y:145},'新疆':{x:65,y:110},
                        }
                        const pos=posMap[prov]; if(!pos)return null
                        return(
                          <View key={prov} style={{position:'absolute',left:pos.x+'%',top:pos.y+'%',width:28,height:20,borderRadius:4,backgroundColor:'rgba(24,144,255,0.12)',borderWidth:1,borderColor:'rgba(24,144,255,0.35)'}}>
                            <Text style={{fontSize:7,color:C.primary,fontWeight:'500',textAlign:'center'}}>{prov}</Text>
                          </View>
                        )
                      })}

                      {/* 城市点位 */}
                      {vArr.map((cn,i)=>{
                        const cp:Record<string,{x:number;y:number}>={
                          '北京':{x:222,y:108},'天津':{x:235,y:118},'上海':{x:318,y:188},'重庆':{x:178,y:228},'西安':{x:188,y:172},
                          '成都':{x:148,y:218},'广州':{x:222,y:283},'深圳':{x:228,y:290},'杭州':{x:285,y:198},'南京':{x:268,y:168},'武汉':{x:212,y:198},
                          '长沙':{x:216,y:240},'郑州':{x:214,y:162},'济南':{x:256,y:155},'青岛':{x:272,y:148},'大连':{x:268,y:98},'沈阳':{x:265,y:82},
                          '哈尔滨':{x:285,y:52},'长春':{x:278,y:68},'呼和浩特':{x:182,y:92},'太原':{x:196,y:148},'石家庄':{x:214,y:136},'合肥':{x:248,y:178},
                          '福州':{x:275,y:245},'厦门':{x:268,y:265},'南宁':{x:186,y:288},'海口':{x:208,y:325},'昆明':{x:138,y:282},'贵阳':{x:178,y:262},
                          '拉萨':{x:92,y:218},'乌鲁木齐':{x:72,y:118},'兰州':{x:152,y:158},'西宁':{x:128,y:175},'银川':{x:168,y:152},'南昌':{x:248,y:208},'苏州':{x:282,y:178},'宁波':{x:298,y:192},
                        }
                        const p=cp[cn]||{x:50+(i*7)%45,y:30+(i*11)%45}
                        return(
                          <View key={cn+i} style={{position:'absolute',left:p.x+'%',top:p.y+'%',alignItems:'center'}}>
                            <View style={{width:7,height:7,borderRadius:3.5,backgroundColor:C.primary}} />
                            <Text style={{fontSize:8,color:'#64748B',marginLeft:1}}>{cn.length>3?cn.substring(0,3):cn}</Text>
                          </View>
                        )
                      })}
                    </View>

                    {/* 底部统计栏 */}
                    <View style={{padding:'14px 16px',display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTop:'1px solid '+C.border}}>
                      <View style={{display:'flex',flexDirection:'row',alignItems:'baseline'}}>
                        <Text style={{fontSize:12,color:C.sub}}>累计点亮 </Text>
                        <Text style={{fontSize:20,fontWeight:'700',color:C.primary}}>{vArr.length}</Text>
                        <Text style={{fontSize:12,color:C.sub}}> 市 / {visitedProvs.size} 省</Text>
                      </View>
                      <Text style={{fontSize:12,color:C.sub}}>总花费 ¥{totalDestAmt.toFixed(0)}</Text>
                    </View>
                  </View>

                  {/* 已涉足城市列表 */}
                  {destinationList.length>0 && (
                    <View style={cardStyle}>
                      <View style={{display:'flex',flexDirection:'row',justifyContent:'space-between',marginBottom:12}}>
                        <Text style={{fontSize:14,fontWeight:'600',color:C.text}}>已涉足城市({destinationList.length})</Text>
                        <Text style={{fontSize:12,color:C.primary,fontWeight:'500'}}>{'¥'+totalDestAmt.toFixed(0)}</Text>
                      </View>
                      <View style={{display:'flex',flexDirection:'row',flexWrap:'wrap',gap:8}}>
                        {destinationList.map((d,i)=>(
                          <View key={d.city} style={{display:'flex',flexDirection:'row',alignItems:'center',gap:5,paddingLeft:12,paddingRight:12,paddingTop:5,paddingBottom:5,borderRadius:14,backgroundColor:C.bg}}>
                            <View style={{width:6,height:6,borderRadius:3,backgroundColor:getPieColor(i)}} />
                            <Text style={{fontSize:12,color:C.text2}}>{d.city}</Text>
                            <Text style={{fontSize:11,color:C.sub}}>{'¥'+d.amount.toFixed(0)}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {destinationList.length===0 && (
                    <View style={{...cardStyle,alignItems:'center',padding:44}}>
                      <MapIcon size={44}color="#D1D5DB" /><Text style={{fontSize:14,color:C.sub,marginTop:10,display:'block'}}>暂无足迹数据</Text>
                    </View>
                  )}
                </View>
              )
            })()}
          </ScrollView>
        </>
      )}

      {/* 底部Tab */}
      {renderBottomTabs()}
    </View>
  )
}
