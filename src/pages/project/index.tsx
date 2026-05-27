import { useState, useEffect } from 'react';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
/* eslint-disable-next-line no-restricted-syntax */
import { View, Text, Image, ScrollView, Input, Picker } from '@tarojs/components';
import { Network } from '@/network';
import { Plus, Trash2, ChevronLeft, CalendarDays, Camera, Pencil, Check, ArrowRightLeft } from 'lucide-react-taro';

/* ─── 统一配色（8 套低饱和多彩） ─── */
const CARD_COLORS: Record<number, {
  bg: string; name: string; amount: string; accent: string;
}> = {
  0: { bg: '#F0E6D8', name: '#6B5E4A', amount: '#8B7355', accent: '#D4C4A0' },
  1: { bg: '#E4EDF5', name: '#4A6B8B', amount: '#5D7A99', accent: '#B0CCDF' },
  2: { bg: '#EBF0E4', name: '#5B6B4A', amount: '#75855F', accent: '#C4D4AF' },
  3: { bg: '#F5E8EC', name: '#8B4A5E', amount: '#A65D72', accent: '#DEB0BE' },
  4: { bg: '#F0EBE5', name: '#6B6050', amount: '#8A7865', accent: '#CCC4BA' },
  5: { bg: '#E8EEF5', name: '#4A5E7A', amount: '#5D7399', accent: '#B0C4DD' },
  6: { bg: '#F5F0E8', name: '#7A684A', amount: '#99825F', accent: '#DDD1B8' },
  7: { bg: '#EDEDF0', name: '#5A5A6A', amount: '#727285', accent: '#C5C5D0' },
};
const getCardStyle = (id?: string) => CARD_COLORS[(id ? parseInt(id.slice(0, 8), 16) : 0) % 8] || CARD_COLORS[0];

/* ─── 支付人颜色池 ─── */
const PAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9',
];
const getPayerColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PAYER_COLORS[Math.abs(hash) % PAYER_COLORS.length];
};

/* ─── A账结算算法 ─── */
interface SettlementItem {
  from: string;
  to: string;
  amount: number;
}

function calcSettlement(bills: any[]): SettlementItem[] {
  const balances: Record<string, number> = {};
  const allPeople = new Set<string>();
  for (const b of bills) {
    if (!b.is_treat && b.payer) {
      allPeople.add(b.payer);
      if (b.participants && Array.isArray(b.participants)) {
        b.participants.forEach((p: string) => allPeople.add(p));
      }
    }
  }
  allPeople.forEach(p => { balances[p] = 0; });

  for (const b of bills) {
    if (b.is_treat) continue;
    if (!b.payer || !b.amount) continue;

    const amt = Number(b.amount);
    const participants = (b.participants && Array.isArray(b.participants) && b.participants.length > 0)
      ? b.participants
      : Array.from(allPeople);
    const n = Math.max(participants.length, 1);
    const share = amt / n;

    if (!balances[b.payer]) balances[b.payer] = 0;
    balances[b.payer] += amt;

    participants.forEach((p: string) => {
      if (!balances[p]) balances[p] = 0;
      balances[p] -= share;
    });
  }

  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];
  Object.entries(balances).forEach(([name, bal]) => {
    if (Math.abs(bal) < 0.01) return;
    if (bal < 0) debtors.push({ name, amount: -bal });
    else creditors.push({ name, amount: bal });
  });

  const results: SettlementItem[] = [];
  let di = 0, ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const d = debtors[di], c = creditors[ci];
    const pay = Math.min(d.amount, c.amount);
    if (pay > 0.01) results.push({ from: d.name, to: c.name, amount: Math.round(pay * 100) / 100 });
    d.amount -= pay;
    c.amount -= pay;
    if (d.amount < 0.01) di++;
    if (c.amount < 0.01) ci++;
  }

  return results;
}

export default function ProjectDetail() {
  const router = useRouter();
  const projectId = router.params.id || '';

  /* ---- 尺寸常量 ---- */
  let statusBarH = 20, capsuleTop = statusBarH + 4, capsuleH = 32;
  try {
    const menuBtn = Taro.getMenuButtonBoundingClientRect();
    statusBarH = menuBtn.top;
    capsuleTop = menuBtn.top;
    capsuleH = menuBtn.height;
  } catch {}
  const capsuleBottom = capsuleTop + capsuleH;

  const cc = getCardStyle(projectId);

  /* ---- State ---- */
  const [project, setProject] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  /* ---- 数据加载 ---- */
  useDidShow(() => { fetchData(); });

  useEffect(() => {
    Taro.eventCenter.on('yoop_bill_updated', fetchData);
    return () => { Taro.eventCenter.off('yoop_bill_updated'); };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, billsRes] = await Promise.all([
        Network.request({ url: `/api/projects/${projectId}` }),
        Network.request({ url: `/api/bills?project_id=${projectId}` }),
      ]);
      console.log('[ProjectDetail] project:', projRes.data?.data);
      console.log('[ProjectDetail] bills:', billsRes.data?.data);
      setProject(projRes.data?.data);
      setBills(billsRes.data?.data || []);
    } catch(e) { console.error('fetch error:', e); }
    finally { setLoading(false); }
  };

  /* ---- 编辑项目名 ---- */
  const startEditName = () => { setTempName(project.name || ''); setEditingName(true); };
  const confirmName = async () => {
    if (!tempName.trim()) return;
    await Network.request({ url: `/api/projects/${projectId}`, method: 'PUT', data: { name: tempName.trim() } });
    setEditingName(false);
    fetchData();
    Taro.eventCenter.trigger('yoop_project_updated');
  };

  /* ---- 编辑日期 ---- */
  const onStartDateChange = (e: any) => {
    const v = e.detail.value;
    Network.request({ url: `/api/projects/${projectId}`, method: 'PUT', data: { start_date: v } }).then(fetchData);
  };
  const onEndDateChange = (e: any) => {
    const v = e.detail.value;
    Network.request({ url: `/api/projects/${projectId}`, method: 'PUT', data: { end_date: v } }).then(fetchData);
  };

  /* ---- 删除项目 ---- */
  const handleDeleteProject = () => {
    Taro.showModal({
      title: '删除项目',
      content: `确定要删除「${project?.name}」吗？所有账单将一起删除！`,
      confirmColor: '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({ url: `/api/projects/${projectId}`, method: 'DELETE' });
            Taro.eventCenter.trigger('yoop_project_updated');
            Taro.navigateBack();
            Taro.showToast({ title: '已删除', icon: 'success' });
          } catch(e) { Taro.showToast({ title: '删除失败', icon: 'none' }); }
        }
      },
    });
  };

  /* ---- 删除账单 ---- */
  const handleDeleteBill = (billId: string, name: string) => {
    Taro.showModal({
      title: '删除账单',
      content: `确定要删除「${name}」吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({ url: `/api/bills/${billId}`, method: 'DELETE' });
            setBills(prev => prev.filter(b => b.id !== billId));
            fetchData();
            Taro.showToast({ title: '已删除', icon: 'success' });
          } catch(e) { Taro.showToast({ title: '删除失败', icon: 'none' }); }
        }
      },
    });
  };

  /* ---- 导航到添加/编辑 ---- */
  const goAddBill = () => Taro.navigateTo({ url: `/pages/add-bill/index?project_id=${projectId}` });
  const goEditBill = (billId: string) => Taro.navigateTo({ url: `/pages/add-bill/index?project_id=${projectId}&bill_id=${billId}` });

  /* ---- A账数据 ---- */
  const settlements = calcSettlement(bills);

  /* ---- 分组 ---- */
  const grouped: Record<string, typeof bills> = {};
  (bills || []).forEach(b => {
    const d = b.bill_date || '未知日期';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(b);
  });

  /* ---- 渐变色 ---- */
  const gradCard = `linear-gradient(135deg, ${cc.amount}CC, ${cc.bg})`;
  const gradBtn = `linear-gradient(135deg, ${cc.amount}, ${cc.bg})`;

  return (
    <View className="flex flex-col h-full" style={{ backgroundColor: '#F7F9FC' }}>
      {/* ════════ Header（固定） ════════ */}
      <View style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: '#FFFFFF' }}>
        <View style={{
          paddingTop: capsuleBottom,
          paddingBottom: 10,
          paddingLeft: 16, paddingRight: 16,
          flexDirection: 'row', alignItems: 'center',
        }}
        >
          <View onClick={() => Taro.navigateBack()} style={{ marginRight: 8 }}>
            <ChevronLeft size={22} color="#374151" />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#1E293B' }}>项目详情</Text>
        </View>
      </View>

      {/* ════════ 内容滚动区 ════════ */}
      <ScrollView
        scrollY
        enhanced
        showScrollbar={false}
        style={{
          flex: 1,
          paddingTop: capsuleBottom + 44, // header高度
          paddingBottom: 70, // 底部按钮空间
        }}
      >
        {/* ── 封面卡片（随内容滚动） ── */}
        {!loading && project && (
          <View style={{
            marginLeft: 12, marginRight: 12, marginTop: 8,
            height: 108, borderRadius: 18, overflow: 'hidden',
            background: gradCard,
            boxShadow: '0 4px 20px rgba(91,155,213,0.08)',
          }}
          >
            <View style={{ flexDirection: 'row', height: '100%', alignItems: 'center' }}>
              {/* 左侧图片 */}
              <View style={{
                marginLeft: 14, width: 84, height: 84, borderRadius: 14, overflow: 'hidden',
                flexShrink: 0, backgroundColor: cc.accent,
                justifyContent: 'center', alignItems: 'center',
              }}
              >
                {project.cover_url ? (
                  <Image src={project.cover_url} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Camera size={28} color="#FFF" strokeWidth={1.8} />
                )}
              </View>
              {/* 右侧信息 */}
              <View style={{ flex: 1, paddingLeft: 12, paddingRight: 14, justifyContent: 'space-between', height: '80%' }}>
                {/* 项目名称 */}
                {editingName ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* eslint-disable-next-line no-restricted-syntax */}
                    <Input value={tempName}
                      onInput={(e) => setTempName(e.detail.value)}
                      onConfirm={confirmName}
                      onBlur={confirmName}
                      autoFocus
                      focus
                      style={{ width: 120, height: 28, fontSize: 15, borderBottomWidth: 1, borderBottomColor: cc.amount }}
                    />
                    <Check size={16} color={cc.amount} style={{ marginLeft: 6 }} onClick={confirmName} />
                  </View>
                ) : (
                  <View onClick={startEditName} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '600', color: cc.name }}>{project.name}</Text>
                    <Pencil size={13} color={cc.amount} strokeWidth={2} />
                  </View>
                )}

                {/* 金额行 */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 2 }}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, color: cc.name, opacity: 0.7 }}>总金额</Text>
                    <Text style={{ fontSize: 19, fontWeight: '700', color: cc.amount }}>¥{Number(project.total_amount || 0).toLocaleString()}</Text>
                  </View>
                  <View style={{ borderLeft: '1px solid #00000018', paddingLeft: 10 }}>
                    <Text style={{ fontSize: 10, color: cc.name, opacity: 0.6 }}>人均</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: cc.amount }}>
                      ¥{bills.length > 0 ? ((Number(project.total_amount||0)/new Set(bills.map(b=>b.payer)).size).toFixed(2)) : '0.00'}
                    </Text>
                  </View>
                </View>

                {/* 日期行 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', paddingTop: 2 }}>
                  <CalendarDays size={11} color={cc.name} style={{ opacity: 0.45 }} />
                  <Picker mode="date" value={project.start_date || ''} onChange={onStartDateChange}>
                    <Text style={{ fontSize: 11, color: cc.name, opacity: 0.65 }}>{(project.start_date||'开始').replace(/-/g,'/')}</Text>
                  </Picker>
                  <Text style={{ fontSize: 11, color: cc.name, opacity: 0.45 }}>~</Text>
                  <Picker mode="date" value={project.end_date || ''} onChange={onEndDateChange}>
                    <Text style={{ fontSize: 11, color: cc.name, opacity: 0.65 }}>{(project.end_date||'结束').replace(/-/g,'/')}</Text>
                  </Picker>
                  <Pencil size={10} color={cc.amount} style={{ opacity: 0.5 }} />
                </View>

                {(bills.filter(b=>b.is_treat).length > 0) && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 9, color: cc.name, opacity: 0.45 }}>含请客 {bills.filter(b=>b.is_treat).length} 笔</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── 添加花费按钮 ── */}
        <View style={{
          marginLeft: 12, marginRight: 12, marginTop: 10,
          height: 46, borderRadius: 14,
          background: gradBtn,
          boxShadow: '0 3px 10px rgba(91,155,213,0.06)',
          justifyContent: 'center', alignItems: 'center',
          flexDirection: 'row',
        }} onClick={goAddBill}
        >
          <Plus size={17} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '500', marginLeft: 6 }}>添加花费</Text>
        </View>

        {/* ── A账结算区域 ── */}
        {settlements.length > 0 && (
          <View style={{
            margin: 12, marginTop: 12, marginBottom: 4,
            padding: 12, borderRadius: 12,
            borderWidth: 1, borderColor: '#D1FAE5',
            backgroundColor: '#ECFDF5',
          }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#065F46', marginBottom: 8, display: 'block' }}>
              结算建议（请客不计入）
            </Text>
            {settlements.map((s, idx) => (
              <View key={idx} style={{
                flexDirection: 'row', alignItems: 'center',
                paddingTop: 6, paddingBottom: 6, paddingLeft: 4, paddingRight: 4,
                borderBottom: idx < settlements.length - 1 ? '1px dashed #A7F3D0' : undefined,
              }}
              >
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: getPayerColor(s.from),
                  justifyContent: 'center', alignItems: 'center',
                }}
                >
                  <Text style={{ fontSize: 10, color: '#fff', fontWeight: '600' }}>{s.from.charAt(0)}</Text>
                </View>
                <Text style={{ fontSize: 13, color: '#374151', flex: 1, marginLeft: 6 }}>{s.from}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#DC2626' }}>→ ¥{s.amount.toFixed(2)}</Text>
                <Text style={{ fontSize: 13, color: '#374151', marginLeft: 6 }}>→ {s.to}</Text>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: getPayerColor(s.to),
                  justifyContent: 'center', alignItems: 'center', marginLeft: 6,
                }}
                >
                  <Text style={{ fontSize: 10, color: '#fff', fontWeight: '600' }}>{s.to.charAt(0)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── 账单明细标题 ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingLeft: 16, paddingRight: 16, paddingTop: 14, paddingBottom: 6,
        }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155' }}>账单明细</Text>
          {settlements.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <ArrowRightLeft size={12} color="#059669" />
              <Text style={{ fontSize: 11, color: '#059669', fontWeight: '500' }}>A账 {settlements.length}笔待结</Text>
            </View>
          )}
        </View>

        {/* ── 账单列表 ── */}
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#94a3b8' }}>加载中...</Text>
          </View>
        ) : !project ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#94a3b8' }}>项目不存在</Text>
          </View>
        ) : Object.keys(grouped).length === 0 ? (
          <View style={{ padding: 50, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#94a3b8' }}>暂无账单，点击上方添加</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <View key={date}>
              <Text style={{
                fontSize: 11, color: '#94a3b8',
                paddingLeft: 16, paddingTop: 8, paddingBottom: 4, display: 'block',
              }}
              >{date.replace(/-/g, '-')}</Text>
              {items.map((bill) => {
                const catIconMap: Record<string, string> = {
                  '餐饮': '🍜', '交通': '🚗', '住宿': '🏨', '门票': '🎫',
                  '购物': '🛍️', '娱乐': '🎮', '医疗': '💊', '其他': '📋',
                };
                const icon = catIconMap[bill.category] || '📋';
                return (
                  <View key={bill.id}
                    onClick={() => goEditBill(bill.id)}
                    onLongPress={() => handleDeleteBill(bill.id, bill.name)}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      marginLeft: 12, marginRight: 12, marginBottom: 6,
                      padding: 12, borderRadius: 12,
                      backgroundColor: bill.is_treat ? '#FEF3C7' : '#FFFFFF',
                      boxShadow: bill.is_treat ? undefined : '0 1px 4px rgba(0,0,0,0.04)',
                      border: bill.is_treat ? '1px solid #FDE68A' : '1px solid #F1F5F9',
                    }}
                  >
                    {/* 类别图标 */}
                    <View style={{
                      width: 38, height: 38, borderRadius: 10, marginRight: 10,
                      backgroundColor: bill.is_treat ? '#FDE68A' : '#EFF6FF',
                      justifyContent: 'center', alignItems: 'center',
                    }}
                    >
                      <Text style={{ fontSize: 17 }}>{icon}</Text>
                    </View>
                    {/* 信息 */}
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 14, fontWeight: '500', color: '#1e293b', display: 'block',
                        marginBottom: 2,
                      }}
                      >
                        {bill.name}{bill.is_treat ? ' 🎁' : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{
                          width: 16, height: 16, borderRadius: 8,
                          backgroundColor: getPayerColor(bill.payer || ''),
                          justifyContent: 'center', alignItems: 'center',
                        }}
                        >
                          <Text style={{ fontSize: 8, color: '#fff' }}>{(bill.payer||'自').charAt(0)}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>{bill.payer || '未填'}</Text>
                      </View>
                    </View>
                    {/* 金额 */}
                    <Text style={{
                      fontSize: 15, fontWeight: '600', color: bill.is_treat ? '#D97706' : '#334155',
                    }}
                    >¥{Number(bill.amount).toFixed(0)}</Text>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* ════════ 底部删除按钮（固定） ════════ */}
      <View style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: '#F7F9FC',
        paddingBottom: 20, paddingTop: 8,
      }}
      >
        <View onClick={handleDeleteProject} style={{
          flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
          height: 42, borderRadius: 21,
          backgroundColor: '#FEE2E2',
          border: '1px solid #FECACA',
          marginLeft: 12, marginRight: 12,
        }}
        >
          <Trash2 size={15} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '500', marginLeft: 6 }}>
            删除此项目
          </Text>
        </View>
      </View>
    </View>
  );
}
