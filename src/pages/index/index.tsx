import { useState, useRef, useCallback } from 'react';
import Taro, { useLoad, useDidShow } from '@tarojs/taro';
import { View, Text, Image, Picker, ScrollView } from '@tarojs/components';
import { Input as UIInput } from '@/components/ui/input';
import { Network } from '@/network';
import { ChartPie, User, Search, Plus, X, Calendar, Camera } from 'lucide-react-taro';

interface Project {
  id: string;
  name: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  total_amount: string;
  participants?: string[];
  cover_url?: string;
}

/* 每个卡片独立低饱和度色系 */
const CARD_COLORS = [
  { bg: '#E8F0F7', accent: '#6B9BD5', name: '#3A5A78', amount: '#5B8BC2' },
  { bg: '#EDF4EE', accent: '#7BA888', name: '#4A6850', amount: '#6A9270' },
  { bg: '#F5EDE8', accent: '#C49A7A', name: '#7A5840', amount: '#B08860' },
  { bg: '#EBE8F3', accent: '#9B8EC4', name: '#5C5070', amount: '#8678AA' },
  { bg: '#F0EDE8', accent: '#B8A07A', name: '#605440', amount: '#9A8860' },
  { bg: '#E5EFF1', accent: '#6BAFA5', name: '#406860', amount: '#5A9890' },
  { bg: '#F2EBEF', accent: '#B87D9A', name: '#6A4858', amount: '#A06880' },
  { bg: '#EAF0E8', accent: '#8FB894', name: '#506850', amount: '#70A076' },
];

function getCardStyle(id: string) {
  const idx = id ? Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % CARD_COLORS.length : 0;
  return CARD_COLORS[idx];
}

function getIcon(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('海') || n.includes('滩') || n.includes('岛')) return '\u{1F3D6}';
  if (n.includes('山') || n.includes('峰') || n.includes('岭')) return '\u{1F3D4}';
  if (n.includes('湖') || n.includes('水')) return '\u{1F4A7}';
  if (n.includes('城') || n.includes('京') || n.includes('都')) return '\u{1F3D9}';
  if (n.includes('古镇') || n.includes('丽江') || n.includes('巷')) return '\u{1F3EF}';
  if (n.includes('雪') || n.includes('冰')) return '\u{2744}\uFE0F';
  if (n.includes('花') || n.includes('园')) return '\u{1F338}';
  if (n.includes('森') || n.includes('林') || n.includes('木')) return '\u{1F332}';
  if (n.includes('食') || n.includes('吃') || n.includes('味')) return '\u{1F35C}';
  if (n.includes('酒') || n.includes('吧')) return '\u{1F37A}';
  if (n.includes('胶')) return '\u{2708}\uFE0F';
  if (n.includes('游') || n.includes('旅')) return '\u{2708}\uFE0F';
  return '\u{1F3D5}';
}

function formatDateSlash(dateStr?: string): string {
  if (!dateStr) return '待定';
  return dateStr.replace(/-/g, '/');
}

export default function IndexPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newCoverTemp, setNewCoverTemp] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  /* 卡片堆叠：跟踪滚动方向 */
  const [scrollState, setScrollState] = useState<'idle' | 'up' | 'down'>('idle');
  const lastScrollTopRef = useRef(0);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await Network.request({ url: '/api/projects' });
      console.log('projects res', res.data);
      setProjects(res.data?.data || []);
    } catch (e) {
      console.error('fetch projects error', e);
    } finally {
      setLoading(false);
    }
  };

  useLoad(() => { fetchProjects(); });
  useDidShow(() => { fetchProjects(); });

  const goStats = () => Taro.navigateTo({ url: '/pages/stats/index' });
  const goProfile = () => Taro.navigateTo({ url: '/pages/profile/index' });
  const goProject = (id: string) => Taro.navigateTo({ url: `/pages/project/index?id=${id}` });

  /* 滚动监听：实现卡片堆叠动效 */
  const handleScroll = useCallback((e: any) => {
    const currentTop = e.detail.scrollTop;
    const newDir: 'up' | 'down' = currentTop > lastScrollTopRef.current ? 'up' : 'down';
    lastScrollTopRef.current = currentTop;

    setScrollState(newDir);

    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      setScrollState('idle');
    }, 250);
  }, []);

  const handleChooseCover = async () => {
    const env = Taro.getEnv();
    try {
      if (env === Taro.ENV_TYPE.WEAPP || env === Taro.ENV_TYPE.TT) {
        const res = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'] });
        if (res.tempFiles && res.tempFiles.length > 0) setNewCoverTemp(res.tempFiles[0].tempFilePath);
      } else {
        const res = await Taro.chooseImage({ count: 1, sourceType: ['album', 'camera'] });
        if (res.tempFilePaths && res.tempFilePaths.length > 0) setNewCoverTemp(res.tempFilePaths[0]);
      }
    } catch (e) { /* cancelled */ }
  };

  const handleAddProject = async () => {
    if (!newName) { Taro.showToast({ title: '请填写项目名', icon: 'none' }); return; }
    try {
      let coverUrl = '';
      if (newCoverTemp) {
        const uploadRes = await Network.uploadFile({ url: '/api/upload', filePath: newCoverTemp, name: 'file' });
        const parsed = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;
        coverUrl = parsed?.data?.url || '';
      }
      await Network.request({
        url: '/api/projects',
        method: 'POST',
        data: {
          name: newName,
          destination: newName,
          startDate: newStart || undefined,
          endDate: newEnd || undefined,
          participants: ['小明', '小红'],
          coverUrl: coverUrl || undefined,
        },
      });
      Taro.showToast({ title: '新项目已添加', icon: 'success' });
      setShowAddModal(false);
      setNewName('');
      setNewStart('');
      setNewEnd('');
      setNewCoverTemp('');
      fetchProjects();
    } catch (e) { Taro.showToast({ title: '添加失败', icon: 'none' }); }
  };

  const filteredProjects = isSearching && searchText
    ? projects.filter(p => p.name?.includes(searchText) || p.destination?.includes(searchText))
    : projects;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  /* 问题3：顶部与胶囊按钮底部对齐 */
  const statusBarH = Taro.getSystemInfoSync().statusBarHeight || 0;
  let capsuleBottom = statusBarH + 44;
  try {
    const capsule = Taro.getMenuButtonBoundingClientRect();
    if (capsule && capsule.bottom) {
      capsuleBottom = capsule.bottom + 6;
    }
  } catch (e) { /* H5 fallback */ }

  return (
    <View className="flex flex-col h-full bg-white">
      {/* Header：搜索栏与胶囊按钮底部对齐 */}
      <View
        className="bg-white z-20"
        style={{
          paddingTop: statusBarH,
          height: capsuleBottom,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 14,
          paddingRight: 14,
        }}
      >
        {/* 左侧统计 */}
        <View onClick={goStats}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <ChartPie size={14} color="#6B9BD5" />
        </View>

        {/* 搜索栏：原生Input，可搜索 */}
        <View
          onClick={() => { if (!isSearching) setIsSearching(true); }}
          style={{
            flex: 1, height: 34, borderRadius: 17,
            backgroundColor: isSearching ? '#FFFFFF' : '#F5F7FA',
            border: isSearching ? '1.5px solid #6B9BD5' : '1px solid #EAEDF2',
            marginLeft: 10, marginRight: 10,
            paddingLeft: 12, paddingRight: 12,
            display: 'flex', alignItems: 'center',
          }}
        >
          <Search size={14} color={isSearching ? '#6B9BD5' : '#A0ABB8'} />
          {!isSearching ? (
            <Text className="block ml-2" style={{ color: '#A0ABB8', fontSize: 13 }}>搜索项目</Text>
          ) : (
            <UIInput
              className="ml-2 border-0 bg-transparent shadow-none ring-0 focus-within:ring-0 focus-within:border-0"
              placeholder="输入关键词搜索..."
              focus={isSearching}
              value={searchText}
              onInput={(e: any) => setSearchText(e.detail.value)}
              onBlur={() => { if (!searchText) setIsSearching(false); }}
              confirmType="search"
              style={{ height: 34, lineHeight: '34px', fontSize: 13, color: '#2D3748' }}
            />
          )}
        </View>

        {/* 右侧个人中心 */}
        <View onClick={goProfile}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <User size={14} color="#6B9BD5" />
        </View>
      </View>

      {/* 卡片列表：搜索栏固定不动，滚动时卡片堆叠 */}
      <ScrollView
        className="flex-1"
        scrollY
        onScroll={handleScroll}
        style={{
          paddingLeft: 10,
          paddingRight: 10,
          paddingTop: 2,
          paddingBottom: 90,
        }}
        enhanced
        showScrollbar={false}
      >
        {loading && (
          <View className="flex items-center justify-center py-12">
            <Text className="block text-sm" style={{ color: '#A0ABB8' }}>加载中...</Text>
          </View>
        )}

        {filteredProjects.map((p, index) => {
          const cs = getCardStyle(p.id);
          const dateStr = p.start_date
            ? (p.end_date && p.end_date !== p.start_date ? `${formatDateSlash(p.start_date)} ~ ${formatDateSlash(p.end_date)}` : formatDateSlash(p.start_date))
            : '待定';

          /* 问题1：卡片堆叠动效
             默认展开有间距，滑动时下压上/上压下 */
          let marginTop = index > 0 ? 12 : 0;
          let zIndex = filteredProjects.length - index;

          if (scrollState === 'up') {
            // 向上滑：下面的卡片盖住上面的下半部分
            marginTop = index > 0 ? -28 : 0;
            zIndex = index + 1;
          } else if (scrollState === 'down') {
            // 向下滑：上面的卡片盖住下面的上半部分
            marginTop = index > 0 ? -28 : 0;
            zIndex = filteredProjects.length - index;
          }

          return (
            <View
              key={p.id}
              onClick={() => goProject(p.id)}
              className="relative"
              style={{
                marginTop,
                zIndex,
                marginBottom: index === filteredProjects.length - 1 ? 14 : 0,
                transition: scrollState === 'idle' ? 'margin-top 0.35s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none',
              }}
            >
              {/* 阴影外层：圆角阴影，不被overflow:hidden裁剪 */}
              <View
                style={{
                  borderRadius: 20,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                {/* 内容层：裁剪内容到圆角 */}
                <View
                  style={{
                    display: 'flex', alignItems: 'stretch',
                    borderRadius: 20,
                    overflow: 'hidden',
                    height: 120,
                  }}
                >
                  {/* 左侧封面 */}
                  <View
                    style={{
                      width: 80, minWidth: 80,
                      backgroundColor: cs.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {p.cover_url ? (
                      <Image style={{ width: 80, height: 120 }} src={p.cover_url} mode="aspectFill" />
                    ) : (
                      <Text style={{ fontSize: 30, opacity: 0.9 }}>{getIcon(p.name)}</Text>
                    )}
                  </View>

                  {/* 右侧白色区域：项目名居中，时间沉底 */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: cs.bg,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingLeft: 10,
                      paddingRight: 10,
                      paddingTop: 10,
                      paddingBottom: 8,
                      position: 'relative',
                    }}
                  >
                    {/* 项目名：水平+垂直居中 */}
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '600',
                        color: cs.name,
                        letterSpacing: '1px',
                        textAlign: 'center',
                        fontFamily: 'Georgia, "Times New Roman", serif',
                      }}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>

                    {/* 金额：名称下方 */}
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: '700',
                        color: cs.amount,
                        marginTop: 4,
                      }}
                    >
                      ¥{Number(p.total_amount || 0).toFixed(0)}
                    </Text>

                    {/* 时间：沉到底部 */}
                    <Text
                      style={{
                        fontSize: 11,
                        color: '#A0ABB8',
                        position: 'absolute',
                        bottom: 8,
                        textAlign: 'center',
                      }}
                    >
                      {dateStr}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {!loading && filteredProjects.length === 0 && (
          <View className="flex flex-col items-center justify-center py-16">
            <Text className="block text-sm" style={{ color: '#A0ABB8' }}>
              {searchText ? '未找到匹配项目' : '暂无项目，点击右下角添加'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 浮动添加按钮 */}
      <View
        onClick={() => setShowAddModal(true)}
        style={{
          position: 'fixed',
          right: 18,
          bottom: 28,
          zIndex: 999,
          width: 56, height: 56, borderRadius: 28,
          background: 'linear-gradient(135deg, #5B8DEE, #7BA8EA)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(91,141,238,0.4), 0 4px 12px rgba(91,238,155,0.2)',
        }}
      >
        <Plus size={26} color="#FFFFFF" />
      </View>

      {/* 全屏新建项目 */}
      {showAddModal && (
        <View style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: '#FFFFFF' }}>
          <View style={{
            paddingTop: statusBarH,
            height: capsuleBottom,
            display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 16,
          }}
          >
            <View onClick={() => { setShowAddModal(false); setNewCoverTemp(''); }} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} color="#A0ABB8" />
            </View>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#2D3748', paddingRight: 28 }}>添加新项目</Text>
          </View>

          <View style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <View>
              <Text style={{ fontSize: 12, color: '#A0ABB8', marginBottom: 6, display: 'block' }}>封面图片（可选）</Text>
              <View onClick={handleChooseCover} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 64, height: 64, borderRadius: 12, overflow: 'hidden',
                  background: newCoverTemp ? undefined : '#F5F7FA',
                  border: '1px dashed #D0D8E0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                >
                  {newCoverTemp ? (
                    <Image style={{ width: 64, height: 64 }} src={newCoverTemp} mode="aspectFill" />
                  ) : (
                    <Camera size={22} color="#A0ABB8" />
                  )}
                </View>
                <Text style={{ fontSize: 12, color: '#A0ABB8' }}>点击选择封面图</Text>
              </View>
            </View>

            <View>
              <Text style={{ fontSize: 12, color: '#A0ABB8', marginBottom: 6, display: 'block' }}>项目名称</Text>
              <View style={{
                borderRadius: 14, padding: '10px 16px',
                backgroundColor: '#F5F7FA', border: '1px solid #EAEDF2',
              }}
              >
                <UIInput
                  className="w-full border-0 bg-transparent shadow-none ring-0 focus-within:ring-0 focus-within:border-0"
                  placeholder="例如：丽江三日游"
                  style={{ color: '#2D3748', fontSize: 15 }}
                  value={newName}
                  onInput={(e: any) => setNewName(e.detail.value)}
                />
              </View>
            </View>

            <View style={{ display: 'flex', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#A0ABB8', marginBottom: 6, display: 'block' }}>开始日期</Text>
                <Picker mode="date" value={newStart || todayStr} onChange={(e: any) => setNewStart(e.detail.value)}>
                  <View style={{
                    borderRadius: 14, padding: '10px 14px',
                    backgroundColor: '#F5F7FA', border: '1px solid #EAEDF2',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  >
                    <Calendar size={14} color="#6B9BD5" />
                    <Text style={{ fontSize: 14, color: '#2D3748' }}>{newStart || '选择日期'}</Text>
                  </View>
                </Picker>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#A0ABB8', marginBottom: 6, display: 'block' }}>结束日期</Text>
                <Picker mode="date" value={newEnd || todayStr} onChange={(e: any) => setNewEnd(e.detail.value)}>
                  <View style={{
                    borderRadius: 14, padding: '10px 14px',
                    backgroundColor: '#F5F7FA', border: '1px solid #EAEDF2',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  >
                    <Calendar size={14} color="#6B9BD5" />
                    <Text style={{ fontSize: 14, color: '#2D3748' }}>{newEnd || '选择日期'}</Text>
                  </View>
                </Picker>
              </View>
            </View>

            <View style={{
              borderRadius: 14, padding: '10px 14px',
              backgroundColor: '#F0F4FA', border: '1px solid #E4EDF7',
            }}
            >
              <Text style={{ fontSize: 12, color: '#6B9BD5' }}>
                不选日期则自动从账单时间获取
              </Text>
            </View>

            <View
              onClick={handleAddProject}
              style={{
                width: '100%', paddingTop: 14, paddingBottom: 14, borderRadius: 14,
                background: 'linear-gradient(135deg, #5B8DEE, #7BA8EA)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 24px rgba(91,141,238,0.3)',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>添加</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
