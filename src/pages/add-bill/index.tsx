import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Picker } from '@tarojs/components';
import { Input } from '@/components/ui/input';
import { Network } from '@/network';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ArrowLeft, Plus, X } from 'lucide-react-taro';

const CATEGORIES = [
  { name: '交通', emoji: '🚗' },
  { name: '餐饮', emoji: '🍽️' },
  { name: '住宿', emoji: '🏨' },
  { name: '纪念品', emoji: '🎁' },
  { name: '门票', emoji: '🎫' },
  { name: '其他', emoji: '📌' },
];

/* 卡片配色 - 与首页一致 */
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

export default function AddBillPage() {
  const [projectId, setProjectId] = useState('');
  const [projectColor, setProjectColor] = useState(CARD_COLORS[0]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('交通');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('自己');
  const [participants, setParticipants] = useState<string[]>(['小明', '小红', '自己']);
  const [isTreat, setIsTreat] = useState(false);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [date, setDate] = useState(todayStr);

  /* 胶囊按钮对齐 */
  const sysInfo = Taro.getSystemInfoSync();
  const statusBarH = sysInfo.statusBarHeight || 20;
  let capsuleBottom = statusBarH + 44;
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === Taro.ENV_TYPE.TT;
  if (isWeapp) {
    try {
      const mb = Taro.getMenuButtonBoundingClientRect();
      if (mb && mb.bottom) capsuleBottom = mb.bottom + 4;
    } catch (_) {}
  }

  useEffect(() => {
    if (projectId) {
      try {
        Network.request({ url: `/api/projects/${projectId}` }).then((res: any) => {
          if (res.data?.data?.id) {
            setProjectColor(getCardStyle(res.data.data.id));
          }
        }).catch(() => {});
      } catch (_) {}
    }
  }, [projectId]);

  useLoad(() => {
    const pages = Taro.getCurrentPages();
    const current = pages[pages.length - 1];
    const pid = current.options?.project_id;
    if (pid) {
      setProjectId(pid);
      // eslint-disable-next-line no-restricted-syntax
      setProjectColor(CARD_COLORS[parseInt(pid, 10) % CARD_COLORS.length] || CARD_COLORS[0]);
    }
  });

  const goBack = () => Taro.navigateBack();

  const handleAddPayer = () => {
    (Taro as any).showModal({
      title: '添加支付人',
      editable: true,
      placeholderText: '姓名',
      success: (res: any) => {
        if (res.confirm && res.content) {
          setPayer(res.content);
          if (!participants.includes(res.content)) {
            setParticipants(prev => [...prev, res.content]);
          }
        }
      },
    });
  };

  const handleSave = async () => {
    if (!name || !amount) {
      Taro.showToast({ title: '请填写名称和金额', icon: 'none' });
      return;
    }
    try {
      await Network.request({
        url: '/api/bills',
        method: 'POST',
        data: {
          projectId,
          name,
          category: customCategory || category,
          amount: Number(amount),
          payer,
          billDate: date,
          isTreat,
        },
      });
      Taro.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: '保存失败', icon: 'none' });
    }
  };

  const onDateChange = (e: any) => setDate(e.detail.value);

  const selectedCat = customCategory || category;
  const selectedEmoji = customCategory ? '📌' : CATEGORIES.find(c => c.name === category)?.emoji || '📌';
  const theme = projectColor;

  return (
    <View className="flex flex-col min-h-full bg-white">
      {/* Header - 与胶囊按钮同行，固定不动 */}
      <View style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: '#FFFFFF' }}>
        <View
          style={{
            paddingTop: statusBarH,
            height: capsuleBottom,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <View onClick={goBack} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={16} color="#8896A6" />
          </View>
          <View style={{ flex: 1, display: 'flex', justifyContent: 'center' }} className="pr-8">
            <Text className="block" style={{ fontSize: 17, fontWeight: '600', fontFamily: '-apple-system, "SF Pro Display", "PingFang SC", sans-serif', color: '#1E293B', letterSpacing: 1 }}>添加花费</Text>
          </View>
        </View>
      </View>

      <View className="flex-1 px-5 pt-4 pb-4 flex flex-col gap-4" style={{ paddingTop: capsuleBottom + 10 }}>
        {/* 花费名称 */}
        <View>
          <Text className="block text-xs mb-2" style={{ color: theme.accent }}>花费名称</Text>
          <View
            className="rounded-2xl px-4 py-3"
            style={{ backgroundColor: `${theme.bg}33`, border: `1px solid ${theme.bg}` }}
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Input
              className="w-full text-sm"
              placeholder="例如：古城门票"
              style={{ color: theme.name }}
              value={name}
              onInput={e => setName(e.detail.value)}
              /* eslint-disable-next-line react/jsx-no-duplicate-props */
            />
          </View>
        </View>

        {/* 金额 */}
        <View>
          <Text className="block text-xs mb-2" style={{ color: theme.accent }}>金额</Text>
          <View
            className="rounded-2xl px-4 py-3 flex items-center"
            style={{ backgroundColor: `${theme.bg}33`, border: `1px solid ${theme.bg}` }}
          >
            <Text className="block text-sm mr-2" style={{ color: theme.amount }}>¥</Text>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Input
              className="flex-1 text-sm"
              placeholder="0.00"
              type="digit"
              style={{ color: theme.name }}
              value={amount}
              onInput={e => setAmount(e.detail.value)}
            />
          </View>
        </View>

        {/* 类别 */}
        <View>
          <Text className="block text-xs mb-2" style={{ color: theme.accent }}>类别</Text>
          <View
            onClick={() => setShowCategoryDrawer(true)}
            className="rounded-2xl px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: `${theme.bg}33`, border: `1px solid ${theme.bg}` }}
          >
            <View className="flex items-center gap-2">
              <Text className="block text-sm">{selectedEmoji}</Text>
              <Text className="block text-sm" style={{ color: theme.name }}>{selectedCat}</Text>
            </View>
            <Text className="block text-xs" style={{ color: theme.accent }}>选择 ›</Text>
          </View>
        </View>

        {/* 日期 */}
        <View>
          <Text className="block text-xs mb-2" style={{ color: theme.accent }}>时间</Text>
          <Picker mode="date" value={date} onChange={onDateChange}>
            <View
              className="rounded-2xl px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: `${theme.bg}33`, border: `1px solid ${theme.bg}` }}
            >
              <Text className="block text-sm" style={{ color: theme.name }}>{date}</Text>
              <Text className="block text-xs" style={{ color: theme.accent }}>选择 ›</Text>
            </View>
          </Picker>
        </View>

        {/* 支付人 */}
        <View>
          <Text className="block text-xs mb-2" style={{ color: theme.accent }}>支付人</Text>
          <View className="flex items-center gap-2 flex-wrap">
            {participants.map(p => (
              <View
                key={p}
                onClick={() => setPayer(p)}
                className="px-4 py-2 rounded-full"
                style={{
                  backgroundColor: payer === p ? theme.bg : `${theme.bg}22`,
                  border: payer === p ? `1px solid ${theme.name}44` : `1px solid ${theme.bg}`,
                  boxShadow: payer === p ? `0 4px 12px ${theme.name}25` : 'none',
                }}
              >
                <Text className="block text-xs" style={{ color: payer === p ? theme.name : '#8896A6' }}>{p}</Text>
              </View>
            ))}
            <View
              onClick={handleAddPayer}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${theme.bg}22`, border: `1px solid ${theme.bg}` }}
            >
              <Plus size={14} color={theme.name} />
            </View>
          </View>
        </View>

        {/* 请客开关 */}
        <View
          className="flex items-center justify-between rounded-2xl px-4 py-3"
          style={{ backgroundColor: `${theme.bg}22`, border: `1px solid ${theme.bg}` }}
        >
          <Text className="block text-sm" style={{ color: theme.name }}>请客</Text>
          <View
            onClick={() => setIsTreat(!isTreat)}
            className="relative"
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              backgroundColor: isTreat ? theme.name : '#E2E8F0',
              boxShadow: isTreat ? `0 2px 8px ${theme.name}40` : 'none',
              transition: 'all 0.3s',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: 2,
                left: isTreat ? 22 : 2,
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                transition: 'left 0.3s',
              }}
            />
          </View>
        </View>
      </View>

      {/* 保存按钮 */}
      <View className="px-5 py-3 bg-white">
        <View
          onClick={handleSave}
          className="w-full py-4 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${theme.accent}88, ${theme.bg})`,
            boxShadow: `0 8px 30px ${theme.name}40`,
          }}
        >
          <Text className="block text-base font-semibold text-white">保存</Text>
        </View>
      </View>

      {/* 类别选择抽屉 - 白色遮罩 */}
      {showCategoryDrawer && (
        <View className="fixed inset-0" style={{ zIndex: 100 }}>
          <View
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}
            onClick={() => setShowCategoryDrawer(false)}
          />
          <View
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5"
            style={{ boxShadow: `0 -4px 30px ${theme.name}15` }}
          >
            <View className="flex items-center justify-between mb-4">
              <Text className="block text-base font-semibold" style={{ color: theme.name }}>选择类别</Text>
              <View onClick={() => setShowCategoryDrawer(false)}>
                <X size={20} color="#8896A6" />
              </View>
            </View>
            <View className="grid grid-cols-3 gap-3 mb-4">
              {CATEGORIES.map(cat => {
                const isActive = category === cat.name && !customCategory;
                return (
                  <View
                    key={cat.name}
                    onClick={() => { setCategory(cat.name); setCustomCategory(''); setShowCategoryDrawer(false); }}
                    className="flex flex-col items-center gap-2 py-3 rounded-2xl"
                    style={{
                      backgroundColor: isActive ? theme.name : `${theme.bg}33`,
                      border: isActive ? `1px solid ${theme.name}` : `1px solid ${theme.bg}`,
                      boxShadow: isActive ? `0 4px 12px ${theme.name}30` : 'none',
                    }}
                  >
                    <Text className="block text-lg">{cat.emoji}</Text>
                    <Text className="block text-xs" style={{ color: isActive ? '#FFFFFF' : theme.name }}>{cat.name}</Text>
                  </View>
                );
              })}
            </View>
            <View className="flex items-center gap-2">
              <Text className="block text-xs" style={{ color: theme.accent }}>自定义：</Text>
              <View
                className="flex-1 rounded-xl px-3 py-2"
                style={{ backgroundColor: `${theme.bg}33`, border: `1px solid ${theme.bg}` }}
                onClick={() => {
                  (Taro as any).showModal({
                    title: '自定义类别',
                    editable: true,
                    placeholderText: '输入类别名',
                    success: (res: any) => {
                      if (res.confirm && res.content) {
                        setCustomCategory(res.content);
                        setShowCategoryDrawer(false);
                      }
                    },
                  });
                }}
              >
                <Text className="block text-sm" style={{ color: customCategory ? theme.name : theme.accent }}>
                  {customCategory || '点击输入'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
