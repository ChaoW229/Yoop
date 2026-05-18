import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Picker } from '@tarojs/components';
import { Input } from '@/components/ui/input';
import { Network } from '@/network';
import { ArrowLeft, Car, Utensils, Bed, Gift, Ticket, MoveHorizontal, Plus, X, Calendar } from 'lucide-react-taro';

const CATEGORIES = [
  { name: '交通', icon: Car },
  { name: '餐饮', icon: Utensils },
  { name: '住宿', icon: Bed },
  { name: '纪念品', icon: Gift },
  { name: '门票', icon: Ticket },
  { name: '其他', icon: MoveHorizontal },
];

export default function AddBillPage() {
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('交通');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('自己');
  const [participants, setParticipants] = useState<string[]>(['小明', '小红', '自己']);
  const [isTreat, setIsTreat] = useState(false);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [date, setDate] = useState(todayStr);

  useEffect(() => {
    const info = Taro.getSystemInfoSync();
    setStatusBarHeight(info.statusBarHeight || 0);
  }, []);

  useLoad(() => {
    const pages = Taro.getCurrentPages();
    const current = pages[pages.length - 1];
    const pid = current.options?.project_id;
    if (pid) setProjectId(pid);
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
          participants,
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

  return (
    <View className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <View style={{ paddingTop: statusBarHeight }} className="flex items-center px-4 py-2 bg-white">
        <View onClick={goBack} className="w-8 h-8 flex items-center justify-center">
          <ArrowLeft size={18} color="#9B9690" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold text-on-surface pr-8">添加花费</Text>
      </View>

      <View className="flex-1 px-4 pt-4 pb-4 flex flex-col gap-3">
        {/* 花费名称 */}
        <View>
          <Text className="block text-xs text-on-surface-variant mb-2">花费名称</Text>
          <Input
            className="bg-card rounded-2xl text-sm text-on-surface shadow-card"
            placeholder="例如：古城门票"
            value={name}
            onInput={e => setName(e.detail.value)}
          />
        </View>

        {/* 金额 - 与名称输入框同样样式 */}
        <View>
          <Text className="block text-xs text-on-surface-variant mb-2">金额</Text>
          <View className="bg-card rounded-2xl px-4 flex items-center shadow-card" style={{ height: '40px' }}>
            <Text className="block text-sm text-on-surface-variant mr-2">¥</Text>
            <Input
              className="flex-1 text-sm text-on-surface"
              placeholder="0.00"
              type="digit"
              value={amount}
              onInput={e => setAmount(e.detail.value)}
            />
          </View>
        </View>

        {/* 类别 */}
        <View>
          <Text className="block text-xs text-on-surface-variant mb-2">类别</Text>
          <View
            onClick={() => setShowCategoryDrawer(true)}
            className="bg-card rounded-2xl px-4 py-3 flex items-center justify-between shadow-card"
          >
            <Text className="block text-sm text-on-surface">{customCategory || category}</Text>
            <Text className="block text-xs text-on-surface-variant">选择 ▾</Text>
          </View>
        </View>

        {/* 日期 */}
        <View>
          <Text className="block text-xs text-on-surface-variant mb-2">时间</Text>
          <Picker mode="date" value={date} onChange={onDateChange}>
            <View className="bg-card rounded-2xl px-4 py-3 flex items-center gap-2 shadow-card">
              <Calendar size={14} color="#9AA5B1" />
              <Text className="block text-sm text-on-surface">{date}</Text>
            </View>
          </Picker>
        </View>

        {/* 支付人 */}
        <View>
          <Text className="block text-xs text-on-surface-variant mb-2">支付人</Text>
          <View className="flex items-center gap-2 flex-wrap">
            {participants.map(p => (
              <View
                key={p}
                onClick={() => setPayer(p)}
                className={`px-4 py-2 rounded-full shadow-card ${payer === p ? 'bg-primary' : 'bg-card'}`}
              >
                <Text className={`block text-xs ${payer === p ? 'text-primary-foreground' : 'text-on-surface'}`}>{p}</Text>
              </View>
            ))}
            <View onClick={handleAddPayer} className="w-8 h-8 rounded-full bg-card shadow-card flex items-center justify-center">
              <Plus size={14} color="#9AA5B1" />
            </View>
          </View>
        </View>

        {/* 请客开关 */}
        <View className="flex items-center justify-between bg-card rounded-2xl px-4 py-3 shadow-card">
          <Text className="block text-sm text-on-surface">请客</Text>
          <View
            onClick={() => setIsTreat(!isTreat)}
            className="w-11 h-6 rounded-full relative"
            style={{ backgroundColor: isTreat ? '#9AA5B1' : '#DDD8D2' }}
          >
            <View
              className="absolute w-5 h-5 bg-white rounded-full shadow"
              style={{ top: '2px', left: isTreat ? '22px' : '2px', transition: 'left 0.2s' }}
            />
          </View>
        </View>
      </View>

      {/* 保存按钮 */}
      <View className="px-4 py-3 bg-white">
        <View onClick={handleSave} className="w-full py-3 rounded-2xl bg-primary flex items-center justify-center shadow-float">
          <Text className="block text-base font-semibold text-primary-foreground">保存</Text>
        </View>
      </View>

      {/* 类别选择抽屉 - 白色半透明遮罩 */}
      {showCategoryDrawer && (
        <View className="fixed inset-0" style={{ zIndex: 100 }}>
          <View
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
            onClick={() => setShowCategoryDrawer(false)}
          />
          <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5" style={{ zIndex: 101 }}>
            <View className="flex items-center justify-between mb-4">
              <Text className="block text-base font-semibold text-on-surface">选择类别</Text>
              <View onClick={() => setShowCategoryDrawer(false)}>
                <X size={20} color="#9B9690" />
              </View>
            </View>
            <View className="grid grid-cols-3 gap-2 mb-4">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isActive = category === cat.name && !customCategory;
                return (
                  <View
                    key={cat.name}
                    onClick={() => { setCategory(cat.name); setCustomCategory(''); setShowCategoryDrawer(false); }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl shadow-card ${isActive ? 'bg-primary' : 'bg-card'}`}
                  >
                    <Icon size={18} color={isActive ? '#FFFFFF' : '#9B9690'} />
                    <Text className={`block text-xs ${isActive ? 'text-primary-foreground' : 'text-on-surface'}`}>{cat.name}</Text>
                  </View>
                );
              })}
            </View>
            <View className="flex items-center gap-2">
              <Text className="block text-xs text-on-surface-variant">自定义：</Text>
              <View
                className="flex-1 bg-card rounded-xl px-3 py-2 shadow-card"
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
                <Text className="block text-sm text-on-surface">{customCategory || '点击输入'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
