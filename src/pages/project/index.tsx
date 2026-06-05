import { useState, useEffect, useMemo } from 'react';
import Taro, { useLoad, useDidShow } from '@tarojs/taro';
/* eslint-disable-next-line no-restricted-syntax, import/no-duplicates */
import { View, Text, Image, ScrollView, Picker, Input } from '@tarojs/components';
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
  participants?: string[];
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
  const cardGap = 10;                      // 标题与卡片间距
  const cardH = 112;                       // 封面卡片高度
  const buttonGap = 8;                     // 卡片与按钮间距
  const buttonH = 52;                      // 添加花费按钮高度
  /* 分账算法：计算谁该付给谁 */
  const { balances, transfers } = useMemo(() => calculateSettlement(), [bills]);

  /* 有非请客账单即展示分账区域（不再要求必须有转账建议） */
  const hasSettlement = bills.filter(b => !b.is_treat).length > 0;
  /* 分账卡片高度：根据内容动态计算 */
  const settleH = hasSettlement ? (transfers.length > 0 ? 120 : 100) : 0;
  const settleGap = 6;                     // 按钮与分账卡片间距
  const sectionH = 32;                     // 账单明细标题行高(fixed)
  const bottomH = 90;                      // 底部删除按钮+安全距（确保明细窗口圆角可见）
  const topFixedH = headerH + cardGap + cardH + buttonGap + buttonH + (settleH > 0 ? settleGap + settleH : 0) + sectionH;

  /* 分账算法：计算谁该付给谁（函数声明，可被下方useMemo调用） */
  function calculateSettlement() {
    const nonTreatBills = bills.filter(b => !b.is_treat);
    if (nonTreatBills.length === 0) return { balances: [], transfers: [] };

    /* 收集所有参与人 */
    const peopleSet = new Set<string>();
    for (const b of nonTreatBills) {
      peopleSet.add(b.payer);
      const parts = b.participants || [];
      parts.forEach((p: string) => peopleSet.add(p));
    }
    const people = Array.from(peopleSet);

    /* 计算每人应付/已付 */
    const paid: Record<string, number> = {};
    const share: Record<string, number> = {};
    for (const p of people) { paid[p] = 0; share[p] = 0; }

    for (const b of nonTreatBills) {
      const amt = Number(b.amount) || 0;
      paid[b.payer] = (paid[b.payer] || 0) + amt;
      const parts = (b.participants && b.participants.length > 0) ? b.participants : [b.payer];
      const perPerson = amt / parts.length;
      for (const p of parts) { share[p] = (share[p] || 0) + perPerson; }
    }

    /* 结余 = 已付 - 应付 */
    const _balances: { name: string; balance: number; color: string }[] = [];
    for (const p of people) {
      const bal = (paid[p] || 0) - (share[p] || 0);
      if (Math.abs(bal) > 0.01) _balances.push({ name: p, balance: Math.round(bal * 100) / 100, color: CARD_COLORS[Math.abs(p.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % CARD_COLORS.length].amount });
    }

    /* 转账建议：欠钱多的 → 收钱多的 */
    const debtors = _balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
    const creditors = _balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const _transfers: { from: string; to: string; amount: number }[] = [];
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const owe = -debtors[di].balance;
      const get = creditors[ci].balance;
      const amount = Math.min(owe, get);
      if (amount > 0.01) _transfers.push({ from: debtors[di].name, to: creditors[ci].name, amount: Math.round(amount * 100) / 100 });
      debtors[di].balance += amount;
      creditors[ci].balance -= amount;
      if (Math.abs(debtors[di].balance) <= 0.01) di++;
      if (Math.abs(creditors[ci].balance) <= 0.01) ci++;
    }

    return { balances: _balances, transfers: _transfers };
  };

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
      }
    } catch (e) {
      console.error(e);
    }
  };

  /* 页面显示时刷新（从添加/编辑页返回时触发）*/
  useEffect(() => {
    fetchData();
    /* 监听账单/项目更新事件 */
    Taro.eventCenter.on('yoop_bill_updated', fetchData);
    Taro.eventCenter.on('yoop_project_updated', fetchData);
    return () => {
      Taro.eventCenter.off('yoop_bill_updated', fetchData);
      Taro.eventCenter.off('yoop_project_updated', fetchData);
    };
  }, []);

  useLoad(() => {
    setTimeout(fetchData, 50);
  });

  useDidShow(() => {
    fetchData();
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
      /* 通知首页刷新 */
      Taro.eventCenter.trigger('yoop_project_updated');
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: '更新失败', icon: 'none' });
    }
  };

  /* ===== 编辑日期范围（使用 Picker 选择器） ===== */
  const handleEditDate = () => {
    setEditingDate(true);
  };

  const onStartDateChange = async (e: any) => {
    try {
      await Network.request({
        url: `/api/projects/${project.id}`,
        method: 'PUT',
        data: { start_date: e.detail.value },
      });
      setProject(prev => ({ ...prev, start_date: e.detail.value }));
      Taro.showToast({ title: '已更新', icon: 'success' });
      Taro.eventCenter.trigger('yoop_project_updated');
    } catch (err) {
      console.error(err);
      Taro.showToast({ title: '更新失败', icon: 'none' });
    }
  };

  const onEndDateChange = async (e: any) => {
    try {
      await Network.request({
        url: `/api/projects/${project.id}`,
        method: 'PUT',
        data: { end_date: e.detail.value },
      });
      setProject(prev => ({ ...prev, end_date: e.detail.value }));
      setEditingDate(false);
      Taro.showToast({ title: '已更新', icon: 'success' });
      Taro.eventCenter.trigger('yoop_project_updated');
    } catch (err) {
      console.error(err);
      Taro.showToast({ title: '更新失败', icon: 'none' });
    }
  };

  const finishDateEdit = () => setEditingDate(false);

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
          Taro.eventCenter.trigger('yoop_project_updated');
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
            Taro.eventCenter.trigger('yoop_bill_updated');
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

      {/* ========== 2. 封面卡片：固定在标题下方（带间距） ========== */}
      <View
        style={{
          position: 'fixed',
          top: headerH + cardGap,
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
            {/* 项目名 - 支持点击编辑（紧凑内联输入框） */}
            {editingName ? (
              <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {/* eslint-disable-next-line no-restricted-syntax */}
                <Input
                  value={editNameValue}
                  onInput={(e: any) => setEditNameValue(e.detail.value)}
                  focus
                  confirmType="done"
                  onConfirm={handleSaveName}
                  onBlur={handleSaveName}
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#2D3748',
                    padding: 0,
                    textAlign: 'center',
                    borderBottom: `1px solid ${cc.name}66`,
                    width: 120,
                    height: 24,
                    lineHeight: '24px',
                  }}
                />
                <Text onClick={handleSaveName} style={{ fontSize: 14, color: cc.amount, fontWeight: '500' }}>✓</Text>
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

            {/* 时间 - 使用 Picker 选择器，点击后弹出日期选择器 */}
            {editingDate ? (
              <View style={{ display: 'flex', flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Text className="block" style={{ fontSize: 10, color: '#8896A6' }}>起</Text>
                  <Picker mode="date" value={project?.start_date || ''} onChange={onStartDateChange}>
                    <View style={{ borderBottom: `1px solid ${cc.name}66`, padding: '0 4px' }}>
                      <Text style={{ fontSize: 11, color: cc.name }}>{(project?.start_date || '选择').replace(/-/g, '/')}</Text>
                    </View>
                  </Picker>
                </View>
                <Text className="block text-xs" style={{ color: '#CBD5E0' }}>~</Text>
                <View style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Text className="block" style={{ fontSize: 10, color: '#8896A6' }}>止</Text>
                  <Picker mode="date" value={project?.end_date || ''} onChange={onEndDateChange}>
                    <View style={{ borderBottom: `1px solid ${cc.name}66`, padding: '0 4px' }}>
                      <Text style={{ fontSize: 11, color: cc.name }}>{(project?.end_date || '选择').replace(/-/g, '/')}</Text>
                    </View>
                  </Picker>
                </View>
                <View onClick={finishDateEdit}>
                  <Text className="block" style={{ fontSize: 11, color: cc.amount, fontWeight: '500' }}>✓</Text>
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
          top: headerH + cardGap + cardH + buttonGap,
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

      {/* ========== 3.5 分账情况：固定在添加花费和账单之间（有非请客账单时显示） ========== */}
      {hasSettlement && (
        <View
          style={{
            position: 'fixed',
            top: headerH + cardGap + cardH + buttonGap + buttonH + settleGap,
            left: 12,
            right: 12,
            zIndex: 85,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E8EDF2',
            boxShadow: '0 2px 12px rgba(91,155,213,0.04)',
            padding: 14,
            minHeight: settleH,
          }}
        >
          {/* 标题 */}
          <View style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>💰 分账情况</Text>
            <Text style={{ fontSize: 11, color: '#94A3B8', marginLeft: 8 }}>{balances.length}人参与</Text>
          </View>

          {/* 有转账建议时显示转账列表 */}
          {transfers.length > 0 ? (
            <ScrollView scrollX enhanced showScrollbar={false}>
              <View style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                {transfers.map((t, i) => {
                  const cIdx = i % CARD_COLORS.length;
                  const sc = CARD_COLORS[cIdx];
                  return (
                    <View key={`${t.from}-${t.to}`} style={{
                      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: sc.bg, borderRadius: 20,
                      paddingTop: 6, paddingBottom: 6, paddingLeft: 12, paddingRight: 12,
                      border: `1px solid ${sc.accent}`,
                      flexShrink: 0,
                    }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: sc.name }}>{t.from}</Text>
                      <Text style={{ fontSize: 11, color: '#EF4444' }}>→¥{t.amount.toFixed(0)}→</Text>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: sc.name }}>{t.to}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            /* 无转账建议时：显示余额汇总 */
            <ScrollView scrollX enhanced showScrollbar={false}>
              <View style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                {balances.map((b, i) => {
                  const cIdx = i % CARD_COLORS.length;
                  const sc = CARD_COLORS[cIdx];
                  return (
                    <View key={`bal-${b.name}`} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      backgroundColor: sc.bg, borderRadius: 14,
                      paddingTop: 8, paddingBottom: 8, paddingLeft: 14, paddingRight: 14,
                      border: `1px solid ${sc.accent}`,
                      flexShrink: 0,
                      gap: 2,
                    }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: sc.name }}>{b.name}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: b.balance > 0 ? '#10B981' : b.balance < 0 ? '#EF4444' : '#6B7280' }}>
                        {b.balance > 0 ? '+' : ''}{b.balance.toFixed(0)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* ========== 4. 账单明细标题：固定不动 ========== */}
      <View
        style={{
          position: 'fixed',
          top: headerH + cardGap + cardH + buttonGap + buttonH + (settleH > 0 ? settleGap + settleH : 0) + 4,
          left: 16,
          right: 16,
          zIndex: 90,
          height: sectionH,
        }}
        className="flex items-center"
      >
        <Text className="block text-sm font-semibold" style={{ color: '#2D3748' }}>账单明细</Text>
      </View>

      {/* ========== 5. 账单列表：带边框窗口容器内滚动 ========== */}
      <View
        style={{
          position: 'fixed',
          top: topFixedH,
          left: 12,
          right: 12,
          bottom: bottomH,
          zIndex: 80,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8EDF2',
          boxShadow: '0 4px 20px rgba(91,155,213,0.05)',
        }}
      >
        <ScrollView scrollY enhanced showScrollbar={false} style={{ flex: 1, height: '100%' }}>
          <View style={{ padding: 12 }}>
            {Object.entries(byDate).map(([date, items]) => (
              <View key={date} style={{ marginBottom: 12 }}>
                <Text className="block mb-2" style={{ fontSize: 11, color: '#8896A6', fontWeight: '500' }}>{date}</Text>
                {items.map(b => (
                  <View
                    key={b.id}
                    className="flex items-center justify-between rounded-xl p-3 mb-2"
                    style={{
                      backgroundColor: '#FAFBFD',
                      border: '1px solid #F0F4F8',
                    }}
                    onClick={() => goEditBill(b.id)}
                    onLongPress={() => handleDeleteBill(b.id, b.name)}
                  >
                    <View className="flex items-center gap-3">
                      <View
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: '#F0F6FC' }}
                      >
                        <Text className="block text-xs">{CATEGORY_ICONS[b.category] || '\uD83D\uDCCC'}</Text>
                      </View>
                      <View>
                        <Text className="block text-sm" style={{ color: '#2D3748' }}>{b.name}</Text>
                        <Text className="block" style={{ fontSize: 11, color: '#A0ABB8' }}>{b.payer}</Text>
                      </View>
                    </View>
                    <View className="flex items-center gap-2">
                      {b.is_treat && (
                        <View
                          className="rounded-full px-2 py-1"
                          style={{ backgroundColor: '#F0F6FC', border: '1px solid #E4EDF7' }}
                        >
                          <Text className="block" style={{ fontSize: 10, color: cc.name }}>请客</Text>
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
              <View className="flex items-center justify-center py-12">
                <Text className="block text-sm" style={{ color: '#A0ABB8' }}>暂无账单，点击上方添加</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* ========== 6. 删除此项目按钮：固定在底部（无边框） ========== */}
      <View
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          paddingBottom: 12,
          paddingTop: 8,
          paddingLeft: 20,
          paddingRight: 20,
          backgroundColor: '#F7F9FC',
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
