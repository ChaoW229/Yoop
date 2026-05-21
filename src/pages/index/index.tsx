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

function formatDateSlash(dateStr?: string): string {
  if (!dateStr) return '待定';
  return dateStr.replace(/-/g, '/');
}

export default function IndexPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCoverTemp, setNewCoverTemp] = useState('');
  const [searchText, setSearchText] = useState('');
  /* 卡片动画可见状态 - 用JS控制，确保小程序端兼容 */
  const [cardVisible, setCardVisible] = useState<Record<string, boolean>>({});
  /* 触摸反馈 - 用state替代CSS :active */
  const [pressedId, setPressedId] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await Network.request({ url: '/api/projects' });
      console.log('projects res', res.data);
      const list: Project[] = res.data?.data || [];
      setProjects(list);
      /* 依次显示卡片，模拟渐入效果 */
      list.forEach((p, i) => {
        setTimeout(() => {
          setCardVisible(prev => ({ ...prev, [p.id]: true }));
        }, i * 80);
      });
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
      if ([Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(env as any)) {
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
        data: { name: newName, destination: newName, participants: ['小明', '小红'], coverUrl: coverUrl || undefined },
      });
      Taro.showToast({ title: '新项目已添加', icon: 'success' });
      setShowAddModal(false);
      setNewName(''); setNewCoverTemp('');
      fetchProjects();
    } catch (e) { Taro.showToast({ title: '添加失败', icon: 'none' }); }
  };

  const filteredProjects = searchText
    ? projects.filter(p => p.name?.includes(searchText) || p.destination?.includes(searchText))
    : projects;

  /* 系统信息 - 兼容H5和小程序 */
  const sysInfo = Taro.getSystemInfoSync();
  const statusBarH = sysInfo.statusBarHeight || 20;
  let menuTop = statusBarH + 4;
  let menuHeight = 32;
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
  if (isWeapp) {
    try {
      const menuBtn = Taro.getMenuButtonBoundingClientRect();
      if (menuBtn && menuBtn.top > 0) {
        menuTop = menuBtn.top;
        menuHeight = menuBtn.height;
      }
    } catch (e) { /* fallback */ }
  }

  return (
    <View className="flex flex-col h-full" style={{ backgroundColor: '#F7F9FC' }}>
      {/* ===== Header：紧贴胶囊按钮底部 ===== */}
      <View className="z-20" style={{ paddingTop: menuTop + menuHeight + 10, paddingBottom: 8, backgroundColor: '#FFFFFF' }}>
        <View className="px-4 flex items-center gap-3">
          {/* 左侧统计按钮 */}
          <View onClick={goStats}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <ChartPie size={16} color="#6B9BD5" />
          </View>

          {/* 搜索栏 */}
          <View style={{ flex: 1, height: 38, borderRadius: 19, backgroundColor: '#F0F4F8', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
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
                padding: '0 12px',
              }}
            />
          </View>
          {/* 右侧个人中心按钮 */}
          <View onClick={goProfile}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <User size={16} color="#6B9BD5" />
          </View>
        </View>
      </View>

      {/* ===== 项目列表 ===== */}
      <ScrollView scrollY enhanced showScrollbar={false} style={{ flex: 1 }}>
        <View style={{ padding: '12px 16px 140px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {filteredProjects.map((p) => {
            const cs = getCardStyle(p.id);
            const dateStr = p.start_date ? `${formatDateSlash(p.start_date)}${p.end_date ? ` ~ ${formatDateSlash(p.end_date)}` : ''}` : '待定';
            const isVisible = cardVisible[p.id] !== false; // 默认可见，首次加载时由定时器控制

            return (
              <View key={p.id}
                onClick={() => goProject(p.id)}
                /* 触摸事件 - JS方式实现按压反馈 */
                onTouchStart={() => setPressedId(p.id)}
                onTouchEnd={() => setPressedId(null)}
                onTouchCancel={() => setPressedId(null)}
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: pressedId === p.id
                    ? '0 2px 8px rgba(0,0,0,0.06)'
                    : '0 8px 28px rgba(0,0,0,0.08), 0 3px 10px rgba(0,0,0,0.04)',
                  transform: pressedId === p.id ? 'scale(0.97)' : 'scale(1)',
                  transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
                  opacity: isVisible ? 1 : 0,
                  transformOrigin: 'center bottom',
                }}
              >
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', minHeight: 110, backgroundColor: cs.bg }}>
                  {/* 左侧图片 1:1 - 无相机图标 */}
                  <View style={{ width: 108, minWidth: 108, position: 'relative', overflow: 'hidden' }}>
                    {p.cover_url ? (
                      <Image src={p.cover_url} mode="aspectFill" style={{ width: '100%', height: '100%' }} lazyLoad />
                    ) : (
                      <View style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: cs.accent, opacity: 0.75 }}>
                        <Text style={{ fontSize: 30 }}>{getIcon(p.name)}</Text>
                      </View>
                    )}
                  </View>

                  {/* 右侧内容区 */}
                  <View style={{ flex: 1, padding: 8, paddingLeft: 12, paddingRight: 10, display: 'flex', flexDirection: 'column' }}>
                    {/* 中间区域：项目名居中 */}
                    <View style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 50 }}>
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: '600',
                          color: cs.name,
                          textAlign: 'center',
                          fontFamily: '-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif',
                        }}
                      >{p.name}</Text>
                    </View>
                    {/* 底部行：时间一行 + 金额 */}
                    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2, paddingBottom: 2 }}>
                      <Text style={{ fontSize: 11, color: '#94A3B8', flexShrink: 1 }}>{dateStr}</Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: cs.amount }}>¥{Number(p.total_amount || 0).toFixed(0)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          {!loading && filteredProjects.length === 0 && (
            <View className="flex flex-col items-center justify-center py-16">
              <Text className="block text-sm" style={{ color: '#94A3B8' }}>
                {searchText ? '未找到匹配项目' : '暂无项目，点击右下角添加'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ===== 浮动按钮（弹窗打开时不显示） ===== */}
      {!showAddModal && (
        <View
          onClick={() => setShowAddModal(true)}
          style={{
            position: 'fixed', right: 20, bottom: 30, zIndex: 999,
            width: 56, height: 56, borderRadius: 28,
            background: 'linear-gradient(135deg, #5B8DEE, #7BA8EA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 28px rgba(91,141,238,0.35), 0 3px 10px rgba(91,141,238,0.2)',
          }}
        >
          <Plus size={26} color="#FFFFFF" />
        </View>
      )}

      {/* ===== 新建项目弹窗 ===== */}
      {showAddModal && (
        <View style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: '#FFFFFF' }}>
          <View style={{ paddingTop: statusBarH + 6, display: 'flex', alignItems: 'center', padding: '0 16px', paddingBottom: 12 }}>
            <View onClick={() => { setShowAddModal(false); setNewCoverTemp(''); }}
              style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} color="#94A3B8" />
            </View>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#1E293B', paddingRight: 28 }}>添加新项目</Text>
          </View>

          <View style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* 第一项：项目名称 */}
            <View>
              <Text style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8, display: 'block', fontWeight: '500' }}>项目名称</Text>
              <Input value={newName} onInput={(e) => setNewName(e.detail.value)} placeholder="例如：云南之旅"
                style={{ height: 46, borderRadius: 12, backgroundColor: '#F8FAFC', padding: '0 14px', fontSize: 15, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'solid' }}
              />
            </View>

            {/* 第二项：封面图片 */}
            <View>
              <Text style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8, display: 'block', fontWeight: '500' }}>封面图片（可选）</Text>
              <View onClick={handleChooseCover} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {newCoverTemp ? (
                  <Image src={newCoverTemp} mode="aspectFill" style={{ width: 68, height: 68, borderRadius: 14 }} />
                ) : (
                  <View style={{ width: 68, height: 68, borderRadius: 14, backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed' }}>
                    <Camera size={24} color="#94A3B8" />
                  </View>
                )}
                <Text style={{ fontSize: 14, color: '#64748B' }}>点击选择或拍摄封面</Text>
              </View>
            </View>

            {/* 创建按钮 - 无+号 */}
            <View onClick={handleAddProject} style={{ height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #5B8DEE, #7BA8EA)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', letterSpacing: '2px' }}>创建项目</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
