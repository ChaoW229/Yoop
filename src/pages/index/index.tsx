import { useState } from 'react';
import Taro, { useLoad, useDidShow } from '@tarojs/taro';
import { View, Text, Image, Picker } from '@tarojs/components';
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

/* 每个卡片独立低饱和度色系 - 更丰富更高级 */
const CARD_COLORS = [
  { bg: '#E8F0F7', accent: '#6B9BD5', name: '#3A5A78', amount: '#5B8BC2' },   // 雾蓝灰
  { bg: '#EDF4EE', accent: '#7BA888', name: '#4A6850', amount: '#6A9270' },     // 薄荷绿
  { bg: '#F5EDE8', accent: '#C49A7A', name: '#7A5840', amount: '#B08860' },     // 奶茶棕
  { bg: '#EBE8F3', accent: '#9B8EC4', name: '#5C5070', amount: '#8678AA' },     // 薰衣紫
  { bg: '#F0EDE8', accent: '#B8A07A', name: '#605440', amount: '#9A8860' },     // 暖杏
  { bg: '#E5EFF1', accent: '#6BAFA5', name: '#406860', amount: '#5A9890' },     // 薄荷青
  { bg: '#F2EBEF', accent: '#B87D9A', name: '#6A4858', amount: '#A06880' },     // 烟霞粉
  { bg: '#EAF0E8', accent: '#8FB894', name: '#506850', amount: '#70A076' },     // 鼠尾草绿
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

/* 日期转换：年-月-日 → 年/月/日 */
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

  return (
    <View className="flex flex-col h-full bg-white">
      {/* Header - 紧凑状态栏+标题 */}
      <View className="px-4 flex items-center gap-3 bg-white"
        style={{ paddingTop: Taro.getSystemInfoSync().statusBarHeight || 0 }}
      >
        <View onClick={goStats}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChartPie size={18} color="#6B9BD5" />
        </View>

        {/* 搜索栏 - 原生输入框，无嵌套，直接用 TaroInput */}
        <View
          style={{
            flex: 1, height: 40, borderRadius: 22,
            backgroundColor: isSearching ? '#FFFFFF' : '#F5F7FA',
            border: isSearching ? '1.5px solid #6B9BD5' : '1px solid #EAEDF2',
            paddingLeft: 12,
            paddingRight: 12,
            display: 'flex', alignItems: 'center',
          }}
        >
          <Search size={16} color={isSearching ? '#6B9BD5' : '#A0ABB8'} />
          {!isSearching ? (
            <Text className="block ml-2" style={{ color: '#A0ABB8', fontSize: 14 }}>搜索项目</Text>
          ) : (
            <UIInput
              className="flex-1 ml-2 border-0 bg-transparent shadow-none ring-0 focus-within:ring-0 focus-within:border-0"
              placeholder="搜索项目..."
              focus={isSearching}
              value={searchText}
              onInput={(e: any) => setSearchText(e.detail.value)}
              onBlur={() => { if (!searchText) setIsSearching(false); }}
              confirmType="search"
              style={{ height: 40, lineHeight: '40px', fontSize: 14, color: '#2D3748' }}
            />
          )}
        </View>

        <View onClick={goProfile}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <User size={18} color="#6B9BD5" />
        </View>
      </View>

      {/* 项目列表 - 搜索栏下方有12px间距，自然衔接 */}
      <View className="flex-1 px-4 pt-3 pb-24">
        {loading && (
          <View className="flex items-center justify-center py-12">
            <Text className="block text-sm" style={{ color: '#A0ABB8' }}>加载中...</Text>
          </View>
        )}
        {filteredProjects.map((p) => {
          const cs = getCardStyle(p.id);
          const dateStr = p.start_date
            ? (p.end_date && p.end_date !== p.start_date ? `${formatDateSlash(p.start_date)} ~ ${formatDateSlash(p.end_date)}` : formatDateSlash(p.start_date))
            : '待定';

          return (
            <View
              key={p.id}
              onClick={() => goProject(p.id)}
              style={{
                display: 'flex', alignItems: 'stretch',
                backgroundColor: cs.bg,
                borderRadius: 20,
                boxShadow: '0 8px 30px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)',
                marginBottom: 16,
                height: 96,
                overflow: 'hidden',
              }}
            >
              {/* 左侧封面 - 贴紧左边缘，圆角左上左下 */}
              <View
                style={{
                  width: 96, minWidth: 96,
                  backgroundColor: cs.accent,
                  opacity: p.cover_url ? undefined : 0.85,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {p.cover_url ? (
                  <Image style={{ width: 96, height: 96 }} src={p.cover_url} mode="aspectFill" />
                ) : (
                  <Text style={{ fontSize: 30 }}>{getIcon(p.name)}</Text>
                )}
              </View>

              {/* 中间区域 - 项目名垂直居中 + 时间 */}
              <View style={{ flex: 1, paddingLeft: 16, paddingRight: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: cs.name,
                    letterSpacing: '0.8px',
                  }}
                  numberOfLines={1}
                >
                  {p.name}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: '#A0ABB8',
                    marginTop: 5,
                  }}
                >
                  {dateStr}
                </Text>
              </View>

              {/* 右侧金额 - 垂直居中 */}
              <View style={{
                width: 72,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                paddingRight: 14,
              }}
              >
                <Text style={{ fontSize: 19, fontWeight: '700', color: cs.amount }}>
                  ¥{Number(p.total_amount || 0).toFixed(0)}
                </Text>
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
      </View>

      {/* 浮动按钮 */}
      <View
        onClick={() => setShowAddModal(true)}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 100,
          zIndex: 50,
          width: 60, height: 60, borderRadius: 30,
          background: 'linear-gradient(135deg, #6B9BD5, #8DB8E0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 40px rgba(107,155,213,0.35), 0 4px 12px rgba(107,155,213,0.18)',
        }}
      >
        <Plus size={28} color="#FFFFFF" />
      </View>

      {/* 全屏新建项目 */}
      {showAddModal && (
        <View style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: '#FFFFFF' }}>
          <View style={{
            paddingTop: Taro.getSystemInfoSync().statusBarHeight || 0,
            display: 'flex', alignItems: 'center', padding: '0 16px',
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
                  className="w-full"
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
                background: 'linear-gradient(135deg, #6B9BD5, #8DB8E0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 24px rgba(107,159,213,0.25)',
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
