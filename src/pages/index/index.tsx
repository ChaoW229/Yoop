import { useState, useEffect } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
/* eslint-disable-next-line no-restricted-syntax */
import { View, Text, Image, ScrollView, Input } from '@tarojs/components';
import { Network } from '@/network';
import { Search, User, ChartPie, Plus, X } from 'lucide-react-taro';

interface Project {
  id: string;
  name: string;
  total_amount: number | string;
  cover_url: string;
  start_date: string;
  end_date: string;
}

/* 12种低饱和度配色 - 含粉紫橙暖色调 */
const CARD_COLORS = [
  { bg: '#EDE7D9', name: '#6B5E4A', amount: '#A89068', accent: '#D4C4A0' }, /* 暖黄 */
  { bg: '#DDBEC8', name: '#6B4555', amount: '#B87A92', accent: '#C8A0AC' }, /* 玫粉 */
  { bg: '#C8DAE2', name: '#3D5A66', amount: '#6B99B0', accent: '#98C0D4' }, /* 雾蓝 */
  { bg: '#DFDCC8', name: '#5A5638', amount: '#99905A', accent: '#C8C498' }, /* 卡其 */
  { bg: '#D9D4E8', name: '#50486B', amount: '#8880AA', accent: '#B8B0D0' }, /* 薰衣紫 */
  { bg: '#E0DDD1', name: '#565342', amount: '#8E8968', accent: '#C4BF9E' }, /* 灰绿 */
  { bg: '#D4E2DD', name: '#3D554F', amount: '#6B9288', accent: '#98C8BC' }, /* 薄荷 */
  { bg: '#E8DDE0', name: '#6B4555', amount: '#C08595', accent: '#D8B8C0' }, /* 樱花粉 */
  { bg: '#DDD4E8', name: '#4A406B', amount: '#9080BB', accent: '#C0B0DD' }, /* 藤紫 */
  { bg: '#E8DFD4', name: '#6B5030', amount: '#C09050', accent: '#DDB89A' }, /* 杏橙 */
  { bg: '#D4E0E8', name: '#3D5566', amount: '#6090B0', accent: '#A0C0DC' }, /* 天青 */
  { bg: '#E0E4DD', name: '#4A5540', amount: '#809068', accent: '#B8C8A8' }, /* 苔绿 */
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
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  /* 新建项目的分账人列表 */
  const [newParticipants, setNewParticipants] = useState<string[]>([]);

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
    if (uploading) { Taro.showToast({ title: '图片上传中...', icon: 'none' }); return; }
    try {
      const coverUrl = newCoverUrl || '';
      console.log('[CreateProject] name=', newName.trim(), 'cover_url=', coverUrl, 'participants=', newParticipants);
      const res = await Network.request({
        url: '/api/projects',
        method: 'POST',
        data: { name: newName.trim(), cover_url: coverUrl, participants: newParticipants },
      });
      console.log('[CreateProject] response:', JSON.stringify(res.data)?.substring(0, 200));
      setShowAddModal(false); setNewName(''); setNewCoverTemp(''); setNewCoverUrl('');
      setNewParticipants([]);
      fetchProjects();
      Taro.eventCenter.trigger('yoop_project_updated');
      Taro.showToast({ title: '创建成功', icon: 'success' });
    } catch (e) { console.error('[CreateProject] error:', e); Taro.showToast({ title: '创建失败', icon: 'none' }); }
  };

  const handleChooseCover = async () => {
    if (uploading) return;
    setUploading(true);
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
      if (!tempFilePath) { setUploading(false); return; }
      setNewCoverTemp(tempFilePath);

      /* 上传到服务器 */
      console.log('[Upload] 开始上传封面图片...');
      const uploadRes = await Network.uploadFile({ url: '/api/upload', filePath: tempFilePath, name: 'file' });
      console.log('[Upload] cover raw result:', JSON.stringify(uploadRes.data).substring(0, 300));

      /* 解析响应（兼容字符串和对象格式） */
      let url = '';
      const respData = uploadRes.data as any;
      if (typeof respData === 'string') {
        try { const parsed = JSON.parse(respData); url = parsed?.data?.url || parsed?.url || ''; } catch (_) { console.error('[Upload] JSON解析失败:', respData.substring(0, 100)); }
      } else {
        url = respData?.data?.url || respData?.url || '';
      }

      console.log('[Upload] 解析后URL:', url);
      if (url) { setNewCoverUrl(url); Taro.showToast({ title: '图片已就绪', icon: 'success' }); }
      else { Taro.showToast({ title: '上传返回异常，请重试', icon: 'none' }); }
    } catch (e) {
      console.error('[Upload] error:', e);
      Taro.showToast({ title: '选择失败', icon: 'none' });
    } finally { setUploading(false); }
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

      {/* ====== 底部半屏弹窗：新建项目 ====== */}
      {showAddModal && (
        <View style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          {/* 遮罩层：点击关闭 */}
          <View
            onClick={() => { setShowAddModal(false); setNewCoverTemp(''); }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }}
          />
          {/* 弹出面板：从底部升起 */}
          <View
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              height: '62%',
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
              display: 'flex', flexDirection: 'column',
              padding: '0 20px',
            }}
            catchMove
          >
            {/* 顶部拖拽条 + 标题栏 */}
            <View style={{ paddingTop: 12, paddingBottom: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 12 }} />
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#1E293B', fontFamily: '-apple-system, "SF Pro Display", sans-serif' }}>添加新项目</Text>
            </View>

            {/* 表单内容区（可滚动） */}
            <ScrollView scrollY enhanced showScrollbar={false} style={{ flex: 1 }}>
              <View style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* 项目名称 */}
                <View>
                  <Text className="block" style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8, fontWeight: '500' }}>项目名称</Text>
                  {/* eslint-disable-next-line no-restricted-syntax */}
                  <Input value={newName} onInput={(e) => setNewName(e.detail.value)} placeholder="例如：云南之旅"
                    style={{ height: 46, borderRadius: 12, backgroundColor: '#F8FAFC', padding: '0 14px', fontSize: 15, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'solid' }}
                  />
                </View>

                {/* 封面图片 */}
                <View>
                  <Text className="block" style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8, fontWeight: '500' }}>封面图片（可选）</Text>
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

                {/* 选择分账人 */}
                <View>
                  <Text className="block" style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8, fontWeight: '500' }}>
                    选择分账人 <Text style={{ color: '#C0C8D4', fontSize: 11 }}>(添加花费时自动继承)</Text>
                  </Text>

                  {/* 已选分账人标签 */}
                  {newParticipants.length > 0 && (
                    <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {newParticipants.map((p) => {
                        const cIdx = Math.abs(p.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % CARD_COLORS.length;
                        const sc = CARD_COLORS[cIdx];
                        return (
                          /* eslint-disable-next-line no-restricted-syntax */
                          <View key={p} style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            backgroundColor: `${sc.bg}88`, borderRadius: 14,
                            paddingTop: 5, paddingBottom: 5, paddingLeft: 10, paddingRight: 8,
                          }}
                          >
                            <Text className="block" style={{ fontSize: 12, fontWeight: '600', color: sc.name }}>{p}</Text>
                            {/* eslint-disable-next-line no-restricted-syntax */}
                            <View onClick={() => setNewParticipants(prev => prev.filter(x => x !== p))}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <X size={12} color="#94A3B8" />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* 添加按钮 */}
                  <View
                    onClick={() => {
                      (Taro as any).showModal({
                        title: '添加分账人',
                        editable: true,
                        placeholderText: '输入姓名',
                        success: (res2: any) => {
                          if (res2.confirm && res2.content) {
                            const nm = res2.content.trim();
                            if (nm && !newParticipants.includes(nm)) {
                              setNewParticipants(prev => [...prev, nm]);
                            }
                          }
                        },
                      });
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      height: 40, borderRadius: 12,
                      border: '1px dashed #D1D9E0', backgroundColor: '#FAFBFD',
                    }}
                  >
                    <Plus size={16} color="#A0ABB8" />
                    <Text className="block text-xs" style={{ color: '#A0ABB8' }}>添加成员</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* 底部创建按钮（固定在面板底部） */}
            <View onClick={handleCreateProject}
              style={{
                marginTop: 10, marginBottom: 28, height: 48, borderRadius: 14,
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
