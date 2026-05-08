import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Input } from '@/components/ui/input';
import { Network } from '@/network';
import { ArrowLeft } from 'lucide-react-taro';

const CATEGORIES = [
  { key: 'transport', label: '交通', icon: '🚗' },
  { key: 'food', label: '餐饮', icon: '🍽' },
  { key: 'hotel', label: '住宿', icon: '🏨' },
  { key: 'souvenir', label: '纪念品', icon: '🎁' },
  { key: 'ticket', label: '门票', icon: '🎫' },
  { key: 'other', label: '其他', icon: '⋯' },
];

export default function AddBillPage() {
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('food');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('自己');
  const [billDate, setBillDate] = useState('');
  const [isTreat, setIsTreat] = useState(false);

  useLoad(() => {
    const pages = Taro.getCurrentPages();
    const current = pages[pages.length - 1];
    const pid = current.options?.project_id;
    if (pid) setProjectId(pid);
    const today = new Date().toISOString().split('T')[0];
    setBillDate(today);
  });

  const goBack = () => Taro.navigateBack();

  const handleSave = async () => {
    if (!name || !amount || !projectId) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    try {
      const res = await Network.request({
        url: '/api/bills',
        method: 'POST',
        data: {
          project_id: projectId,
          name,
          category,
          amount: Number(amount),
          payer,
          bill_date: billDate,
          is_treat: isTreat,
        },
      });
      console.log('save bill res', res.data);
      Taro.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 800);
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: '保存失败', icon: 'none' });
    }
  };

  return (
    <View className="flex flex-col min-h-full bg-background">
      <View className="flex items-center px-4 py-3 bg-surface">
        <View onClick={goBack} className="w-10 h-10 flex items-center justify-center">
          <ArrowLeft size={20} color="#3D3B38" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold text-on-surface pr-10">
          添加花费
        </Text>
      </View>

      <View className="px-4 py-4 flex flex-col gap-4">
        <View>
          <Text className="block text-sm text-on-surface mb-2">花费名称</Text>
          <View className="bg-surface-container rounded-xl px-4 py-3">
            <Input
              className="w-full text-sm text-on-surface bg-transparent"
              placeholder="例如：古城门票"
              value={name}
              onInput={(e) => setName(e.detail.value)}
            />
          </View>
        </View>

        <View>
          <Text className="block text-sm text-on-surface mb-2">类别</Text>
          <View className="flex gap-2 overflow-x-auto py-2">
            {CATEGORIES.map((c) => (
              <View
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`rounded-xl px-4 py-2 flex items-center gap-1 flex-shrink-0 ${
                  category === c.key ? 'bg-primary' : 'bg-surface-container'
                }`}
              >
                <Text className="block text-sm">{c.icon}</Text>
                <Text className={`block text-sm ${category === c.key ? 'text-white' : 'text-on-surface-variant'}`}>
                  {c.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text className="block text-sm text-on-surface mb-2">时间</Text>
          <View className="bg-surface-container rounded-xl px-4 py-3">
            <Input
              className="w-full text-sm text-on-surface bg-transparent"
              value={billDate}
              onInput={(e) => setBillDate(e.detail.value)}
            />
          </View>
        </View>

        <View>
          <Text className="block text-sm text-on-surface mb-2">金额</Text>
          <View className="flex items-center bg-surface-container rounded-xl px-4 py-3">
            <Text className="block text-sm text-on-surface mr-2">¥</Text>
            <Input
              className="flex-1 text-sm text-on-surface bg-transparent"
              type="digit"
              placeholder="0.00"
              value={amount}
              onInput={(e) => setAmount(e.detail.value)}
            />
          </View>
        </View>

        <View>
          <Text className="block text-sm text-on-surface mb-2">谁付的钱</Text>
          <View className="flex gap-3">
            {['小明', '小红', '自己'].map((p) => (
              <View
                key={p}
                onClick={() => setPayer(p)}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  payer === p ? 'bg-primary' : 'bg-surface-container'
                }`}
              >
                <Text className={`block text-sm ${payer === p ? 'text-white' : 'text-on-surface-variant'}`}>
                  {p[0]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="flex items-center justify-between">
          <View>
            <Text className="block text-sm text-on-surface">标记为请客</Text>
            <Text className="block text-xs text-on-surface-variant">此项不纳入分账计算</Text>
          </View>
          <View
            onClick={() => setIsTreat(!isTreat)}
            className={`w-12 h-7 rounded-full relative transition-colors ${
              isTreat ? 'bg-primary' : 'bg-surface-container'
            }`}
          >
            <View
              className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                isTreat ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </View>
        </View>
      </View>

      <View style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px', backgroundColor: '#F7F5F2', borderTop: '1px solid #DDD8D2' }}>
        <View
          onClick={handleSave}
          className="bg-primary rounded-xl py-4 flex items-center justify-center"
        >
          <Text className="block text-sm font-semibold text-white">保存</Text>
        </View>
      </View>
    </View>
  );
}
