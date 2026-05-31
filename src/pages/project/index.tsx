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


const CATEGORY_ICONS: Record<string, string> = {
  '交通': '\uD83D\uDE97', '餐饮': '\uD83C\uDF7D', '住宿': '\uD83C\uDFE8', '纪念品': '\uD83C\uDF81', '门票': '\uD83C\uDFAB', '其他': '\uD83D\uDCCC',
};

/* 分账算法：计算谁该付给谁（函数声明，可被 hoisting） */
function calculateSettlement(bills: Bill[]) {
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
}

// @ts-ignore Taro page component
function ProjectPage() {
  const [project, setProject] = useState<any>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [refreshKey] = useState(0);

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

  /* 分账算法（函数已 hoist 到组件外部，安全调用）*/
  const { balances, transfers } = useMemo(() => calculateSettlement(bills), [bills]);

  const hasSettlement = bills.length > 0 && transfers.length > 0;  // 有账单且有转账建议时才显示
  const settleH = hasSettlement ? 110 : 0;           // 分账情况卡片高度
  const sectionH = 32;                     // 账单明细标题行高(fixed)
  const bottomH = 56;                      // 底部删除按钮+安全距
  // 布局常量（不含分账，分账动态计算）
  const topFixedH = headerH + cardGap + cardH + buttonGap + buttonH;

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
    const val = e.detail.value;
    if (!val || !project) return;
    try {
      await Network.request({
        url: `/api/projects/${project.id}`,
        method: 'PUT',
        data: { start_date: val.replace(/-/g, '-') },
      });
      setProject(prev => ({ ...prev, start_date: val }));
      Taro.showToast({ title: '已更新', icon: 'success' });
    } catch (err) {
      Taro.showToast({ title: '保存失败', icon: 'none' });
    }
  };
  const onEndDateChange = async (e: any) => {
    const val = e.detail.value;
    if (!val || !project) return;
    try {
      await Network.request({
        url: `/api/projects/${project.id}`,
        method: 'PUT',
        data: { end_date: val.replace(/-/g, '-') },
      });
      setProject(prev => ({ ...prev, end_date: val }));
      Taro.showToast({ title: '已更新', icon: 'success' });
    } catch (err) {
      Taro.showToast({ title: '保存失败', icon: 'none' });
    }
  };

  /* ===== 删除项目 ===== */
  const handleDeleteProject = () => {
    if (!project) return;
    Taro.showModal({
      title: '删除项目',
      content: `确定要删除「${project.name}」吗？所有账单将被永久删除。`,
      confirmColor: '#EF4444',
      success: async (res) => {
        if (res.confirm && project) {
          try {
            await Network.request({ url: `/api/projects/${project.id}`, method: 'DELETE' });
            Taro.eventCenter.trigger('yoop_project_updated');
            Taro.navigateBack();
          } catch (e) {
            Taro.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      },
    });
  };

  /* ===== 删除单条账单 ===== */
  const handleDeleteBill = (bill: Bill) => {
    Taro.showModal({
      title: '删除账单',
      content: `确定要删除「${bill.name}」吗？`,
      confirmColor: '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({ url: `/api/bills/${bill.id}`, method: 'DELETE' });
            setBills(prev => prev.filter((b: Bill) => b.id !== bill.id));
            Taro.eventCenter.trigger('yoop_bill_updated');
          } catch (e) {
            Taro.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      },
    });
  };

  const theme = project ? getCardStyle(project.id) : CARD_COLORS[0];
  const cc = theme;

  /* 按日期分组 */
  const groupedBills = useMemo(() => {
    const map: Record<string, Bill[]> = {};
    for (const bill of bills) {
      const date = bill.bill_date || '未分类';
      if (!map[date]) map[date] = [];
      map[date].push(bill);
    }
    return Object.entries(map).sort(([a], [b]) => (a > b ? -1 : 1));
  }, [bills]);

  return (
    <View className="flex flex-col h-full" style={{ backgroundColor: '#F7F9FC' }}>
      {/* ====== 自定义导航栏 ====== */}
      <View style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        paddingTop: statusBarH, height: headerH,
        backgroundColor: '#FFFFFF',
        display: 'flex', alignItems: 'center',
        paddingLeft: 16, paddingRight: 12,
      }}
      >
        <View onClick={goBack} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ArrowLeft size={18} color="#8896A6" />
        </View>
        <Text className="block flex-1 text-center pr-10" style={{ fontSize: 17, fontWeight: '600', fontFamily: '-apple-system, "SF Pro Display", sans-serif', letterSpacing: 2, color: '#1E293B' }}>项目详情</Text>
      </View>

      {/* ====== 固定封面卡片 ====== */}
      <View style={{
        position: 'fixed', top: headerH + cardGap, left: 12, right: 12, zIndex: 90,
        borderRadius: 18, overflow: 'hidden', height: cardH,
        backgroundColor: cc.bg,
        boxShadow: '0 4px 20px rgba(91,155,213,0.06)',
        display: 'flex', flexDirection: 'row', padding: 14, gap: 12,
      }}
      >
        {/* 左侧封面 */}
        <View onClick={() => Taro.chooseImage({
          count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
          success: async (res) => {
            const tempPath = res.tempFilePaths[0];
            try {
              console.log('上传封面图片...', tempPath);
              const uploadRes = await Network.uploadFile({ url: '/api/upload', filePath: tempPath, name: 'file' });
              // 解析响应：可能是字符串或对象
              let coverUrl = '';
              const respData = uploadRes.data as any;
              if (typeof respData === 'string') {
                try { const parsed = JSON.parse(respData); coverUrl = parsed?.data?.url || parsed?.url || ''; } catch (_) { /* ignore */ }
              } else {
                coverUrl = respData?.data?.url || respData?.url || '';
              }
              console.log('上传成功，URL:', coverUrl);
              if (!coverUrl) { Taro.showToast({ title: '上传返回异常', icon: 'none' }); return; }
              await Network.request({ url: `/api/projects/${project.id}`, method: 'PUT', data: { cover_url: coverUrl } });
              setProject((prev: any) => ({ ...prev, cover_url: coverUrl }));
              Taro.showToast({ title: '封面已更换', icon: 'success' });
            } catch (err) { console.error('上传失败:', err); Taro.showToast({ title: '上传失败', icon: 'none' }); }
          },
        })}
          style={{ width: 84, height: 84, borderRadius: 14, flexShrink: 0, overflow: 'hidden', position: 'relative' }}
        >
          {project?.cover_url ? (
            <Image src={project.cover_url} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
          ) : (
            <View style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${cc.accent}, ${cc.bg})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ opacity: 0.35 }}><Camera size={28} color={cc.amount} /></View>
            </View>
          )}
        </View>

        {/* 右侧信息 */}
        <View style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {!editingName ? (
              <>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', fontFamily: '-apple-system, "SF Pro Display", sans-serif', letterSpacing: 1, color: cc.name }} onClick={handleEditName}>
                  {project?.name}
                </Text>
                <Pencil size={11} color="#94A3B8" onClick={handleEditName} />
              </>
            ) : (
              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                <Input
                  focus value={editNameValue}
                  onInput={(e) => setEditNameValue(e.detail.value)}
                  onConfirm={handleSaveName}
                  onBlur={handleSaveName}
                  style={{ fontSize: 15, fontWeight: '700', color: cc.name, width: 120, height: 24, borderBottomWidth: 1, borderBottomColor: cc.amount }}
                />
                <Text onClick={handleSaveName} style={{ fontSize: 13, color: cc.amount, flexShrink: 0 }}>✓</Text>
              </View>
            )}
          </View>

          {/* 日期范围 */}
          <View style={{ marginTop: 2 }}>
            {!editingDate ? (
              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, color: '#8896A6' }}>
                  {(project?.start_date || '--').replace(/-/g, '/')} ~ {(project?.end_date || '--').replace(/-/g, '/')}
                </Text>
                <Pencil size={10} color="#B8C4CE" onClick={handleEditDate} />
              </View>
            ) : (
              <View style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Picker mode="date" value={project?.start_date} onChange={onStartDateChange}>
                  <Text style={{ fontSize: 11, color: cc.amount, textDecorationLine: 'underline' }}>{(project?.start_date || '选择起').replace(/-/g, '/')}</Text>
                </Picker>
                <Text style={{ fontSize: 11, color: '#8896A6' }}>~</Text>
                <Picker mode="date" value={project?.end_date} onChange={onEndDateChange}>
                  <Text style={{ fontSize: 11, color: cc.amount, textDecorationLine: 'underline' }}>{(project?.end_date || '选择止').replace(/-/g, '/')}</Text>
                </Picker>
              </View>
            )}
          </View>

          {/* 总金额 & 人均 */}
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <View>
              <Text style={{ fontSize: 11, color: '#94A3B8' }}>总金额</Text>
              <Text className="block" style={{ fontSize: 22, fontWeight: '700', color: cc.amount, lineHeight: '120%' }}>¥{(Number(project?.total_amount) || 0).toFixed(0)}</Text>
            </View>
            <View style={{ marginLeft: 'auto', backgroundColor: `${cc.bg}`, borderRadius: 12, paddingLeft: 10, paddingRight: 10, paddingTop: 4, paddingBottom: 4 }}>
              <Text style={{ fontSize: 11, color: cc.name }}>人均 ¥{groupedBills.length > 0 ? Math.round(((Number(project?.total_amount) || 0) / Math.max(...groupedBills.map(([, bs]) => new Set(bs.map(b => b.payer)).size))) * 100) / 100 : '—'}</Text>
              <Text className="block text-[10px]" style={{ color: '#94A3B8', textAlign: 'right' }}>含请客 ¥{(bills.filter(b => b.is_treat).reduce((s, b) => s + Number(b.amount), 0)).toFixed(0)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ====== 固定添加花费按钮 ====== */}
      <View style={{
        position: 'fixed', top: headerH + cardGap + cardH + buttonGap, left: 12, right: 12, zIndex: 90,
        borderRadius: 26, overflow: 'hidden', height: buttonH,
        background: `linear-gradient(135deg, ${cc.amount}CC, ${cc.bg})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
        onClick={goAddBill}
      >
        <Plus size={18} color="#FFFFFF" />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF', letterSpacing: 1 }}>添加花费</Text>
      </View>

      {/* ====== 固定分账情况窗口（仅在有转账建议时显示，独立圆角窗口） ====== */}
      {hasSettlement && (
        <View style={{
          position: 'fixed', top: topFixedH, left: 12, right: 12, zIndex: 85,
          borderRadius: 16, overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8EDF2',
          boxShadow: '0 2px 12px rgba(91,155,213,0.04)',
          padding: 14,
          height: settleH,
        }}
        >
          <View style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>💰 分账情况</Text>
            <Text style={{ fontSize: 11, color: '#94A3B8', marginLeft: 8 }}>{balances.length}人参与</Text>
          </View>
          <ScrollView scrollX enhanced showScrollbar={false}>
            <View style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
              {transfers.map((t, i) => {
                const cIdx = i % CARD_COLORS.length;
                const sc = CARD_COLORS[cIdx];
                return (
                  <View key={`${t.from}-${t.to}`} style={{
                    display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: 4,
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
        </View>
      )}

      {/* ====== 固定账单明细标题（位置根据分账窗口动态调整） ====== */}
      <View style={{
        position: 'fixed', top: topFixedH + (hasSettlement ? settleH + 10 : 0), left: 16, right: 16, zIndex: 90,
        height: sectionH, display: 'flex', alignItems: 'center',
      }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B' }}>账单明细</Text>
      </View>

      {/* ====== 账单明细窗口（中间滚动区，top动态跟随分账窗口） ====== */}
      <View style={{
        position: 'fixed', top: topFixedH + sectionH + (hasSettlement ? settleH + 10 : 0), left: 12, right: 12,
        bottom: bottomH, zIndex: 80,
        borderRadius: 16, overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8EDF2',
        boxShadow: '0 4px 20px rgba(91,155,213,0.05)',
      }}
      >
        {groupedBills.length > 0 ? (
          <ScrollView scrollY enhanced showScrollbar={false} style={{ height: '100%' }}>
            <View style={{ padding: 12, gap: 8 }}>
              {groupedBills.map(([date, dayBills]) => (
                <View key={date}>
                  <Text className="block text-[11px] mb-2" style={{ color: '#8896A6', fontWeight: '500' }}>{date}</Text>
                  {dayBills.map((bill) => {
                    const catIcon = CATEGORY_ICONS[bill.category] || '\uD83D\uDCCC';
                    return (
                      <View key={bill.id}
                        onClick={() => goEditBill(bill.id)}
                        onLongPress={() => handleDeleteBill(bill)}
                        className="flex items-center rounded-xl p-3"
                        style={{
                          marginBottom: 6,
                          background: 'linear-gradient(to right, #FAFBFC, #FFFFFF)',
                          border: '1px solid #F0F4F8',
                          transition: 'transform 0.08s ease',
                        }}
                      >
                        {/* 分类图标 */}
                        <Text style={{ fontSize: 20, marginRight: 10, flexShrink: 0 }}>{catIcon}</Text>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '500', color: '#1E293B' }}>{bill.name}</Text>
                          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>{bill.payer}</Text>
                            {bill.is_treat && (
                              <Text style={{ fontSize: 10, color: '#F59E0B', backgroundColor: '#FEF3C7', paddingLeft: 4, paddingRight: 4, paddingTop: 1, paddingBottom: 1, borderRadius: 4 }}>🎁 请客</Text>
                            )}
                            {bill.category && (
                              <Text style={{ fontSize: 10, color: '#6B7280', backgroundColor: '#F3F4F6', paddingLeft: 4, paddingRight: 4, paddingTop: 1, paddingBottom: 1, borderRadius: 4 }}>{bill.category}</Text>
                            )}
                          </View>
                        </View>
                        <Text className="ml-2 font-semibold" style={{ fontSize: 14, color: '#1E293B', flexShrink: 0 }}>¥{Number(bill.amount).toFixed(0)}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Text className="block text-sm" style={{ color: '#94A3B8' }}>暂无账单，点击上方添加</Text>
          </View>
        )}
      </View>

      {/* ====== 固定底部删除按钮 ====== */}
      <View style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: '#F7F9FC',
        padding: '8px 16px 16px',
      }}
      >
        <View onClick={handleDeleteProject} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          paddingTop: 12, paddingBottom: 12, borderRadius: 14,
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
        }}
        >
          <Trash2 size={15} color="#EF4444" />
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#EF4444', letterSpacing: 1 }}>删除此项目</Text>
        </View>
      </View>
    </View>
  );
}

export default ProjectPage;

export const projectConfig = typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '项目详情', navigationStyle: 'custom' })
  : { navigationBarTitleText: '项目详情', navigationStyle: 'custom' }

