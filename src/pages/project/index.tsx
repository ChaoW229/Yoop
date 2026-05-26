import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import { Input } from '@/components/ui/input';
import { Network } from '@/network';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ArrowLeft, Plus, Trash2, Camera, Pencil } from 'lucide-react-taro';

interface Bill {
  id: string;
  name: string;
  category: string;
  amount: string;
  payer: string;
  is_treat: boolean;
  bill_date?: string;
}

/* 与首页一致的8种低饱和度配色 */
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
  return '\u{2708}\uFE0F';
}

const CATEGORY_ICONS: Record<string, string> = {
  '交通': '\uD83D\uDE97', '餐饮': '\uD83C\uDF7D', '住宿': '\uD83C\uDFE8', '纪念品': '\uD83C\uDF81', '门票': '\uD83C\uDFAB', '其他': '\uD83D\uDCCC',
};

export default function ProjectPage() {
  const [project, setProject] = useState<any>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  /* 编辑状态 */
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [editingDate, setEditingDate] = useState(false);
  const [editStartValue, setEditStartValue] = useState('');
  const [editEndValue, setEditEndValue] = useState('');

  /* 顶部与胶囊按钮对齐 */
  const statusBarH = Taro.getSystemInfoSync().statusBarHeight || 0;
  let capsuleBottom = statusBarH + 44;
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
  if (isWeapp) {
    try {
      const capsule = Taro.getMenuButtonBoundingClientRect();
      if (capsule && capsule.bottom) {
        capsuleBottom = capsule.bottom + 6;
      }
    } catch (e) { /* H5 fallback */ }
  }

  /* 固定区域高度 */
  const headerH = capsuleBottom;           // 标题栏
  const cardH = 112;                       // 封面卡片高度
  const buttonH = 52;                      // 添加花费按钮高度
  const bottomH = 56;                      // 底部删除按钮+安全距
  const topFixedH = headerH + cardH + buttonH + 16; // 顶部固定总高(含间距)

  const fetchData = async () => {
    try {
      const pages = Taro.getCurrentPages();
      const current = pages[pages.length - 1];
      const id = current.options?.id;
      if (!id) return;

      const [projRes, billsRes] = await Promise.all([
        Network.request({ url: `/api/projects/${id}` }),
        Network.request({ url: `/api/projects/${id}/bills` }),
      ]);
      console.log('project detail', projRes.data);
      const projData = projRes.data?.data;
      setProject(projData);
      setBills(billsRes.data?.data || []);
      /* 同步编辑值 */
      if (projData) {
        setEditNameValue(projData.name || '');
        setEditStartValue(projData.start_date || '');
        setEditEndValue(projData.end_date || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useLoad(() => {
    setTimeout(fetchData, 50);
  });

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const goBack = () => Taro.navigateBack();
  const goAddBill = () => Taro.navigateTo({ url: `/pages/add-bill/index?project_id=${project?.id}` });
  const goEditBill = (billId: string) => Taro.navigateTo({ url: `/pages/add-bill/index?project_id=${project?.id}&bill_id=${billId}` });

  /* ===== 编辑项目名称 ===== */
  const handleEditName = () => {
    setEditingName(true);
    setEditNameValue(project?.name || '');
  };

  const handleSaveName = async () => {
    if (!editNameValue.trim()) { Taro.showToast({ title: '名称不能为空', icon: 'none' }); return; }
    try {
      await Network.request({
        url: `/api/projects/${project.id}`,
        method: 'PUT',
        data: { name: editNameValue.trim() },
      });
      setProject(prev => ({ ...prev, name: editNameValue.trim() }));
      setEditingName(false);
      Taro.showToast({ title: '已更新', icon: 'success' });
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: '更新失败', icon: 'none' });
    }
  };

  /* ===== 编辑日期范围 ===== */
  const handleEditDate = () => {
    setEditingDate(true);
    setEditStartValue(project?.start_date || '');
    setEditEndValue(project?.end_date || '');
  };

  const handleSaveDate = async () => {
    try {
      await Network.request({
        url: `/api/projects/${project.id}`,
        method: 'PUT',
        data: { start_date: editStartValue, end_date: editEndValue },
      });
      setProject(prev => ({ ...prev, start_date: editStartValue, end_date: editEndValue }));
      setEditingDate(false);
      Taro.showToast({ title: '已更新', icon: 'success' });
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: '更新失败', icon: 'none' });
    }
  };

  /* ===== 封面图 ===== */
  const handleChangeCover = async () => {
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
      const uploadRes = await Network.uploadFile({
        url: '/api/upload',
        filePath: tempFilePath,
        name: 'file',
      });
      const parsed = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;
      const url = parsed?.data?.url;
      if (url && project?.id) {
        await Network.request({ url: `/api/projects/${project.id}`, method: 'PUT', data: { cover_url: url } });
        Taro.showToast({ title: '封面已更新', icon: 'success' });
        setRefreshKey(k => k + 1);
      }
    } catch (e) {
      console.error('choose cover error', e);
      Taro.showToast({ title: '选择失败', icon: 'none' });
    }
  };

  /* ===== 删除操作 ===== */
  const handleDelete = () => {
    if (!project) return;
    Taro.showModal({
      title: '删除项目',
      content: '确定要删除吗？账单也将一并删除。',
      confirmColor: '#E86C6C',
      success: async (res) => {
        if (res.confirm) {
          await Network.request({ url: `/api/projects/${project.id}`, method: 'DELETE' });
          Taro.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => Taro.navigateBack(), 800);
        }
      },
    });
  };

  const handleDeleteBill = (billId: string, billName: string) => {
    Taro.showModal({
      title: '删除账单',
      content: `确定要删除「${billName}」吗？`,
      confirmColor: '#E86C6C',
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({ url: `/api/bills/${billId}`, method: 'DELETE' });
            setBills(prev => prev.filter(b => b.id !== billId));
            Taro.showToast({ title: '已删除', icon: 'success' });
          } catch (e) {
            console.error(e);
            Taro.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      },
    });
  };

  /* 计算数据 */
  const billDates = bills.map(b => b.bill_date).filter(Boolean) as string[];
  const autoStart = billDates.length > 0 ? billDates.reduce((a, b) => (a < b ? a : b)) : project?.start_date;
  const autoEnd = billDates.length > 0 ? billDates.reduce((a, b) => (a > b ? a : b)) : project?.end_date;
  const displayStart = (project?.start_date || autoStart || '待定').replace(/-/g, '/');
  const displayEnd = (project?.end_date || autoEnd || '待定').replace(/-/g, '/');
  const totalAmount = bills.reduce((sum, b) => sum + Number(b.amount), 0);
  const treatAmount = bills.filter(b => b.is_treat).reduce((sum, b) => sum + Number(b.amount), 0);
  const splitAmount = totalAmount - treatAmount;
  const participantCount = project?.participants?.length || 1;
  const perPerson = participantCount > 0 ? splitAmount / participantCount : 0;

  const byDate: Record<string, Bill[]> = {};
  for (const b of bills) {
    const d = b.bill_date || '未分类';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(b);
  }

  const cc = getCardStyle(project?.id || '');

  /* 数据未加载时渲染占位 */
  if (!project) {
    return (
      <View className="flex flex-col min-h-full bg-white">
        <View style={{ paddingTop: statusBarH, height: capsuleBottom }} className="flex items-center px-4">
          <View onClick={goBack} className="w-8 h-8 flex items-center justify-center">
            <ArrowLeft size={18} color="#8896A6" />
          </View>
          <Text className="block flex-1 text-center text-base font-semibold pr-8" style={{ color: '#2D3748' }}>项目详情</Text>
        </View>
        <View className="px-4 pt-4 flex items-center justify-center" style={{ height: 200 }}>
          <Text className="block text-sm" style={{ color: '#A0ABB8' }}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex flex-col h-screen" style={{ backgroundColor: '#F7F9FC' }}>
      {/* ========== 1. Header：固定在顶部 ========== */}
      <View
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          zIndex: 100,
          paddingTop: statusBarH,
          height: capsuleBottom,
          backgroundColor: '#FFFFFF',
        }}
        className="flex items-center px-4"
      >
        <View onClick={goBack} className="w-8 h-8 flex items-center justify-center">
          <ArrowLeft size={16} color="#8896A6" />
        </View>
        <Text className="block flex-1 text-center font-semibold pr-8" style={{ color: '#2D3748', fontSize: 17, fontFamily: '-apple-system, "SF Pro Display", "PingFang SC", sans-serif' }}>项目详情</Text>
      </View>

      {/* ========== 2. 封面卡片：固定在标题下方 ========== */}
      <View
        style={{
          position: 'fixed',
          top: headerH,
          left: 12,
          right: 12,
          zIndex: 90,
          height: cardH,
        }}
      >
        <View
          className="flex items-center rounded-2xl overflow-hidden w-full h-full"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)',
          }}
        >
          {/* 封面图 */}
          <View
            className="flex items-center justify-center flex-shrink-0 relative overflow-hidden"
            style={{
              width: 96,
              height: 96,
              borderRadius: '16px',
              marginLeft: 10,
              background: project?.cover_url ? undefined : cc.accent,
              opacity: project?.cover_url ? undefined : 0.85,
            }}
            onClick={handleChangeCover}
          >
            {project?.cover_url ? (
              <Image style={{ width: 96, height: 96 }} src={project.cover_url} mode="aspectFill" />
            ) : (
              <Text className="block text-3xl">{getIcon(project?.name || '')}</Text>
            )}
            <View className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}>
              <Camera size={10} color={cc.name} />
            </View>
          </View>

          {/* 信息区 */}
          <View className="flex-1 p-3 flex flex-col justify-between h-full">
            {/* 项目名 - 支持点击编辑 */}
            {editingName ? (
              <View style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {/* eslint-disable-next-line no-restricted-syntax */}
                <View
                  style={{ flex: 1, borderBottom: `1px solid ${cc.bg}`, paddingBottom: 2 }}
                  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                >
                  {/* eslint-disable-next-line no-restricted-syntax */}
                  <Input
                    value={editNameValue}
                    onInput={(e: any) => setEditNameValue(e.detail.value)}
                    focus
                    confirmType="done"
                    onConfirm={handleSaveName}
                    onBlur={handleSaveName}
                    style={{ fontSize: 15, fontWeight: '600', color: '#2D3748', padding: 0, textAlign: 'center' }}
                  />
                </View>
              </View>
            ) : (
              <View
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                onClick={handleEditName}
              >
                <Text
                  className="block text-base font-semibold"
                  style={{ color: '#2D3748', letterSpacing: '0.5px' }}
                >
                  {project?.name}
                </Text>
                <Pencil size={11} color="#B0BEC5" />
              </View>
            )}

            {/* 时间 - 支持点击编辑 */}
            {editingDate ? (
              <View style={{ display: 'flex', flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Text className="block text-[10px]" style={{ color: '#8896A6' }}>起</Text>
                  {/* eslint-disable-next-line no-restricted-syntax */}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Input
                    type="text"
                    value={editStartValue}
                    placeholder="YYYY-MM-DD"
                    onInput={(e: any) => setEditStartValue(e.detail.value)}
                    style={{ fontSize: 11, color: cc.name, borderBottom: `1px solid ${cc.bg}`, width: 80, padding: 0 }}
                  />
                </View>
                <Text className="block text-xs" style={{ color: '#CBD5E0' }}>~</Text>
                <View style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Text className="block text-[10px]" style={{ color: '#8896A6' }}>止</Text>
                  {/* eslint-disable-next-line no-restricted-syntax */}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Input
                    type="text"
                    value={editEndValue}
                    placeholder="YYYY-MM-DD"
                    onInput={(e: any) => setEditEndValue(e.detail.value)}
                    onConfirm={handleSaveDate}
                    onBlur={handleSaveDate}
                    style={{ fontSize: 11, color: cc.name, borderBottom: `1px solid ${cc.bg}`, width: 80, padding: 0 }}
                  />
                </View>
                <View onClick={handleSaveDate}>
                  <Text className="block text-[11px]" style={{ color: cc.amount, fontWeight: '500' }}>✓</Text>
                </View>
              </View>
            ) : (
              <View
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                onClick={handleEditDate}
              >
                <Text className="block text-xs" style={{ color: '#8896A6' }}>
                  {displayStart} ~ {displayEnd}
                </Text>
                <Pencil size={10} color="#B0BEC5" />
              </View>
            )}

            {/* 金额行 */}
            <View className="flex items-end justify-between mt-1">
              <View>
                <Text className="block text-xs" style={{ color: '#8896A6' }}>总金额</Text>
                <Text className="block text-xl font-bold" style={{ color: cc.name }}>¥{totalAmount.toFixed(0)}</Text>
              </View>
              <View
                className="rounded-xl px-3 py-2"
                style={{ backgroundColor: '#F0F6FC', border: '1px solid #E4EDF7' }}
              >
                <Text className="block text-xs" style={{ color: cc.name }}>人均 ¥{perPerson.toFixed(2)}</Text>
                {treatAmount > 0 && (
                  <Text className="block text-xs mt-1" style={{ color: '#8896A6' }}>含请客 ¥{treatAmount.toFixed(0)}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ========== 3. 添加花费按钮：固定在卡片下方 ========== */}
      <View
        style={{
          position: 'fixed',
          top: headerH + cardH + 8,
          left: 12,
          right: 12,
          zIndex: 90,
          height: buttonH,
        }}
      >
        <View
          onClick={goAddBill}
          className="w-full rounded-2xl py-3 flex items-center justify-center gap-2 h-full"
          style={{
            background: `linear-gradient(135deg, ${cc.amount}CC, ${cc.bg})`,
            boxShadow: '0 6px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text className="block text-base font-semibold text-white">添加花费</Text>
        </View>
      </View>

      {/* ========== 4. 账单明细：中间滚动区域 ========== */}
      <ScrollView
        scrollY
        enhanced
        showScrollbar={false}
        style={{ flex: 1, marginTop: topFixedH, marginBottom: bottomH }}
      >
        <View style={{ padding: '4px 16px' }}>
          <Text className="block text-sm font-semibold mb-2 mt-1" style={{ color: '#2D3748' }}>账单明细</Text>

          {Object.entries(byDate).map(([date, items]) => (
            <View key={date} className="mb-3">
              <Text className="block text-xs mb-2" style={{ color: '#8896A6' }}>{date}</Text>
              {items.map(b => (
                <View
                  key={b.id}
                  className="flex items-center justify-between rounded-xl p-3 mb-2"
                  style={{
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 4px 16px rgba(91,155,213,0.06)',
                  }}
                  onClick={() => goEditBill(b.id)}
                  onLongPress={() => handleDeleteBill(b.id, b.name)}
                >
                  <View className="flex items-center gap-3">
                    <View
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: '#F0F6FC' }}
                    >
                      <Text className="block text-sm">{CATEGORY_ICONS[b.category] || '\uD83D\uDCCC'}</Text>
                    </View>
                    <View>
                      <Text className="block text-sm" style={{ color: '#2D3748' }}>{b.name}</Text>
                      <Text className="block text-xs" style={{ color: '#8896A6' }}>{b.payer}</Text>
                    </View>
                  </View>
                  <View className="flex items-center gap-2">
                    {b.is_treat && (
                      <View
                        className="rounded-full px-2 py-1"
                        style={{ backgroundColor: '#F0F6FC', border: '1px solid #E4EDF7' }}
                      >
                        <Text className="block text-xs" style={{ color: cc.name }}>请客</Text>
                      </View>
                    )}
                    <Text className="block text-sm font-semibold" style={{ color: b.is_treat ? cc.name : '#2D3748' }}>
                      ¥{Number(b.amount).toFixed(0)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

          {bills.length === 0 && (
            <View className="flex items-center justify-center py-8">
              <Text className="block text-sm" style={{ color: '#8896A6' }}>暂无账单，点击上方添加</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ========== 5. 删除项目按钮：固定在底部 ========== */}
      <View
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          paddingBottom: 8,
          paddingTop: 6,
          paddingLeft: 16,
          paddingRight: 16,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #F0F0F0',
        }}
      >
        <View
          onClick={handleDelete}
          className="w-full rounded-2xl py-3 flex items-center justify-center gap-2"
          style={{ border: '1px solid #FDE8E8', backgroundColor: '#FFF5F5' }}
        >
          <Trash2 size={16} color="#E86C6C" />
          <Text className="block text-sm font-semibold" style={{ color: '#E86C6C' }}>删除此项目</Text>
        </View>
      </View>
    </View>
  );
}
