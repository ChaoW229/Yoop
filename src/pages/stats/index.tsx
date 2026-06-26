import { useState, useEffect, useMemo, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { Network } from '@/network'

/* ── 类型定义 ─────────────────────────────── */
interface Bill {
  id: string; amount: number; category: string; note: string; payer: string
  project_id: string; created_at: string; location?: string
}
interface Project {
  id: string; name: string; start_date: string; end_date: string
}
type DateRange = 'all' | 'this_month' | 'last_month' | 'recent' | 'custom'

/* ── 常量配置（匹配首页温暖风格）── */
const CATEGORY_CONFIG = {
  food:     { icon: '\u{1F37D}', label: '餐饮', color: '#E8A87C', bg: '#FEF3EC' },
  traffic:  { icon: '\u{1F697}', label: '交通', color: '#85B6C8', bg: '#EEF5F8' },
  hotel:    { icon: '\u{1F3E8}', label: '住宿', color: '#D4A574', bg: '#FBF4ED' },
  ticket:   { icon: '\u{1F391}', label: '门票', color: '#9BB89B', bg:'#F0F7FF' },
  shopping: { icon: '\u{1F6CD}', label: '购物', color: '#C9929E', bg: '#FEF0F3' },
  activity: { icon: '\u{1F383}', label: '娱乐', color: '#D4A0B5', bg: '#FAEDF4' },
  other:    { icon: '\u2753',      label: '其他', color: '#B5B5B5', bg: '#F5F5F5' },
}
const DATE_OPTIONS: Record<string, string> = { all:'全部时间', this_month:'本月', last_month:'上月', recent:'最近项目', custom:'自定义' }
const CAT_OPTIONS = [{ key: 'all', label: '全部类别' }, ...Object.entries(CATEGORY_CONFIG).map(([k,v]) => ({ key: k, label: v.label }))]

/* ── 工具函数 ─────────────────────────────── */
const fmt = (n:number) => n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const fmtDate = (s:string) => {
  const d = new Date(s)
  return `${d.getMonth()+1}月${d.getDate()}日 ${['日','一','二','三','四','五','六'][d.getDay()]}`
}

/* ── 主组件 ───────────────────────────────── */
export default function StatsPage() {
  /* ── 状态 ── */
  const [bills, setBills] = useState<Bill[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Picker 显示状态
  const [showCatPicker, setShowCatPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)

  // Tab 切换
  const [activeTab, setActiveTab] = useState<'stats'|'detail'|'map'>('stats')
  const statusBarH = (Taro.getSystemInfoSync() as any).statusBarHeight || 20

  /* ── 数据加载 ── */
  useEffect(() => {
    async function load() {
      try {
        console.log('[stats] Loading data...')
        const res = await Network.request({ url: '/api/bills' })
        console.log('[stats] bills response:', JSON.stringify(res.data))
        if (res.data && res.data.code === 200) {
          setBills(res.data.data || [])
          const pRes = await Network.request({ url: '/api/projects' })
          if (pRes.data?.data) setProjects(pRes.data.data)
        }
      } catch (e) {
        console.error('[stats] Load error:', e)
        if ((e as any)?.response?.data) {
          try { console.error('[stats] Error body:', JSON.stringify((e as any).response.data)) } catch {}
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  /* ── 日期筛选逻辑 ── */
  const pickDate = useCallback((d:Date) => {
    const s = d.toISOString().split('T')[0]
    if (!customStartDate || customEndDate) { setCustomStartDate(s); setCustomEndDate('') }
    else { setCustomEndDate(s) }
  }, [customStartDate, customEndDate])

  const confirmDate = () => {
    if (customStartDate) setDateRange('custom')
    setShowCalendar(false)
  }

  const resetDateRange = () => {
    setCustomStartDate(''); setCustomEndDate(''); setShowCalendar(false)
  }

  const getCalendarDays = (): Date[] => {
    const now = new Date()
    const y = now.getMonth(), m = now.getFullYear()
    const first = new Date(m, y, 1), last = new Date(m, y + 1, 0)
    const days: Date[] = []
    for (let d = first; d <= last; d.setDate(d.getDate() + 1)) days.push(new Date(d))
    return days
  }

  /* ── 计算属性 ── */
  const filteredBills = useMemo(() => {
    let result = [...bills]
    if (filterCategory !== 'all') result = result.filter(b => b.category === filterCategory)
    if (dateRange === 'all') return result
    const now = new Date()
    let start: Date, end: Date = now
    switch(dateRange) {
      case 'this_month': start = new Date(now.getFullYear(),now.getMonth(),1); break
      case 'last_month': start = new Date(now.getFullYear(),now.getMonth()-1,1); end = new Date(now.getFullYear(),now.getMonth(),0); break
      case 'recent':
        if (projects.length > 0) {
          const ps = projects.map(p => new Date(p.start_date)).sort()
          start = ps[0]
        } else { const t = new Date(); t.setDate(t.getDate()-30); start = t }
        break
      case 'custom': start = new Date(customStartDate); end = new Date(customEndDate+'T23:59:59'); break
      default: return result
    }
    return result.filter(b => {
      const d = new Date(b.created_at)
      return d >= start && d <= end
    })
  }, [bills, filterCategory, dateRange, projects, customStartDate, customEndDate])

  const totalExpense = useMemo(() => filteredBills.reduce((s,b)=>s+b.amount,0), [filteredBills])

  const categoryStats = useMemo(() => {
    const map:Record<string,{amount:number,count:number}>={}
    for(const b of filteredBills){
      if(!map[b.category]) map[b.category]={amount:0,count:0}
      map[b.category].amount+=b.amount
      map[b.category].count+=1
    }
    return Object.entries(map).sort((a,b)=>b[1].amount-a[1].amount).map(([name,v])=>({...v,name,color:CATEGORY_CONFIG[name as keyof typeof CATEGORY_CONFIG]?.color||'#999',label:CATEGORY_CONFIG[name as keyof typeof CATEGORY_CONFIG]?.label||name}))
  },[filteredBills])

  // 圆环图数据 & 渐变字符串
  const pieData=useMemo(()=>{
    if(!categoryStats.length)return[]
    const max=categoryStats[0].amount
    return categoryStats.map(c=>({name:c.name,label:c.label,amount:c.amount,color:c.color,percent:c.amount/totalExpense*100,ratio:c.amount/max}))
  },[categoryStats,totalExpense])
  
  const pieGradientStr=useMemo(()=>{
    if(!pieData.length) return '#E5E7EB'
    let cum=0,stops:string[]=[]
    for(let i=0;i<pieData.length;i++){
      const d=pieData[i];const p=d.percent
      if(p<=0)continue
      stops.push(`${d.color} ${cum.toFixed(1)}% ${(cum+p).toFixed(1)}%`)
      cum+=p
    }
    if(cum<99.9) stops.push(`#F3F4F6 ${cum.toFixed(1)}% 100%`)
    return `conic-gradient(from -90deg,${stops.join(',')})`
  },[pieData])

  // 按项目统计
  const projectStats=useMemo(()=>{
    const map:Record<string,number>={};for(const b of filteredBills){if(!map[b.project_id])map[b.project_id]=0;map[b.project_id]+=b.amount}
    return Object.entries(map).map(([id,a])=>({id,name:(projects.find(p=>p.id===id)||{}).name||id,amount:a})).sort((a,b)=>b.amount-a.amount)
  },[filteredBills,projects])

  // 按月统计
  const monthlyStats=useMemo(()=>{
    const map:Record<string,number>={};for(const b of filteredBills){
      const k=b.created_at.substring(0,7);if(!map[k])map[k]=0;map[k]+=b.amount
    }
    return Object.entries(map).sort().map(([m,a])=>({month:m,amount:a}))
  },[filteredBills])

  // 明细按日期分组
  const groupedBills=useMemo(()=>{
    const g:Record<string,Bill[]>={};for(const b of filteredBills){
      const d=b.created_at.substring(0,10);if(!g[d])g[d]=[];g[d].push(b)
    }
    return Object.keys(g).sort().reverse().map(d=>({date:d,bills:g[d],total:g[d].reduce((s,b)=>s+b.amount,0)}))
  },[filteredBills])

  // 城市列表（地图用）
  const cityList=useMemo(()=>{const s=new Set<string>();for(const b of bills)if(b.location)s.add(b.location);return Array.from(s)},[bills])

  /* ── 日历快捷选项 ── */
  const quickOptions=[{label:'全部',key:'all'},{label:'本月',key:'this_month'},{label:'上月',key:'last_month'},{label:'最近项目',key:'recent'},{label:'今天',key:'today'}]

  /* ════════════ RENDER ════════════ */

  /* ---- Header 固定顶栏 ---- */
  function renderHeader(){
    return (
      <View style={{position:'fixed',top:0,left:0,right:0,zIndex:100,backgroundColor:'#FFFFFF'}}>
        <View style={{paddingTop:statusBarH,height:statusBarH+44,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Text style={{fontSize:17,fontWeight:'600',color:'#333'}}>{activeTab==='stats'?'支出分析':activeTab==='detail'?'账单明细':'足迹地图'}</Text>
        </View>
        <View style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',paddingLeft:16,paddingRight:16,paddingBottom:12}}>
          <Text style={{fontSize:13,color:'#888'}}>共支出</Text>
          <Text style={{fontSize:28,fontWeight:'700',color:'#333'}}>{'\u00A5'+fmt(totalExpense)}</Text>
        </View>
        {/* 筛选栏 */}
        <View style={{display:'flex',flexDirection:'row',gap:8,paddingLeft:16,paddingRight:16,paddingBottom:10}}>
          <View onClick={()=>setShowCatPicker(true)}
            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'space-between',height:36,borderRadius:20,backgroundColor:'#F7F7F7',paddingLeft:14,paddingRight:14}}
          >
            <Text style={{fontSize:13,color:'#555'}}>{CAT_OPTIONS.find(o=>o.key===filterCategory)?.label}</Text>
            <Text style={{fontSize:11,color:'#AAA'}}>▼</Text>
          </View>
          <View onClick={()=>setShowDatePicker(true)}
            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'space-between',height:36,borderRadius:20,backgroundColor:'#F7F7F7',paddingLeft:14,paddingRight:14}}
          >
            <Text style={{fontSize:13,color:'#555'}}>{DATE_OPTIONS[dateRange]}</Text>
            <Text style={{fontSize:11,color:'#AAA'}}>▼</Text>
          </View>
        </View>
        {/* 分隔线 */}
        <View style={{height:1,backgroundColor:'#EEE'}} />
        {/* Tab 栏 */}
        <View style={{display:'flex',flexDirection:'row'}}>
          {[['stats','\u{1F4CA} 统计'],['detail','\u{1F4CB} 明细'],['map','\u{1F5FA} 地图']].map(([k,t])=>(
            <View key={k} onClick={()=>setActiveTab(k as any)}
              style={{flex:1,height:42,display:'flex',alignItems:'center',justifyContent:'center',
                borderBottomWidth:activeTab===k?2:0,borderBottomColor:activeTab===k?'#1890FF':'transparent'}}
            >
              <Text style={{fontSize:14,fontWeight:activeTab===k?'600':'400',color:activeTab===k?'#1890FF':'#888'}}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  /* ---- 类别选择器弹窗 ---- */
  function renderCatPicker(){if(!showCatPicker)return null;
    return (
      <View onClick={()=>setShowCatPicker(false)} style={{position:'fixed',inset:0,zIndex:200,backgroundColor:'rgba(0,0,0,0.15)'}}>
        <View onClick={(e:any)=>e.stopPropagation()} style={{backgroundColor:'#FFF',borderRadius:14,maxHeight:400,overflow:'hidden',margin:80}}>
          <View style={{padding:14,borderBottomWidth:1,borderBottomColor:'#F0F0F0'}}>
            <Text style={{fontSize:15,fontWeight:'600',color:'#333'}}>选择分类</Text>
          </View>
          {CAT_OPTIONS.map(opt=>(
            <View key={opt.key} onClick={()=>{setFilterCategory(opt.key);setShowCatPicker(false)}}
              style={{display:'flex',alignItems:'center',gap:10,padding:14,
                backgroundColor:opt.key===filterCategory?'#F0F7FF':'transparent'}}
            >
              {opt.key!=='all'&&<Text style={{fontSize:18}}>{CATEGORY_CONFIG[opt.key as keyof typeof CATEGORY_CONFIG]?.icon}</Text>}
              <Text style={{fontSize:14,color:'#333'}}>{opt.label}</Text>
              {opt.key===filterCategory&&<Text style={{marginLeft:'auto',color:'#1890FF',fontSize:14}}>✓</Text>}
            </View>
          ))}
        </View>
      </View>
    )
  }

  /* ---- 日期选择器弹窗 ---- */
  function renderDatePicker(){if(!showDatePicker)return null;
    return (
      <View onClick={()=>setShowDatePicker(false)} style={{position:'fixed',inset:0,zIndex:200,backgroundColor:'rgba(0,0,0,0.15)'}}>
        <View onClick={(e:any)=>e.stopPropagation()} style={{backgroundColor:'#FFF',borderRadius:14,maxHeight:500,margin:60}}>
          <View style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:14}}>
            <Text style={{fontSize:15,fontWeight:'600',color:'#333'}}>选择日期范围</Text>
            <Text onClick={()=>setShowDatePicker(false)} style={{fontSize:18,color:'#AAA'}}>✕</Text>
          </View>
          {/* 快捷选项 */}
          <View style={{paddingLeft:14,paddingRight:14}}>
            {quickOptions.map(qo=>(
              <View key={qo.key} onClick={()=>{setDateRange(qo.key as DateRange);setShowDatePicker(false);setShowCalendar(false);if(qo.key!=='custom'){setCustomStartDate('');setCustomEndDate('')}}}
                style={{paddingTop:12,paddingBottom:12,borderBottomWidth:1,borderBottomColor:'#F5F5F5'}}
              >
                <Text style={{fontSize:14,color:dateRange===qo.key?'#1890FF':'#333',fontWeight:dateRange===qo.key?'600':'400'}}>{qo.label}</Text>
              </View>
            ))}
            <View onClick={()=>{setShowDatePicker(false);setShowCalendar(true)}} style={{paddingTop:12,paddingBottom:12}}>
              <Text style={{fontSize:14,color:'#1890FF'}}>自定义时间</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  /* ---- 自定义日历弹窗 ---- */
  function renderCalendar(){if(!showCalendar)return null;
    const days=getCalendarDays();const today=new Date().toISOString().split('T')[0]
    const monthNames=['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
    return (
      <View onClick={()=>setShowCalendar(false)} style={{position:'fixed',inset:0,zIndex:300,backgroundColor:'rgba(0,0,0,0.25)'}}>
        <View onClick={(e:any)=>e.stopPropagation()} style={{backgroundColor:'#FFF',borderRadius:16,margin:50,overflow:'hidden'}}>
          <View style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:16}}>
            <Text style={{fontSize:16,fontWeight:'600',color:'#333'}}>自定义日历</Text>
            <Text onClick={()=>setShowCalendar(false)} style={{fontSize:18,color:'#AAA',padding:4}}>✕</Text>
          </View>
          <View style={{paddingLeft:16,paddingRight:16,paddingBottom:4}}>
            <Text style={{textAlign:'center',fontSize:15,color:'#333',display:'block'}}>{new Date().getFullYear()}年{monthNames[new Date().getMonth()]}</Text>
          </View>
          {/* 星期头 */}
          <View style={{display:'flex',paddingLeft:12,paddingRight:12,paddingBottom:8}}>
            {['日','一','二','三','四','五','六'].map(d=><Text key={d} style={{flex:1,textAlign:'center',fontSize:12,color:'#999',display:'block'}}>{d}</Text>)}
          </View>
          {/* 日期网格 */}
          <View style={{display:'flex',flexWrap:'wrap',gap:2,paddingLeft:8,paddingRight:8}}>
            {/* 补齐首行空位 */}
            {(new Array(days[0].getDay()).fill(0)).map((_,i)=><View key={'sp'+i} style={{width:'14.28%',height:36}} />)}
            {days.map(d=>{
              const ds=d.toISOString().split('T')[0];const isToday=ds===today
              const inRange=(customStartDate&&ds>=customStartDate&&(!customEndDate||ds<=customEndDate))
              return (
                <View key={ds} onClick={()=>pickDate(d)}
                  style={{
                    width:'14.28%',height:36,borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',
                    backgroundColor:isToday?'#1890FF':inRange?'#E6F4FF':ds===customStartDate||ds===customEndDate?'#D0EBFF':'transparent'
                  }}
                >
                  <Text style={{
                    fontSize:13,
                    color:(d===new Date(customStartDate)||d===new Date(customEndDate))?'#FFF':'#374151',
                    fontWeight:isToday?'600':'400'
                  }}
                  >{d.getDate()}</Text>
                </View>
              )
            })}
          </View>
          {/* 底部按钮 */}
          <View style={{display:'flex',gap:10,padding:16}}>
            <View onClick={resetDateRange} style={{flex:1,height:40,borderRadius:20,backgroundColor:'#F5F5F5',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:14,color:'#666'}}>重置</Text>
            </View>
            <View onClick={confirmDate} style={{flex:1,height:40,borderRadius:20,backgroundColor:'#1890FF',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:14,color:'#FFF',fontWeight:'600'}}>确定</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  /* ---- 统计 Tab ---- */
  function renderStatsTab(){
    if(loading){
      return (
        <View style={{display:'flex',alignItems:'center',justifyContent:'center',paddingTop:180}}>
          <Text style={{fontSize:14,color:'#AAA',display:'block'}}>加载中...</Text>
        </View>
      )
    }

    return (
      <View style={{padding:12,paddingTop:12}}>
        {/* 圆环图卡片 - 紧凑，无大色块 */}
        <View style={{backgroundColor:'#FFFFFF',borderRadius:14,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)',marginBottom:12}}>
          <Text style={{fontSize:14,fontWeight:'600',color:'#333',display:'block',marginBottom:12}}>支出构成</Text>

          <View style={{display:'flex',alignItems:'center'}}>
            {/* 圆环：150px 居中 */}
            <View style={{width:150,height:150,marginRight:16,flexShrink:0,position:'relative'}}>
              {/* 外环 conic-gradient */}
              <View style={{width:150,height:150,borderRadius:75,background:pieGradientStr}} />
              {/* 内圆遮罩 */}
              <View style={{position:'absolute',left:42,top:42,width:66,height:66,borderRadius:33,backgroundColor:'#FFFFFF',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <View>
                  <Text style={{fontSize:22,fontWeight:'700',color:'#333',display:'block',textAlign:'center'}}>{pieData.length||0}</Text>
                  <Text style={{fontSize:11,color:'#999',display:'block',textAlign:'center'}}>类</Text>
                </View>
              </View>
            </View>
            {/* 右侧图例 */}
            <View style={{flex:1}}>
              {pieData.slice(0,5).map((d,i)=>(
                <View key={d.name+i} style={{display:'flex',alignItems:'center',marginBottom:8}}>
                  <View style={{width:10,height:10,borderRadius:5,backgroundColor:d.color,marginRight:8}} />
                  <View style={{flex:1}}>
                    <View style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <Text style={{fontSize:13,color:'#444',display:'block'}}>{d.label}</Text>
                      <Text style={{fontSize:13,fontWeight:'600',color:'#333',display:'block'}}>{'\u00A5'+fmt(d.amount)}</Text>
                    </View>
                    {/* 进度条 - 极细 */}
                    <View style={{height:4,borderRadius:2,backgroundColor:'#F1F5F9',marginTop:4,overflow:'hidden'}}>
                      <View style={{height:4,borderRadius:2,width:(String(Math.round(d.ratio*100))+'%'),minWidth:d.ratio>0?4:0}} />
                    </View>
                  </View>
                </View>
              ))}
              <Text style={{fontSize:12,color:'#AAA',display:'block',marginTop:4}}>总计 {'\u00A5'+fmt(totalExpense)}</Text>
            </View>
          </View>
        </View>

        {/* 按项目统计 - 竖状柱状图 */}
        {projectStats.length>0&&(
          <View style={{backgroundColor:'#FFFFFF',borderRadius:14,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)',marginBottom:12}}>
            <Text style={{fontSize:14,fontWeight:'600',color:'#333',display:'block',marginBottom:14}}>{'\uD83D\uDCCB'} 按项目统计</Text>
            <View style={{display:'flex',flexDirection:'row',alignItems:'flex-end',justifyContent:'space-around',paddingTop:8,paddingBottom:8,height:140}}>
              {projectStats.slice(0,7).map((p,i)=>{
                const mx=Math.max(...projectStats.slice(0,7).map(x=>x.amount));const barH=Math.max((p.amount/mx)*110,8)
                return (
                  <View key={p.name} style={{alignItems:'center',width:'13%'}}>
                    <Text style={{fontSize:10,color:'#888',display:'block',marginBottom:4}}>{p.amount>=1000?(p.amount/1000).toFixed(1)+'k':p.amount}</Text>
                    <View style={{width:24,minHeight:barH,borderRadius:'6px 6px 0 0',backgroundColor:'#E8A87C',opacity:0.7+(i*0.05)}} />
                    <Text style={{fontSize:10,color:'#666',display:'block',marginTop:6,textAlign:'center',lineHeight:1.2}} numberOfLines={1}>{p.name.replace(/新昌|徒步|旅游/g,'')}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* 每月趋势 - 竖状柱状图 */}
        {monthlyStats.length>1&&(
          <View style={{backgroundColor:'#FFFFFF',borderRadius:14,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)',marginBottom:12}}>
            <Text style={{fontSize:14,fontWeight:'600',color:'#333',display:'block',marginBottom:14}}>{'\uD83D\uDCC5'} 每月趋势</Text>
            <View style={{display:'flex',flexDirection:'row',alignItems:'flex-end',justifyContent:'space-around',paddingTop:8,paddingBottom:8,height:120}}>
              {monthlyStats.slice(-7).map((m,i)=>{
                const mx=Math.max(...monthlyStats.slice(-7).map(x=>x.amount));const barH=Math.max((m.amount/mx)*90,8)
                return (
                  <View key={m.month} style={{alignItems:'center',width:'13%'}}>
                    <Text style={{fontSize:10,color:'#888',display:'block',marginBottom:4}}>{m.amount>=1000?(m.amount/1000).toFixed(1)+'k':m.amount}</Text>
                    <View style={{width:22,minHeight:barH,borderRadius:'5px 5px 0 0',backgroundColor:'#85B6C8',opacity:0.65+(i*0.05)}} />
                    <Text style={{fontSize:10,color:'#666',display:'block',marginTop:6}}>{m.month.split('-')[1]}月</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}
      </View>
    )
  }

  /* ---- 明细 Tab ---- */
  function renderDetailTab(){
    if(loading){
      return (
        <View style={{display:'flex',alignItems:'center',justifyContent:'center',paddingTop:180}}>
          <Text style={{fontSize:14,color:'#AAA',display:'block'}}>加载中...</Text>
        </View>
      )
    }
    if(!groupedBills.length){
      return (
        <View style={{display:'flex',alignItems:'center',justifyContent:'center',paddingTop:120}}>
          <Text style={{fontSize:14,color:'#BBB',display:'block'}}>暂无账单记录</Text>
        </View>
      )
    }
    return (
      <View style={{padding:12,paddingTop:12}}>
        {groupedBills.map(g=>(
          <View key={g.date} style={{marginBottom:16}}>
            {/* 日期行 */}
            <View style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <Text style={{fontSize:14,fontWeight:'600',color:'#333',display:'block'}}>{fmtDate(g.date)}</Text>
              <Text style={{fontSize:13,fontWeight:'600',color:'#E8A87C',display:'block'}}>{'\u00A5'+fmt(g.total)}</Text>
            </View>
            {/* 账单列表 */}
            {g.bills.map(bill=>{
              const cfg=CATEGORY_CONFIG[bill.category as keyof typeof CATEGORY_CONFIG]||CATEGORY_CONFIG.other
              return (
                <View key={bill.id} style={{display:'flex',alignItems:'center',backgroundColor:'#FFF',borderRadius:12,padding:12,marginBottom:6,boxShadow:'0 1px 3px rgba(0,0,0,0.03)'}}>
                  {/* 图标 - 使用与添加账单一致的圆形图标 */}
                  <View style={{width:40,height:40,borderRadius:12,backgroundColor:cfg.bg,display:'flex',alignItems:'center',justifyContent:'center',marginRight:12}}>
                    <Text style={{fontSize:20}}>{cfg.icon}</Text>
                  </View>
                  {/* 信息 */}
                  <View style={{flex:1}}>
                    <Text style={{fontSize:14,fontWeight:'500',color:'#333',display:'block'}}>{bill.note||cfg.label}</Text>
                    <Text style={{fontSize:12,color:'#AAA',display:'block',marginTop:2}}>{bill.payer||''}</Text>
                  </View>
                  {/* 金额 */}
                  <Text style={{fontSize:15,fontWeight:'600',color:'#E8A87C',display:'block'}}>{'\u00A5'+fmt(bill.amount)}</Text>
                </View>
              )
            })}
          </View>
        ))}
      </View>
    )
  }

  /* ---- 地图 Tab ---- */
  function renderMapTab(){
    return (
      <View style={{padding:12,paddingTop:12}}>
        {/* 地图区域 */}
        <View style={{backgroundColor:'#FFFFFF',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          {/* 标题 */}
          <View style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:14,paddingBottom:10}}>
            <Text style={{fontSize:14,fontWeight:'600',color:'#333',display:'block'}}>{'\uD83D\uDDFA'} 足迹城市</Text>
            <Text style={{fontSize:12,color:'#AAA',display:'block'}}>{cityList.length} 个城市</Text>
          </View>
          {/* 地图画布 */}
          <View style={{marginLeft:12,marginRight:12,marginBottom:12,height:240,backgroundColor:'#FAFCFF',borderRadius:12,borderStyle:'solid',borderWidth:1,borderColor:'#E8F0FE',position:'relative',overflow:'hidden'}}>
            {/* 中国轮廓模拟 */}
            <View style={{position:'absolute',left:'10%',top:'8%',width:'78%',height:'82%',borderRadius:'46% 54% 48% 52% / 52% 48% 56% 44%',backgroundColor:'#F0F7FF',borderWidth:1.5,borderColor:'#BAE0FF'}} />
            {/* 城市点位 */}
            {cityList.map(city=>{
              const posMap:{[key:string]:{x:number,y:number}}={'绍兴市':{x:0.62,y:0.58},'杭州市':{x:0.63,y:0.52},'宁波市':{x:0.70,y:0.56}}
              const pos=posMap[city]||{x:0.3+Math.random()*0.4,y:0.25+Math.random()*0.45}
              return (
                <View key={city} style={{position:'absolute',left:pos.x*100+'%',top:pos.y*100+'%',transform:'translate(-50%,-50%)',display:'flex',flexDirection:'column',alignItems:'center'}}>
                  <View style={{width:8,height:8,borderRadius:4,backgroundColor:'#6B9FD5'}} />
                  <Text style={{fontSize:9,color:'#6B9FD5',display:'block',marginTop:2,whiteSpace:'nowrap'}}>{city.replace(/市|区|县/g,'')}</Text>
                </View>
              )
            })}
            {/* 无数据提示 */}
            {!cityList.length&&(
              <View style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%'}}>
                <Text style={{fontSize:32,color:'#DDD',display:'block'}}>{'\uD83D\uDDFA'}</Text>
                <Text style={{fontSize:13,color:'#CCC',display:'block',marginTop:8}}>暂无足迹数据</Text>
                <Text style={{fontSize:11,color:'#DDD',display:'block',marginTop:2}}>添加带地点的账单后会在此显示</Text>
              </View>
            )}
          </View>
          {/* 城市标签列表 */}
          {cityList.length>0&&(
            <View style={{backgroundColor:'#FFFFFF',borderRadius:14,padding:16,marginTop:12}}>
              <Text style={{fontSize:14,fontWeight:'600',color:'#333',display:'block',marginBottom:10}}>已访问城市</Text>
              <View style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {cityList.map(city=>(
                  <View key={city} style={{display:'flex',alignItems:'center',gap:4,paddingLeft:10,paddingRight:10,paddingTop:5,paddingBottom:5,backgroundColor:'#F0F7FF',borderRadius:14}}>
                    <View style={{width:5,height:5,borderRadius:2.5,backgroundColor:'#6B9FD5'}} />
                    <Text style={{fontSize:12,color:'#555',display:'block'}}>{city}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {/* 统计栏 */}
          <View style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:14,paddingTop:10,borderTopWidth:1,borderTopColor:'#F0F0F0'}}>
            <Text style={{fontSize:13,color:'#888',display:'block'}}>累计点亮 <Text style={{color:'#1890FF',fontWeight:'600'}}>{cityList.length}</Text> 市</Text>
            <Text style={{fontSize:13,color:'#888',display:'block'}}>总花费 <Text style={{color:'#333',fontWeight:'600'}}>{'\u00A5'+fmt(filteredBills.reduce((s,b)=>s+b.amount,0))}</Text></Text>
          </View>
        </View>
      </View>
    )
  }

  /* ---- 底部 TabBar 占位 ---- */
  function renderBottomTabs(){
    return <View style={{height:70}} />
  }

  /* ════════════ 主渲染 ════════════ */
  return (
    <View style={{display:'flex',flexDirection:'column',height:'100%',backgroundColor:'#F7F8FA'}}>
      {renderHeader()}
      <View style={{flex:1}}>
        {activeTab==='stats'&&renderStatsTab()}
        {activeTab==='detail'&&renderDetailTab()}
        {activeTab==='map'&&renderMapTab()}
      </View>
      {renderCatPicker()}
      {renderDatePicker()}
      {renderCalendar()}
      {renderBottomTabs()}
    </View>
  )
}
