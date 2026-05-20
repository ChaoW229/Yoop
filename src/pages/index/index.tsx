import { useState } from 'react';
import Taro, { useLoad, useDidShow } from '@tarojs/taro';
/* eslint-disable no-restricted-syntax */
import { View, Text, Image, Input, ScrollView } from '@tarojs/components';
/* eslint-enable no-restricted-syntax */
import { Network } from '@/network';
import { ChartPie, User, Search, Plus, X, Camera } from 'lucide-react-taro';

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

/* 低饱和度多彩色系 */
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

/* 日期格式：年/月/日 */
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

  /* 选择封面图片 */
  const handleChooseCover = async () => {
    const env = Taro.getEnv();
    try {
      if ([Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(env as any)) {
        const res = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'] });
        if (res.tempFiles && res.tempFiles.length > 0) setNewCoverTemp(res.tempFiles[0].tempFilePath);
      } else {
        const res = await Taro.chooseImage({ count: 1, sourceType: ['album', 'camera'] });
        if (res.tempFilePaths && res.tempFilePaths.length > 0) setNewCoverTemp(res.tempFilePaths[0]);
      }
    } catch (e) { /* cancelled */ }
  };

  /* 添加新项目 */
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
      setNewName(''); setNewStart(''); setNewEnd(''); setNewCoverTemp('');
      fetchProjects();
    } catch (e) { Taro.showToast({ title: '添加失败', icon: 'none' }); }
  };

  /* 过滤 */
  const filteredProjects = searchText
    ? projects.filter(p => p.name?.includes(searchText) || p.destination?.includes(searchText))
    : projects;

  /* 系统信息 */
  const sysInfo = Taro.getSystemInfoSync();
  const statusBarH = sysInfo.statusBarHeight || 20;
  let menuTop = statusBarH + 4;
  let menuHeight = 32;
  try {
    const menuBtn = Taro.getMenuButtonBoundingClientRect();
    if (menuBtn && menuBtn.top > 0) {
      menuTop = menuBtn.top;
      menuHeight = menuBtn.height;
    }
  } catch (e) { /* fallback */ }

  return (
    <View className="flex flex-col h-full bg-white">
      {/* ===== Header：紧贴胶囊按钮底部 ===== */}
      <View className="bg-white z-20" style={{ paddingTop: menuTop + menuHeight + 12, paddingBottom: 10 }}>
        <View className="px-4 flex items-center gap-3">
          {/* 左侧统计按钮 */}
          <View onClick={goStats}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <ChartPie size={16} color="#6B9BD5" />
          </View>

          {/* ===== 搜索栏：原生Input，可正常输入和搜索 ===== */}
          <View style={{ flex: 1, height: 38, borderRadius: 19, backgroundColor: '#F5F7FA', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
            <Search size={15} color="#A0ABB8" style={{ marginRight: 8 }} />
            <Input
              value={searchText}
              onInput={(e) => setSearchText(e.detail.value)}
              placeholder="搜索项目"
              placeholderClass="search-placeholder"
              confirmType="search"
              style={{
                flex: 1,
                fontSize: 14,
                lineHeight: '38px',
                height: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                padding: '0 14px',
              }}
            />
          </View>
          {/* 右侧个人中心按钮 */}
          <View onClick={goProfile}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <User size={16} color="#6B9BD5" />
          </View>
        </View>
      </View>

      {/* ===== 项目列表：统一间距 + 圆角阴影卡片 ===== */}
      <ScrollView scrollY enhanced showScrollbar={false} style={{ flex: 1 }} className="bg-white px-4">
        <View style={{ paddingTop: 12, paddingBottom: 120, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {filteredProjects.map((p, index) => {
            const cs = getCardStyle(p.id);
            const dateStr = p.start_date ? `${formatDateSlash(p.start_date)}${p.end_date ? ` ~ ${formatDateSlash(p.end_date)}` : ''}` : '待定';

            return (
              /* 卡片容器 - 圆角阴影，overflow:hidden让阴影也变圆角 */
              <View key={p.id} onClick={() => goProject(p.id)}
                style={{
                  borderRadius: 18,
                  overflow: 'hidden',
                  boxShadow: '0 6px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                }}
                /* eslint-disable */
                className={`project-card card-delay-${index % 8}`}
                /* eslint-enable */
              >
                {/* 内部背景色 */}
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', minHeight: 112, backgroundColor: cs.bg }}>
                  {/* 左侧图片 1:1 */}
                  <View style={{ width: 110, minWidth: 110, position: 'relative', overflow: 'hidden' }}>
                    {p.cover_url ? (
                      <Image src={p.cover_url} mode="aspectFill" style={{ width: '100%', height: '100%' }} lazyLoad />
                    ) : (
                      <View style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: cs.accent, opacity: 0.75 }}>
                          <Text style={{ fontSize: 32 }}>{getIcon(p.name)}</Text>
                      </View>
                    )}
                  </View>

                  {/* 右侧内容区：项目名居中 + 时间沉底 + 金额右中 */}
                  <View style={{ flex: 1, padding: 10, paddingLeft: 14, paddingRight: 12, position: 'relative' }}>
                    {/* 项目名 - 正中间（水平+垂直居中） */}
                    <View style={{ position: 'absolute', top: '50%', left: 14, right: 72, transform: 'translateY(-50%)' }}>
                      <Text style={{ fontSize: 17, fontWeight: '600', color: cs.name, textAlign: 'center' }}>{p.name}</Text>
                    </View>

                    {/* 金额 - 右侧垂直居中 */}
                    <View style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                      <Text style={{ fontSize: 19, fontWeight: '700', color: cs.amount }}>¥{Number(p.total_amount || 0).toFixed(0)}</Text>
                    </View>

                    {/* 时间 - 卡片底部 */}
                    <Text style={{ fontSize: 11, color: '#A0ABB8', position: 'absolute', bottom: 8, left: 14, right: 72, textAlign: 'center' }}>{dateStr}</Text>
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
        </View>
      </ScrollView>

      {/* ===== 浮动按钮：强悬浮感（弹窗打开时不显示） ===== */}
      {!showAddModal && (
      <View
        onClick={() => setShowAddModal(true)}
        style={{
          position: 'fixed', right: 18, bottom: 28, zIndex: 999,
          width: 56, height: 56, borderRadius: 28,
          background: 'linear-gradient(135deg, #5B8DEE, #7BA8EA)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(91,141,238,0.4), 0 4px 12px rgba(91,141,238,0.2)',
        }}
      >
        <Plus size={26} color="#FFFFFF" />
      </View>
      )}

      {/* ===== 新建项目弹窗 ===== */}
      {showAddModal && (
        <View style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: '#FFFFFF' }}>
          <View style={{ paddingTop: statusBarH, display: 'flex', alignItems: 'center', padding: '0 16px', paddingBottom: 10 }}>
            <View onClick={() => { setShowAddModal(false); setNewCoverTemp(''); }}
              style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} color="#A0ABB8" />
            </View>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#2D3748', paddingRight: 28 }}>添加新项目</Text>
          </View>

          <View style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <View>
              <Text style={{ fontSize: 12, color: '#A0ABB8', marginBottom: 6, display: 'block' }}>项目名称 *</Text>
              <Input value={newName} onInput={(e) => setNewName(e.detail.value)} placeholder="例如：云南之旅" style={{ height: 44, borderRadius: 10, backgroundColor: '#F8FAFC', padding: '0 14px', fontSize: 14, border: '1px solid #E2E8F0' }} />
            </View>

            <View>
              <Text style={{ fontSize: 12, color: '#A0ABB8', marginBottom: 6, display: 'block' }}>封面图片（可选）</Text>
              <View onClick={handleChooseCover} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {newCoverTemp ? (
                  <Image src={newCoverTemp} mode="aspectFill" style={{ width: 64, height: 64, borderRadius: 12 }} />
                ) : (
                  <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' }}>
                    <Camera size={22} color="#A0ABB8" />
                  </View>
                )}
                <Text style={{ fontSize: 13, color: '#64748B' }}>点击选择或拍摄封面</Text>
              </View>
            </View>

            <View onClick={handleAddProject} style={{ height: 46, borderRadius: 10, background: 'linear-gradient(135deg, #5B8DEE, #7BA8EA)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>创建项目</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
