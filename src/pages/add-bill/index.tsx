import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Picker } from '@tarojs/components';
import { Network } from '@/network';
import { ArrowLeft, Car, Utensils, Bed, Gift, Ticket, MoveHorizontal, Plus, X } from 'lucide-react-taro';

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
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(['小明', '小红', '自己']);
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

  const toggleParticipant = (pName: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(pName) ? prev.filter((n) => n !== pName) : [...prev, pName]
    );
  };

  const handleAddPayer = () => {
    (Taro as any).showModal({
      title: '添加支付人',
      editable: true,
      placeholderText: '姓名',
      success: (res: any) => {
        if (res.confirm && res.content) {
          setPayer(res.content);
          if (!participants.includes(res.content)) {
            setParticipants((prev) => [...prev, res.content]);
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
          participants: selectedParticipants,
        },
      });
      Taro.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: '保存失败', icon: 'none' });
    }
  };

  const onDateChange = (e: any) => {
    setDate(e.detail.value);
  };

  return (
    <View className="flex flex-col min-h-full bg-background">
      <View style={{ paddingTop: statusBarHeight }} className="flex items-center px-4 py-3 bg-surface">
        <View onClick={goBack} className="w-10 h-10 flex items-center justify-center">
          <ArrowLeft size={20} color="#3D3B38" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold text-on-surface pr-10">添加花费</Text>
      </View>

      <View className="flex-1 px-4 py-4 flex flex-col gap-4">
        {/* 名称 */}
        <View>
          <Text className="block text-sm text-on-surface-variant mb-2">花费名称</Text>
          <View className="bg-surface-container rounded-xl px-4 py-3">
            <Text
              className="block text-sm text-on-surface"
              onClick={() => {
                (Taro as any).showModal({
                  title: '花费名称',
                  editable: true,
                  placeholderText: '例如：古城门票',
                  success: (res: any) => {
                    if (res.confirm && res.content) setName(res.content);
                  },
                });
              }}
            >
              {name || '请输入花费名称'}
            </Text>
          </View>
        </View>

        {/* 类别 */}
        <View>
          <Text className="block text-sm text-on-surface-variant mb-2">类别</Text>
          <View
            onClick={() => setShowCategoryDrawer(true)}
            className="bg-surface-container rounded-xl px-4 py-3 flex items-center justify-between"
          >
            <Text className="block text-sm text-on-surface">{customCategory || category}</Text>
            <Text className="block text-sm text-on-surface-variant">选择</Text>
          </View>
        </View>

        {/* 日期 Picker */}
        <View>
          <Text className="block text-sm text-on-surface-variant mb-2">时间</Text>
          <Picker mode="date" value={date} onChange={onDateChange}>
            <View className="bg-surface-container rounded-xl px-4 py-3">
              <Text className="block text-sm text-on-surface">{date}</Text>
            </View>
          </Picker>
        </View>

        {/* 金额 */}
        <View>
          <Text className="block text-sm text-on-surface-variant mb-2">金额</Text>
          <View className="bg-surface-container rounded-xl px-4 py-3 flex items-center">
            <Text className="block text-sm text-on-surface-variant mr-2">¥</Text>
            <Text
              className="block text-sm text-on-surface flex-1"
              onClick={() => {
                (Taro as any).showModal({
                  title: '金额',
                  editable: true,
                  placeholderText: '0.00',
                  success: (res: any) => {
                    if (res.confirm && res.content) setAmount(res.content);
                  },
                });
              }}
            >
              {amount || '请输入金额'}
            </Text>
          </View>
        </View>

        {/* 支付人 */}
        <View>
          <Text className="block text-sm text-on-surface-variant mb-2">支付人</Text>
          <View className="flex items-center gap-2 flex-wrap">
            {participants.map((p) => (
              <View
                key={p}
                onClick={() => setPayer(p)}
                className={`px-4 py-2 rounded-full ${payer === p ? 'bg-primary' : 'bg-surface-container'}`}
              >
                <Text className={`block text-sm ${payer === p ? 'text-white' : 'text-on-surface'}`}>{p}</Text>
              </View>
            ))}
            <View
              onClick={handleAddPayer}
              className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center"
            >
              <Plus size={16} color="#9AA5B1" />
            </View>
          </View>
        </View>

        {/* 同行者 */}
        <View className={isTreat ? 'opacity-40' : ''}>
          <Text className="block text-sm text-on-surface-variant mb-2">参与分摊</Text>
          <View className="flex items-center gap-3 flex-wrap">
            {participants.map((p) => (
              <View key={p} onClick={() => !isTreat && toggleParticipant(p)} className="flex items-center gap-1">
                <View
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedParticipants.includes(p) ? 'border-primary bg-primary' : 'border-outline'
                  }`}
                >
                  {selectedParticipants.includes(p) && <Text className="block text-white text-xs">✓</Text>}
                </View>
                <Text className="block text-sm text-on-surface">{p}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 请客 */}
        <View className="flex items-center justify-between py-2">
          <View>
            <Text className="block text-sm font-semibold text-on-surface">标记为请客</Text>
            <Text className="block text-xs text-on-surface-variant">此项不纳入分账计算</Text>
          </View>
          <View
            onClick={() => setIsTreat(!isTreat)}
            className={`w-12 h-7 rounded-full relative transition-colors ${isTreat ? 'bg-primary' : 'bg-surface-container'}`}
          >
            <View
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${isTreat ? 'left-6' : 'left-1'}`}
            />
          </View>
        </View>
      </View>

      {/* Bottom save button */}
      <View className="px-4 py-3 bg-surface border-t border-outline-variant">
        <View onClick={handleSave} className="w-full py-3 rounded-xl bg-primary flex items-center justify-center">
          <Text className="block text-sm font-semibold text-white">保存</Text>
        </View>
      </View>

      {/* Category drawer */}
      {showCategoryDrawer && (
        <View
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View className="w-full bg-surface rounded-t-3xl p-6">
            <View className="flex items-center justify-between mb-4">
              <Text className="block text-lg font-semibold text-on-surface">选择类别</Text>
              <View onClick={() => setShowCategoryDrawer(false)}>
                <X size={24} color="#8A8680" />
              </View>
            </View>
            <View className="grid grid-cols-3 gap-3 mb-4">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = category === cat.name && !customCategory;
                return (
                  <View
                    key={cat.name}
                    onClick={() => {
                      setCategory(cat.name);
                      setCustomCategory('');
                      setShowCategoryDrawer(false);
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl ${
                      isActive ? 'bg-primary' : 'bg-surface-container'
                    }`}
                  >
                    <Icon size={20} color={isActive ? '#fff' : '#9AA5B1'} />
                    <Text className={`block text-xs ${isActive ? 'text-white' : 'text-on-surface'}`}>{cat.name}</Text>
                  </View>
                );
              })}
            </View>
            <View className="flex items-center gap-2">
              <Text className="block text-sm text-on-surface-variant">自定义：</Text>
              <Text
                className="block text-sm text-on-surface flex-1 bg-surface-container rounded-xl px-3 py-2"
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
                {customCategory || '点击输入自定义类别'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
