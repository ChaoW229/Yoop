import { useState, useEffect } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
/* eslint-disable-next-line no-restricted-syntax */
import { View, Text, Image, ScrollView, Input } from '@tarojs/components';
import { Network } from '@/network';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Search, User, ChartPie, Plus, X } from 'lucide-react-taro';
/* eslint-enable @typescript-eslint/no-unused-vars */

interface Project {
  id: string;
  name: string;
  total_amount: number | string;
  cover_url: string;
  start_date: string;
  end_date: string;
}

/* 与项目详情页/添加花费页一致的8种低饱和度配色 */
const CARD_COLORS = [
  { bg: '#EDE7D9', name: '#6B5E4A', amount: '#A89068', accent: '#D4C4A0' },
  { bg: '#DDBEC8', name: '#6B4555', amount: '#B87A92', accent: '#C8A0AC' },
  { bg: '#C8DAE2', name: '#3D5A66', amount: '#6B99B0', accent: '#98C0D4' },
  { bg: '#DFDCC8', name: '#5A5638', amount: '#99905A', accent: '#C8C498' },
  { bg: '#D9D4E8', name: '#50486B', amount: '#8880AA', accent: '#B8B0D0' },
  { bg: '#E0DDD1', name: '#565342', amount: '#8E8968', accent: '#C4BF9E' },
  { bg: '#D4E2DD', name: '#3D554F', amount: '#6B9288', accent: '#98C8BC' },
  { bg: '#E2DCD8', name: '#584842', amount: '#987870', accent: '#C8B8AE' },
];

function getCardStyle(id: string) {
  const idx = Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % CARD_COLORS.length;
  return CARD_COLORS[idx];
}

function getIcon(name: string): string {
  if (!name || name === '') return '?';
  const icons = ['🏕️', '🏖️', '🌅', '⛰️', '🎐', '🏔️', '🌊', '🍜', '🚗', '✨'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
  return icons[Math.abs(hash) % icons.length] || icons[0];
}

function formatDateSlash(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  } catch (_) { return dateStr; }
}

export default function IndexPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCoverTemp, setNewCoverTemp] = useState('');

  /* 动画状态 */
  const [cardVisible, setCardVisible] = useState<Record<string, boolean>>({});
  const [pressedId, setPressedId] = useState<string | null>(null);

  /* 系统信息 - 与项目详情页完全一致 */
  const statusBarH = Taro.getSystemInfoSync().statusBarHeight || 20;

  let capsuleBottom = statusBarH + 44;
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === Taro.ENV_TYPE.TT;
  if (isWeapp) {
    try {
      const mb = Taro.getMenuButtonBoundingClientRect();
      if (mb && mb.bottom > 0) capsuleBottom = mb.bottom + 6;
    } catch (_) {}
  }

  /* Header 总高度：导航栏(标题) + 搜索栏行 */
  const navBarHeight = capsuleBottom;
  const searchBarRowHeight = 52;
  const headerTotalH = navBarHeight + searchBarRowHeight;

  useEffect(() => {
    fetchProjects();
    /* 监听其他页面触发的更新事件 */
    Taro.eventCenter.on('yoop_project_updated', fetchProjects);
    Taro.eventCenter.on('yoop_bill_updated', fetchProjects);
    return () => {
      Taro.eventCenter.off('yoop_project_updated', fetchProjects);
      Taro.eventCenter.off('yoop_bill_updated', fetchProjects);
    };
  }, []);

  useDidShow(() => {
    fetchProjects();
  });

  useEffect(() => {
    projects.forEach((p, i) => {
      setTimeout(() => setCardVisible(prev => ({ ...prev, [p.id]: true })), i * 80);
    });
  }, [projects]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await Network.request({ url: '/api/projects' });
      console.log('首页项目数据:', res.data?.data);
      setProjects(res.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const goStats = () => Taro.navigateTo({ url: '/pages/stats/index' });
  const goProfile = () => Taro.navigateTo({ url: '/pages/profile/index' });
  const goProject = (id: string) => Taro.navigateTo({ url: `/pages/project/index?id=${id}` });

  const filteredProjects = projects.filter(p =>
    !searchText || p.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleCreateProject = async () => {
    if (!newName.trim()) { Taro.showToast({ title: '请输入名称', icon: 'none' }); return; }
    try {
      await Network.request({
        url: '/api/projects',
        method: 'POST',
        data: { name: newName.trim(), cover_url: newCoverTemp },
      });
      setShowAddModal(false); setNewName(''); setNewCoverTemp('');
      fetchProjects();
      Taro.showToast({ title: '创建成功', icon: 'success' });
    } catch (e) { Taro.showToast({ title: '创建失败', icon: 'none' }); }
  };

  const handleChooseCover = async () => {
    const isMiniApp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === Taro.ENV_TYPE.TT;
    try {
      let tempFilePath = '';
      if (isMiniApp) {
        const res = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'] });
        if (res.tempFiles && res.tempFiles.length > 0) tempFilePath = res.tempFiles[0].tempFilePath;
      } else {
        const res = await Taro.chooseImage({ count: 1, sourceType: ['album', 'camera'] });
        if (res.tempFilePaths && res.tempFilePaths.length > 0) tempFilePath = res.tempFilePaths[0];
      }
      if (!tempFilePath) return;
      const uploadRes = await Network.uploadFile({ url: '/api/upload', filePath: tempFilePath, name: 'file' });
      const parsed = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;
      const url = parsed?.data?.url;
      if (url) setNewCoverTemp(url);
    } catch (e) { console.error('choose error', e); }
  };

  /* 统一标题字体样式 */
  const titleStyle: React.CSSProperties = {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: '-apple-system, "SF Pro Display", "PingFang SC", sans-serif',
    color: '#1E293B',
  };

  return (
    <View className="flex flex-col h-full" style={{ backgroundColor: '#F7F9FC' }}>
      {/* ===== 固定头部：导航栏(Yoop) + 搜索栏 ===== */}
      <View
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* 导航栏：Yoop 标题 */}
        <View
          style={{
            paddingTop: statusBarH,
            height: capsuleBottom,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <Text className="block" style={titleStyle}>Yoop</Text>
        </View>

        {/* 搜索栏行 */}
        <View style={{ padding: '6px 16px 10px' }}>
          <View style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <View onClick={goStats}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <ChartPie size={15} color="#6B9BD5" />
            </View>
            <View style={{ flex: 1, height: 38, borderRadius: 19, backgroundColor: '#F0F4F8', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
              <Search size={14} color="#A0ABB8" style={{ marginRight: 7 }} />
              {/* eslint-disable-next-line no-restricted-syntax */}
              <Input
                value={searchText}
                onInput={(e) => setSearchText(e.detail.value)}
                placeholder="搜索项目"
                confirmType="search"
                style={{ flex: 1, fontSize: 13, lineHeight: '38px', height: '100%', backgroundColor: 'transparent', border: 'none', outline: 'none', padding: '0 8px' }}
              />
            </View>
            <View onClick={goProfile}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <User size={15} color="#6B9BD5" />
            </View>
          </View>
        </View>
      </View>

      {/* ===== 项目列表（留出固定头部高度） ===== */}
      <ScrollView
        scrollY
        enhanced
        showScrollbar={false}
        style={{ flex: 1, marginTop: headerTotalH }}
      >
        <View style={{ padding: '12px 16px 140px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {filteredProjects.map((p) => {
            const cs = getCardStyle(p.id);
            const dateStr = p.start_date ? `${formatDateSlash(p.start_date)}${p.end_date ? ` ~ ${formatDateSlash(p.end_date)}` : ''}` : '待定';
            const isVisible = cardVisible[p.id] !== false;

            return (
              <View key={p.id}
                onClick={() => goProject(p.id)}
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
                }}
              >
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', minHeight: 110, backgroundColor: cs.bg }}>
                  {/* 左侧图片 1:1 */}
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
                  <View style={{ flex: 1, padding: '10px 12px 8px', display: 'flex', flexDirection: 'column' }}>
                    {/* 金额 - 右上 */}
                    <View style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: cs.amount }}>¥{Number(p.total_amount || 0).toFixed(0)}</Text>
                    </View>
                    {/* 项目名：居中 */}
                    <View style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 32 }}>
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: '600',
                          color: cs.name,
                          textAlign: 'center',
                          fontFamily: '-apple-system, "SF Pro Display", "PingFang SC", sans-serif',
                        }}
                      >{p.name}</Text>
                    </View>
                    {/* 时间：底部居中 */}
                    <View style={{ display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
                      <Text style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>{dateStr}</Text>
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

      {/* 浮动按钮 */}
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

      {/* 新建项目弹窗 */}
      {showAddModal && (
        <View style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: '#FFFFFF' }}>
          <View style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, backgroundColor: '#FFFFFF', height: capsuleBottom + 14 }}>
            <View style={{ paddingTop: statusBarH, display: 'flex', alignItems: 'center', padding: '0 16px', paddingBottom: 10 }}>
              <View onClick={() => { setShowAddModal(false); setNewCoverTemp(''); }}
                style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} color="#94A3B8" />
              </View>
              <Text style={{ flex: 1, textAlign: 'center', ...titleStyle, paddingRight: 28 }}>添加新项目</Text>
            </View>
          </View>

          <View style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18, marginTop: capsuleBottom + 6 }}>
            <View>
              <Text style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8, display: 'block', fontWeight: '500' }}>项目名称</Text>
              {/* eslint-disable-next-line no-restricted-syntax */}
              <Input value={newName} onInput={(e) => setNewName(e.detail.value)} placeholder="例如：云南之旅"
                style={{ height: 46, borderRadius: 12, backgroundColor: '#F8FAFC', padding: '0 14px', fontSize: 15, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'solid' }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8, display: 'block', fontWeight: '500' }}>封面图片（可选）</Text>
              <View onClick={handleChooseCover} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {newCoverTemp ? (
                  <Image src={newCoverTemp} mode="aspectFill" style={{ width: 68, height: 68, borderRadius: 14 }} />
                ) : (
                  <View style={{ width: 68, height: 68, borderRadius: 14, backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed' }}>
                    <Text style={{ fontSize: 24, opacity: 0.4 }}>+</Text>
                  </View>
                )}
                <Text style={{ fontSize: 13, color: '#8896A6' }}>{newCoverTemp ? '点击更换图片' : '点击选择封面'}</Text>
              </View>
            </View>

            <View onClick={handleCreateProject}
              style={{
                marginTop: 8, height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg, #5B8DEE, #7BA8EA)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>创建项目</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
