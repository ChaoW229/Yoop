import { useState, useEffect, useMemo } from 'react';
import Taro, { useLoad, useDidShow } from '@tarojs/taro';
/* eslint-disable-next-line no-restricted-syntax, import/no-duplicates */
import { View, Text, Image, ScrollView, Picker, Input } from '@tarojs/components';
import { Network } from '@/network';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ArrowLeft, Plus, Camera, Pencil } from 'lucide-react-taro';

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

/* 12种低饱和度配色（含粉紫橙） */
const CARD_COLORS = [
  { bg: '#EDE7D9', name: '#6B5E4A', amount: '#A89068', accent: '#D4C4A0' },
  { bg: '#DDBEC8', name: '#6B4555', amount: '#B87A92', accent: '#C8A0AC' },
  { bg: '#C8DAE2', name: '#3D5A66', amount: '#6B99B0', accent: '#98C0D4' },
  { bg: '#DFDCC8', name: '#5A5638', amount: '#99905A', accent: '#C8C498' },
  { bg: '#D9D4E8', name: '#50486B', amount: '#8880AA', accent: '#B8B0D0' },
  { bg: '#E0DDD1', name: '#565342', amount: '#8E8968', accent: '#C4BF9E' },
  { bg: '#D4E2DD', name: '#3D554F', amount: '#6B9288', accent: '#98C8BC' },
  { bg: '#E2DCD8', name: '#584842', amount: '#987870', accent: '#C8B8AE' },
  /* 粉色系 */
  { bg: '#F5DEEB', name: '#7B4560', amount: '#CC7A9C', accent: '#EAB8CD' },
  { bg: '#EAD4EC', name: '#604075', amount: '#B088C0', accent: '#D4B8DA' },
  /* 橙色系 */
  { bg: '#F5DFD4', name: '#7A5038', amount: '#CC885A', accent: '#E8BC98' },
  { bg: '#FAE6D4', name: '#806030', amount: '#CCA05A', accent: '#EDCBA8' },
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

  /* 分账算法：计算谁该付给谁（必须在useMemo之前定义） */
  function calculateSettlement() {
    const nonTreatBills = bills.filter(b => !b.is_treat);
    if (!nonTreatBills || nonTreatBills.length === 0) return { balances: [], transfers: [] };

    /* 收集所有参与人（含项目级fallback） */
    const peopleSet = new Set<string>();
    for (const b of nonTreatBills) {
      if (b.payer) peopleSet.add(b.payer);
      const projParts = Array.isArray(project?.participants) && project.participants.length > 0 ? project.participants : null;
      const parts = Array.isArray(b.participants) && b.participants.length > 0 ? b.participants : (projParts || [b.payer]);
      if (Array.isArray(parts)) {
        parts.forEach((p: string) => { if (p) peopleSet.add(p); });
      }
    }
    const people = Array.from(peopleSet);
    if (people.length === 0) return { balances: [], transfers: [] };

    /* 计算每人应付/已付 */
    const paid: Record<string, number> = {};
    const share: Record<string, number> = {};
    for (const p of people) { paid[p] = 0; share[p] = 0; }

    for (const b of nonTreatBills) {
      const amt = Number(b.amount) || 0;
      if (b.payer && paid[b.payer] !== undefined) {
        paid[b.payer] = (paid[b.payer] || 0) + amt;
      }
      // 参与人：优先用账单自己的，否则继承项目分账人，最后fallback到支付人自己
        const projParts = Array.isArray(project?.participants) && project.participants.length > 0 ? project.participants : null;
        const parts = Array.isArray(b.participants) && b.participants.length > 0 ? b.participants : (projParts || [b.payer]);
      const perPerson = amt / parts.length;
      for (const p of parts) { if (p && share[p] !== undefined) share[p] = (share[p] || 0) + perPerson; }
    }

    /* 计算每人余额（含支出/收入明细） */
    let balanceList = people.map(p => ({
      name: p,
      paid: Math.round((paid[p] || 0) * 100) / 100,       // 实际支付金额（支出）
      share: Math.round((share[p] || 0) * 100) / 100,      // 应付份额（收入/应摊）
      balance: Math.round(((paid[p] || 0) - (share[p] || 0)) * 100) / 100,
    }));

    /* 归一化：确保所有余额之和严格为0（消除浮点误差） */
    if (balanceList.length > 0) {
      const total = balanceList.reduce((s, b) => s + b.balance, 0);
      if (Math.abs(total) > 0.001) {
        // 找到最后一个非零余额的人来吸收误差
        balanceList[balanceList.length - 1].balance =
          Math.round((balanceList[balanceList.length - 1].balance - total) * 100) / 100;
      }
    }

    /* 转账建议：正余额（多付）转给负余额（少付） */
    const creditors = balanceList.filter(x => x.balance > 1).sort((a, b) => b.balance - a.balance);
    const debtors = balanceList.filter(x => x.balance < -1).sort((a, b) => a.balance - b.balance);
    const transferList: any[] = [];
    for (const d of debtors) {
      let remaining = -d.balance;
      for (const c of creditors) {
        if (remaining < 1 || c.balance < 1) break;
        const amount = Math.min(remaining, c.balance);
        transferList.push({ from: d.name, to: c.name, amount: Math.round(amount * 100) / 100 });
        remaining -= amount;
        c.balance -= amount;
      }
    }

    console.log('[分账调试]', JSON.stringify({
      projectParticipants: project?.participants,
      bills: nonTreatBills.map(b => ({ name: b.name, payer: b.payer, participants: b.participants, amount: b.amount })),
    }));
    console.log('[分账]', JSON.stringify({ balanceList, transferList }));
    return { balances: balanceList, transfers: transferList };
  }

  const { balances, transfers } = useMemo(() => calculateSettlement(), [bills, project]);

  /* 有非请客账单即展示分账区域 */
  const hasSettlement = bills.filter(b => !b.is_treat).length > 0;
  /* 分账卡片固定高度 */
  const settleH = hasSettlement ? 200 : 0;       // 分账卡片高度
  const titleGap = 22;                     // 按钮与分账标题间距（标题要完全露出）
  const settleCardGap = 4;                 // 标题与其卡片的间距
  const detailTitleGap = 12;               // 分账卡片与明细标题的间距
  /* 分账标题top = headerH+cardGap+cardH+buttonGap+buttonH+titleGap */
  /* 分账卡片top = 标题top+20(标题高度)+settleCardGap */
  /* 明细标题top = 分账卡片top+settleH+detailTitleGap */
  /* 明细卡片top = 明细标题top+20 */
  const settleTitleTop = headerH + cardGap + cardH + buttonGap + buttonH + titleGap;
  const settleCardTop = settleTitleTop + 20 + settleCardGap;
  const detailTitleTop = settleCardTop + settleH + detailTitleGap;
  const detailCardTop = detailTitleTop + 20;
  /* 明细卡片起始位置 */

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
    const newEnd = e.detail.value;
    if (project?.start_date && newEnd < project.start_date) {
      Taro.showToast({ title: '终止时间不能早于起始时间', icon: 'none' });
      return;
    }
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
                <Text className="block text-xl font-bold" style={{ color: cc.name }}>¥{totalAmount.toFixed(2)}</Text>
              </View>
              <View
                className="rounded-xl px-3 py-2"
                style={{ backgroundColor: '#F0F6FC', border: '1px solid #E4EDF7' }}
              >
                <Text className="block text-xs" style={{ color: cc.name }}>人均 ¥{perPerson.toFixed(2)}</Text>
                {treatAmount > 0 && (
                  <Text className="block text-xs mt-1" style={{ color: '#8896A6' }}>请客共 ¥{treatAmount.toFixed(2)}</Text>
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

      {/* ========== 分账结算标题（卡片上方独立定位） ========== */}
      {hasSettlement && (
        <Text className="block text-sm font-semibold" style={{
          position: 'fixed',
          top: settleTitleTop,
          left: 12,
          zIndex: 86,
          color: '#374151',
          fontWeight: '700',
        }}
        >💰 分账结算</Text>
      )}

      {/* ========== 分账情况（白色卡片，标题在外部上方） ========== */}
      {hasSettlement && (
        <View
          style={{
            position: 'fixed',
            top: settleCardTop,
            left: 12,
            right: 12,
            zIndex: 85,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E8EDF2',
            boxShadow: '0 2px 12px rgba(91,155,213,0.04)',
            height: settleH,
          }}
        >
          <ScrollView scrollY enhanced showScrollbar={false} style={{ flex: 1, height: '100%' }}>
            <View style={{ padding: 10, paddingTop: 14 }}>
              {/* 每人净额 */}
              <View style={{ marginBottom: transfers.length > 0 ? 10 : 0 }}>
                <Text className="block" style={{ fontSize: 11, color: '#8896A6', marginBottom: 4, fontWeight: '500' }}>每人收支</Text>
                <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {balances.map((b) => {
                    const cIdx = Math.abs(b.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % CARD_COLORS.length;
                    const sc = CARD_COLORS[cIdx];
                    return (
                      <View key={`bal-${b.name}`} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        backgroundColor: sc.bg, borderRadius: 10,
                        paddingTop: 5, paddingBottom: 5, paddingLeft: 12, paddingRight: 12,
                        flexShrink: 0, minWidth: 70,
                      }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: sc.name }}>{b.name}</Text>
                        <Text style={{
                          fontSize: 15, fontWeight: '700',
                          color: b.balance > 0.01 ? '#059669' : b.balance < -0.01 ? '#DC2626' : '#9CA3AF',
                          marginTop: 1,
                        }}
                        >
                          {b.balance > 0 ? '+' : ''}{b.balance.toFixed(2)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* 转账建议 */}
              {transfers.length > 0 && (
                <>
                  <View style={{ borderTopWidth: 1, borderTopColor: '#F0F4F8', paddingTop: 6, marginTop: 4, marginBottom: 4 }}>
                    <Text className="block" style={{ fontSize: 11, color: '#8896A6', marginBottom: 4, fontWeight: '500' }}>建议转账</Text>
                  </View>
                  {transfers.map((t, i) => {
                    const cIdx = i % CARD_COLORS.length;
                    const sc = CARD_COLORS[cIdx];
                    return (
                      <View key={`${t.from}-${t.to}`} style={{
                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6,
                        backgroundColor: `${sc.bg}66`, borderRadius: 20,
                        paddingTop: 6, paddingBottom: 6, paddingLeft: 12, paddingRight: 12,
                        marginBottom: i < transfers.length - 1 ? 5 : 0,
                      }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444' }}>{t.from}</Text>
                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>需支付</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#DC2626' }}>¥{t.amount.toFixed(2)}</Text>
                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>给</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>{t.to}</Text>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ========== 账单明细标题（卡片上方独立定位） ========== */}
      <Text className="block text-sm font-semibold" style={{
        position: 'fixed',
        top: detailTitleTop,
        left: 12,
        zIndex: 81,
        color: '#374151',
        fontWeight: '700',
      }}
      >账单明细</Text>

      {/* ========== 账单明细（白色卡片） ========== */}
      <View
        style={{
          position: 'fixed',
          top: detailCardTop,
          left: 12,
          right: 12,
          bottom: 62,
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
              <View key={date} style={{ marginBottom: 10 }}>
                <Text className="block mb-2" style={{ fontSize: 11, color: '#8896A6', fontWeight: '500' }}>{date}</Text>
                {items.map(b => {
                  const isTreat = !!b.is_treat;
                  return (
                    <View
                      key={b.id}
                      className="flex items-center justify-between rounded-xl p-3 mb-2"
                      style={{ backgroundColor: '#FAFBFD', border: '1px solid #F0F4F8' }}
                      onClick={() => goEditBill(b.id)}
                      onLongPress={() => handleDeleteBill(b.id, b.name)}
                    >
                      <View className="flex items-center gap-3">
                        <View className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F0F6FC' }}>
                          <Text className="block text-xs">{CATEGORY_ICONS[b.category] || '\ud83d\udccc'}</Text>
                        </View>
                        <View>
                          <Text className="block text-sm" style={{ color: isTreat ? '#D97706' : '#2D3748' }}>{b.name}</Text>
                          <Text className="block" style={{ fontSize: 11, color: '#A0ABB8' }}>{b.payer}{isTreat ? ' · 请客' : ''}</Text>
                        </View>
                      </View>
                      <View className="flex items-center gap-2">
                        {isTreat && (
                          <View className="rounded-full px-2 py-1" style={{ backgroundColor: '#FDE68A', border: '1px solid #F59E0B' }}>
                            <Text className="block" style={{ fontSize: 10, fontWeight: '600', color: '#92400E' }}>请客</Text>
                          </View>
                        )}
                        <Text className="block text-sm font-semibold" style={{ color: isTreat ? '#D97706' : '#2D3748' }}>
                          ¥{Number(b.amount).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            ))}

            {bills.length === 0 && (
              <View className="flex items-center justify-center py-12">
                <Text className="block text-sm" style={{ color: '#A0ABB8' }}>暂无账单，点击上方添加</Text>
              </View>
            )}
            <View style={{ height: 24 }} />  {/* 底部留白确保圆角可见 */}
          </View>
        </ScrollView>
      </View>

      {/* ========== 删除此项目 ========== */}
      <View
        className="rounded-xl flex items-center justify-center"
        style={{
          position: 'fixed',
          bottom: 10,
          left: 12,
          right: 12,
          height: 46,
          zIndex: 90,
          backgroundColor: '#FFF1F2',
          border: '1px solid #FECDD3',
        }}
        onClick={handleDelete}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#DC2626' }}>🗑 删除此项目</Text>
      </View>
    </View>
  )
}

