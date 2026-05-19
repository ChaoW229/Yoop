import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Picker } from '@tarojs/components';
import { Input } from '@/components/ui/input';
import { Network } from '@/network';
import { ArrowLeft, Plus, X } from 'lucide-react-taro';

const CATEGORIES = [
  { name: '交通', emoji: '🚗' },
  { name: '餐饮', emoji: '🍽' },
  { name: '住宿', emoji: '🏨' },
  { name: '纪念品', emoji: '🎁' },
  { name: '门票', emoji: '🎫' },
  { name: '其他', emoji: '📌' },
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

  return (
    <View className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <View style={{ paddingTop: statusBarHeight }} className="flex items-center px-4 py-2 bg-white">
        <View onClick={goBack} className="w-8 h-8 flex items-center justify-center">
          <ArrowLeft size={18} color="#8896A6" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold pr-8" style={{ color: '#2D3748' }}>添加花费</Text>
      </View>

      <View className="flex-1 px-5 pt-4 pb-4 flex flex-col gap-4">
        {/* 花费名称 */}
        <View>
          <Text className="block text-xs mb-2" style={{ color: '#8896A6' }}>花费名称</Text>
          <View
            className="rounded-2xl px-4 py-3"
            style={{ backgroundColor: '#F7F9FC', border: '1px solid #EDF2F7' }}
          >
            <Input
              className="w-full text-sm"
              placeholder="例如：古城门票"
              style={{ color: '#2D3748' }}
              value={name}
              onInput={e => setName(e.detail.value)}
            />
          </View>
        </View>

        {/* 金额 */}
        <View>
          <Text className="block text-xs mb-2" style={{ color: '#8896A6' }}>金额</Text>
          <View
            className="rounded-2xl px-4 py-3 flex items-center"
            style={{ backgroundColor: '#F7F9FC', border: '1px solid #EDF2F7' }}
          >
            <Text className="block text-sm mr-2" style={{ color: '#8896A6' }}>¥</Text>
            <Input
              className="flex-1 text-sm"
              placeholder="0.00"
              type="digit"
              style={{ color: '#2D3748' }}
              value={amount}
              onInput={e => setAmount(e.detail.value)}
            />
          </View>
        </View>

        {/* 类别 */}
        <View>
          <Text className="block text-xs mb-2" style={{ color: '#8896A6' }}>类别</Text>
          <View
            onClick={() => setShowCategoryDrawer(true)}
            className="rounded-2xl px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: '#F7F9FC', border: '1px solid #EDF2F7' }}
          >
            <View className="flex items-center gap-2">
              <Text className="block text-sm">{selectedEmoji}</Text>
              <Text className="block text-sm" style={{ color: '#2D3748' }}>{selectedCat}</Text>
            </View>
            <Text className="block text-xs" style={{ color: '#8896A6' }}>选择 ›</Text>
          </View>
        </View>

        {/* 日期 */}
        <View>
          <Text className="block text-xs mb-2" style={{ color: '#8896A6' }}>时间</Text>
          <Picker mode="date" value={date} onChange={onDateChange}>
            <View
              className="rounded-2xl px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: '#F7F9FC', border: '1px solid #EDF2F7' }}
            >
              <Text className="block text-sm" style={{ color: '#2D3748' }}>{date}</Text>
              <Text className="block text-xs" style={{ color: '#8896A6' }}>选择 ›</Text>
            </View>
          </Picker>
        </View>

        {/* 支付人 */}
        <View>
          <Text className="block text-xs mb-2" style={{ color: '#8896A6' }}>支付人</Text>
          <View className="flex items-center gap-2 flex-wrap">
            {participants.map(p => (
              <View
                key={p}
                onClick={() => setPayer(p)}
                className="px-4 py-2 rounded-full"
                style={{
                  backgroundColor: payer === p ? '#5B9BD5' : '#F0F6FC',
                  border: payer === p ? '1px solid #5B9BD5' : '1px solid #EDF2F7',
                  boxShadow: payer === p ? '0 4px 12px rgba(91,155,213,0.25)' : 'none',
                }}
              >
                <Text className="block text-xs" style={{ color: payer === p ? '#FFFFFF' : '#2D3748' }}>{p}</Text>
              </View>
            ))}
            <View
              onClick={handleAddPayer}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#F0F6FC', border: '1px solid #EDF2F7' }}
            >
              <Plus size={14} color="#5B9BD5" />
            </View>
          </View>
        </View>

        {/* 请客开关 */}
        <View
          className="flex items-center justify-between rounded-2xl px-4 py-3"
          style={{ backgroundColor: '#F7F9FC', border: '1px solid #EDF2F7' }}
        >
          <Text className="block text-sm" style={{ color: '#2D3748' }}>请客</Text>
          <View
            onClick={() => setIsTreat(!isTreat)}
            className="relative"
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              backgroundColor: isTreat ? '#5B9BD5' : '#E2E8F0',
              boxShadow: isTreat ? '0 2px 8px rgba(91,155,213,0.30)' : 'none',
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
            background: 'linear-gradient(135deg, #5B9BD5, #7EB8E8)',
            boxShadow: '0 8px 30px rgba(91,155,213,0.30)',
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
            style={{ boxShadow: '0 -4px 30px rgba(91,155,213,0.10)' }}
          >
            <View className="flex items-center justify-between mb-4">
              <Text className="block text-base font-semibold" style={{ color: '#2D3748' }}>选择类别</Text>
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
                      backgroundColor: isActive ? '#5B9BD5' : '#F7F9FC',
                      border: isActive ? '1px solid #5B9BD5' : '1px solid #EDF2F7',
                      boxShadow: isActive ? '0 4px 12px rgba(91,155,213,0.25)' : 'none',
                    }}
                  >
                    <Text className="block text-lg">{cat.emoji}</Text>
                    <Text className="block text-xs" style={{ color: isActive ? '#FFFFFF' : '#2D3748' }}>{cat.name}</Text>
                  </View>
                );
              })}
            </View>
            <View className="flex items-center gap-2">
              <Text className="block text-xs" style={{ color: '#8896A6' }}>自定义：</Text>
              <View
                className="flex-1 rounded-xl px-3 py-2"
                style={{ backgroundColor: '#F7F9FC', border: '1px solid #EDF2F7' }}
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
                <Text className="block text-sm" style={{ color: customCategory ? '#2D3748' : '#8896A6' }}>
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
