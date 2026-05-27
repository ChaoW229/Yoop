import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Picker } from '@tarojs/components';
import { Input } from '@/components/ui/input';
import { Network } from '@/network';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react-taro';

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

/* 持久化存储 key */
const STORAGE_KEYS = {
  customCategories: 'yoop_custom_categories',
  payers: 'yoop_payers',
  payerColors: 'yoop_payer_colors', // 支付人自定义颜色
};

/* 支付人颜色池 */
const PAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9',
];

/* 获取支付人的持久化颜色 */
function getPayerColor(name: string, savedColors: Record<string, string>): string {
  if (savedColors[name]) return savedColors[name];
  // 基于名称生成稳定颜色
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PAYER_COLORS[Math.abs(hash) % PAYER_COLORS.length];
}

/* 从本地存储读取数据 */
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = Taro.getStorageSync(key);
    return data || defaultValue;
  } catch (_) {
    return defaultValue;
  }
}

/* 保存到本地存储 */
function saveToStorage(key: string, data: any): void {
  try {
    Taro.setStorageSync(key, data);
  } catch (_) {}
}

export default function AddBillPage() {
  const [projectId, setProjectId] = useState('');
  const [projectColor, setProjectColor] = useState(CARD_COLORS[0]);
  const [billId, setBillId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('交通');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('自己');
  const [participants, setParticipants] = useState<string[]>(['小明', '小红', '自己']);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isTreat, setIsTreat] = useState(false);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [payerColors, setPayerColors] = useState<Record<string, string>>({});

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

  /* 初始化时从本地存储加载持久化数据 */
  useEffect(() => {
    const savedCategories = loadFromStorage<string[]>(STORAGE_KEYS.customCategories, []);
    const savedPayers = loadFromStorage<string[]>(STORAGE_KEYS.payers, []);
    const savedColors = loadFromStorage<Record<string, string>>(STORAGE_KEYS.payerColors, {});
    if (savedCategories.length > 0) setCustomCategories(savedCategories);
    if (savedPayers.length > 0) setParticipants(savedPayers);
    if (Object.keys(savedColors).length > 0) setPayerColors(savedColors);
  }, []);

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

  /* 加载编辑模式下的账单数据 */
  useEffect(() => {
    if (isEditMode && billId) {
      Network.request({ url: `/api/bills/${billId}` }).then((res: any) => {
        const bill = res.data?.data;
        if (bill) {
          setName(bill.name || '');
          setAmount(String(bill.amount || ''));
          setPayer(bill.payer || '自己');
          setIsTreat(bill.is_treat || false);
          setDate(bill.bill_date || todayStr);
          /* 判断类别是预设还是自定义 */
          if (bill.category && CATEGORIES.find(c => c.name === bill.category)) {
            setCategory(bill.category);
            setCustomCategory('');
          } else if (bill.category) {
            setCategory('其他');
            setCustomCategory(bill.category);
          }
        }
      }).catch(() => {});
    }
  }, [isEditMode, billId]);

  useLoad(() => {
    const pages = Taro.getCurrentPages();
    const current = pages[pages.length - 1];
    const pid = current.options?.project_id;
    const bid = current.options?.bill_id;
    if (pid) {
      setProjectId(pid);
      setProjectColor(CARD_COLORS[parseInt(pid, 10) % CARD_COLORS.length] || CARD_COLORS[0]);
    }
    if (bid) {
      setBillId(bid);
      setIsEditMode(true);
    }
  });

  const goBack = () => Taro.navigateBack();
  const pageTitle = isEditMode ? '编辑花费' : '添加花费';

  /* 添加支付人（带持久化） */
  const handleAddPayer = () => {
    (Taro as any).showModal({
      title: '添加支付人',
      editable: true,
      placeholderText: '姓名',
      success: (res: any) => {
        if (res.confirm && res.content) {
          const newPayer = res.content.trim();
          if (!participants.includes(newPayer)) {
            const updated = [...participants, newPayer];
            setParticipants(updated);
            saveToStorage(STORAGE_KEYS.payers, updated);
            // 自动分配颜色（如果还没有）
            if (!payerColors[newPayer]) {
              const newColor = getPayerColor(newPayer, {});
              const newColors = { ...payerColors, [newPayer]: newColor };
              setPayerColors(newColors);
              saveToStorage(STORAGE_KEYS.payerColors, newColors);
            }
          }
          setPayer(newPayer);
        }
      },
    });
  };

  /* 长按删除支付人（所有支付人都可删除） */
  const handleLongPressDeletePayer = (p: string) => {
    Taro.showModal({
      title: '删除支付人',
      content: `确定要删除「${p}」吗？`,
      confirmColor: '#E86C6C',
      success: (res) => {
        if (res.confirm) {
          const updated = participants.filter(item => item !== p);
          setParticipants(updated);
          saveToStorage(STORAGE_KEYS.payers, updated);
          if (payer === p && updated.length > 0) setPayer(updated[0]);
          // 删除颜色记录
          if (payerColors[p]) {
            const newColors = { ...payerColors };
            delete newColors[p];
            setPayerColors(newColors);
            saveToStorage(STORAGE_KEYS.payerColors, newColors);
          }
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  };

  /* 添加自定义类别（带持久化） */
  const handleAddCustomCategory = (catName: string) => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    if (![...CATEGORIES.map(c => c.name), ...customCategories].includes(trimmed)) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      saveToStorage(STORAGE_KEYS.customCategories, updated);
    }
    setCustomCategory(trimmed);
    setShowCategoryDrawer(false);
  };

  /* 长按删除自定义类别 */
  const handleLongPressDeleteCategory = (cat: string) => {
    Taro.showModal({
      title: '删除自定义类别',
      content: `确定要删除「${cat}」吗？`,
      confirmColor: '#E86C6C',
      success: (res) => {
        if (res.confirm) {
          const updated = customCategories.filter(c => c !== cat);
          setCustomCategories(updated);
          saveToStorage(STORAGE_KEYS.customCategories, updated);
          if (customCategory === cat) setCustomCategory('');
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  };

  /* 检查表单是否填写完整 */
  const isFormValid = !!name.trim() && !!amount.trim() && Number(amount) > 0;

  const handleSave = async () => {
    if (!isFormValid) {
      Taro.showToast({ title: '请填写名称和金额', icon: 'none' });
      return;
    }
    try {
      const payload = {
        projectId,
        name,
        category: customCategory || category,
        amount: Number(amount),
        payer,
        billDate: date,
        isTreat,
      };

      if (isEditMode && billId) {
        /* 编辑模式：PUT 更新 */
        await Network.request({
          url: `/api/bills/${billId}`,
          method: 'PUT',
          data: payload,
        });
        Taro.showToast({ title: '更新成功', icon: 'success' });
      } else {
        /* 新建模式：POST 创建 */
        await Network.request({
          url: '/api/bills',
          method: 'POST',
          data: payload,
        });
        Taro.showToast({ title: '保存成功', icon: 'success' });
      }
      /* 通知项目详情页和首页刷新 */
      Taro.eventCenter.trigger('yoop_bill_updated');
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: isEditMode ? '更新失败' : '保存失败', icon: 'none' });
    }
  };

  const onDateChange = (e: any) => setDate(e.detail.value);

  /* ===== 编辑模式：删除账单 ===== */
  const handleDeleteBill = () => {
    if (!billId) return;
    Taro.showModal({
      title: '删除账单',
      content: `确定要删除「${name}」吗？`,
      confirmColor: '#E86C6C',
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({ url: `/api/bills/${billId}`, method: 'DELETE' });
            Taro.eventCenter.trigger('yoop_bill_updated');
            Taro.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => Taro.navigateBack(), 800);
          } catch (e) {
            console.error(e);
            Taro.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      },
    });
  };

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
            <Text className="block" style={{ fontSize: 17, fontWeight: '600', fontFamily: '-apple-system, "SF Pro Display", "PingFang SC", sans-serif', color: '#1E293B', letterSpacing: 1 }}>{pageTitle}</Text>
          </View>
        </View>
      </View>

      <View className="flex-1 px-5 pt-4 pb-4 flex flex-col gap-3" style={{ paddingTop: capsuleBottom + 6 }}>
        {/* 花费名称 */}
        <View>
          <Text className="block text-xs mb-2" style={{ color: theme.accent }}>花费名称</Text>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Input
            className="w-full text-sm"
            placeholder="例如：古城门票"
            style={{ color: theme.name, borderBottom: `1px solid ${theme.bg}`, paddingBottom: 8 }}
            value={name}
            onInput={e => setName(e.detail.value)}
          />
        </View>

        {/* 金额 */}
        <View>
          <Text className="block text-xs mb-2" style={{ color: theme.accent }}>金额</Text>
          <View style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${theme.bg}`, paddingBottom: 8 }}>
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
            className="flex items-center justify-between"
            style={{ paddingBottom: 8, borderBottom: `1px solid ${theme.bg}` }}
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
              className="flex items-center justify-between"
              style={{ paddingBottom: 8, borderBottom: `1px solid ${theme.bg}` }}
            >
              <Text className="block text-sm" style={{ color: theme.name }}>{date}</Text>
              <Text className="block text-xs" style={{ color: theme.accent }}>选择 ›</Text>
            </View>
          </Picker>
        </View>

        {/* 支付人 - 支持长按删除 */}
        <View>
          <Text className="block text-xs mb-2" style={{ color: theme.accent }}>支付人 <Text style={{ color: '#C0C8D4', fontSize: 10 }}>(长按删除)</Text></Text>
          <View className="flex items-center gap-2 flex-wrap">
            {participants.map(p => {
              const pColor = getPayerColor(p, payerColors);
              const isSelected = payer === p;
              return (
                <View
                  key={p}
                  onClick={() => setPayer(p)}
                  onLongPress={() => handleLongPressDeletePayer(p)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingLeft: 10, paddingRight: 10, paddingTop: 5, paddingBottom: 5, borderRadius: 20,
                    backgroundColor: isSelected ? `${pColor}18` : '#F1F5F9',
                    border: isSelected ? `1px solid ${pColor}55` : `1px solid #E8EDF2`,
                    boxShadow: isSelected ? `0 3px 10px ${pColor}22` : 'none',
                  }}
                >
                  {/* 彩色头像圆点 */}
                  <View style={{
                    width: 20, height: 20, borderRadius: 10,
                    backgroundColor: pColor,
                    justifyContent: 'center', alignItems: 'center',
                  }}
                  >
                    <Text style={{ fontSize: 9, color: '#fff', fontWeight: '600' }}>{p.charAt(0)}</Text>
                  </View>
                  <Text className="block text-xs" style={{ color: isSelected ? pColor : '#64748B' }}>{p}</Text>
                </View>
              );
            })}
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
          className="flex items-center justify-between py-3"
          style={{ borderBottom: `1px solid ${theme.bg}` }}
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

      {/* 编辑模式：删除按钮 */}
      {isEditMode && (
        <View className="px-5 py-2 bg-white">
          <View
            onClick={handleDeleteBill}
            className="w-full rounded-2xl py-3 flex items-center justify-center gap-2"
            style={{ border: '1px solid #FDE8E8', backgroundColor: '#FFF5F5' }}
          >
            <Trash2 size={16} color="#E86C6C" />
            <Text className="block text-sm font-semibold" style={{ color: '#E86C6C' }}>删除此花费</Text>
          </View>
        </View>
      )}

      {/* 保存按钮 - 根据表单状态变化样式 */}
      <View className="px-5 py-3 bg-white">
        <View
          onClick={handleSave}
          className="w-full py-4 rounded-2xl flex items-center justify-center"
          style={{
            background: isFormValid
              ? `linear-gradient(135deg, ${theme.amount}, ${theme.bg})`
              : `linear-gradient(135deg, ${theme.bg}, ${theme.bg})`,
            opacity: isFormValid ? 1 : 0.55,
            boxShadow: isFormValid ? `0 8px 30px ${theme.name}30` : 'none',
          }}
        >
          <Text className="block text-base font-semibold" style={{ color: isFormValid ? '#FFF' : theme.amount }}>保存</Text>
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

            {/* 预设类别 */}
            <View className="grid grid-cols-3 gap-3 mb-3">
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

            {/* 自定义类别列表 - 支持长按删除 */}
            {customCategories.length > 0 && (
              <>
                <Text className="block text-xs mb-2" style={{ color: theme.accent }}>自定义类别 <Text style={{ color: '#C0C8D4', fontSize: 10 }}>(长按删除)</Text></Text>
                <View className="flex flex-wrap gap-2 mb-3">
                  {customCategories.map(cat => {
                    const isActive = customCategory === cat;
                    return (
                      <View
                        key={cat}
                        onClick={() => { setCustomCategory(cat); setCategory(''); setShowCategoryDrawer(false); }}
                        onLongPress={() => handleLongPressDeleteCategory(cat)}
                        className="px-3 py-2 rounded-xl flex items-center gap-1"
                        style={{
                          backgroundColor: isActive ? theme.name : `${theme.bg}44`,
                          border: isActive ? `1px solid ${theme.name}` : `1px solid ${theme.bg}`,
                        }}
                      >
                        <Text className="block text-xs" style={{ color: isActive ? '#FFFFFF' : theme.name }}>{cat}</Text>
                        {isActive && <Text className="block text-xs" style={{ color: '#FFFFFF', opacity: 0.7 }}>✓</Text>}
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* 添加新自定义类别 */}
            <View className="flex items-center gap-2">
              <Text className="block text-xs" style={{ color: theme.accent }}>新增自定义：</Text>
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
                        handleAddCustomCategory(res.content);
                      }
                    },
                  });
                }}
              >
                <Text className="block text-sm" style={{ color: theme.accent }}>
                  + 点击输入新类别
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
