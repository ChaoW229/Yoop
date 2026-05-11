import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Network } from '@/network';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown } from 'lucide-react-taro';

const CATEGORIES = ['行止', '食味', '栖所', '手信', '门票', '其他'];

export default function AddBillPage() {
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('行止');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [billDate, setBillDate] = useState('');
  const [payer, setPayer] = useState('');
  const [customPayer, setCustomPayer] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [isTreat, setIsTreat] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  useEffect(() => {
    const now = new Date();
    setBillDate(now.toISOString().slice(0, 10));
  }, []);

  useLoad(() => {
    const pages = Taro.getCurrentPages();
    const current = pages[pages.length - 1];
    const pid = current.options?.project_id;
    if (pid) {
      setProjectId(pid);
      Network.request({ url: `/api/projects/${pid}` }).then((res) => {
        const proj = res.data?.data;
        if (proj?.participants?.length) {
          setParticipants(proj.participants);
          setPayer(proj.participants[0]);
        }
      });
    }
  });

  const goBack = () => Taro.navigateBack();

  const handleSave = async () => {
    if (!name || !amount || !payer) {
      Taro.showToast({ title: '请将行迹填完整', icon: 'none' });
      return;
    }
    try {
      await Network.request({
        url: '/api/bills',
        method: 'POST',
        data: {
          projectId,
          name,
          category: isCustomCategory ? customCategory : category,
          amount: Number(amount),
          payer: payer === 'custom' ? customPayer : payer,
          billDate,
          isTreat,
          participants: participants.filter((p) => p !== ''),
        },
      });
      Taro.showToast({ title: '已记下', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 600);
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: '记录失败', icon: 'none' });
    }
  };

  const finalPayers = participants.length > 0 ? participants : ['自己'];

  return (
    <View className="flex flex-col min-h-full bg-background">
      <View className="flex items-center px-4 py-3 bg-surface">
        <View onClick={goBack} className="w-10 h-10 flex items-center justify-center">
          <ArrowLeft size={20} color="#3D3B38" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold text-on-surface pr-10">记一笔</Text>
      </View>

      <View className="px-4 py-4 flex flex-col gap-4">
        {/* 行迹名 */}
        <View>
          <Text className="block text-sm text-on-surface-variant mb-2">行迹名</Text>
          <View className="bg-surface-container rounded-xl px-4 py-3">
            <Input
              className="w-full bg-transparent text-sm text-on-surface"
              placeholder="例如：古城晚风"
              value={name}
              onInput={(e: any) => setName(e.detail.value)}
            />
          </View>
        </View>

        {/* 类别 */}
        <View>
          <Text className="block text-sm text-on-surface-variant mb-2">行止分类</Text>
          <View
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            className="bg-surface-container rounded-xl px-4 py-3 flex items-center justify-between"
          >
            <Text className="block text-sm text-on-surface">{isCustomCategory ? customCategory || '自定义' : category}</Text>
            <ChevronDown size={16} color="#8A8680" />
          </View>
          {showCategoryPicker && (
            <View className="mt-2 bg-surface rounded-xl shadow-card p-2">
              {CATEGORIES.map((c) => (
                <View
                  key={c}
                  onClick={() => {
                    setCategory(c);
                    setIsCustomCategory(false);
                    setShowCategoryPicker(false);
                  }}
                  className={`px-4 py-3 rounded-xl mb-1 ${category === c && !isCustomCategory ? 'bg-primary' : 'bg-surface'}`}
                >
                  <Text className={`block text-sm ${category === c && !isCustomCategory ? 'text-white' : 'text-on-surface'}`}>{c}</Text>
                </View>
              ))}
              <View className="px-4 py-2">
                <Text className="block text-xs text-on-surface-variant mb-2">自定义</Text>
                <View className="flex items-center gap-2">
                  <View className="flex-1 bg-surface-container rounded-xl px-3 py-2">
                    <Input
                      className="w-full bg-transparent text-sm"
                      placeholder="新分类"
                      value={customCategory}
                      onInput={(e: any) => {
                        setCustomCategory(e.detail.value);
                        setIsCustomCategory(true);
                      }}
                    />
                  </View>
                  <View
                    onClick={() => {
                      if (customCategory) {
                        setIsCustomCategory(true);
                        setShowCategoryPicker(false);
                      }
                    }}
                    className="bg-primary rounded-xl px-4 py-2"
                  >
                    <Text className="block text-sm text-white">确认</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* 时间 */}
        <View>
          <Text className="block text-sm text-on-surface-variant mb-2">良辰</Text>
          <View className="bg-surface-container rounded-xl px-4 py-3 flex items-center">
            <Text className="block text-sm text-on-surface">{billDate}</Text>
            <View className="ml-auto">
              <View
                onClick={() => {
                  (Taro as any).showModal({
                    title: '选择良辰',
                    editable: true,
                    content: billDate,
                    success: (res: any) => {
                      if (res.confirm && res.content) setBillDate(res.content);
                    },
                  });
                }}
                className="bg-primary rounded-lg px-3 py-1"
              >
                <Text className="block text-xs text-white">选择</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 银两 */}
        <View>
          <Text className="block text-sm text-on-surface-variant mb-2">银两</Text>
          <View className="flex items-center bg-surface-container rounded-xl px-4 py-3">
            <Text className="block text-sm text-on-surface-variant mr-2">¥</Text>
            <Input
              className="flex-1 bg-transparent text-sm text-on-surface"
              placeholder="0.00"
              type="number"
              value={amount}
              onInput={(e: any) => setAmount(e.detail.value)}
            />
          </View>
        </View>

        {/* 慷慨者 */}
        <View>
          <Text className="block text-sm text-on-surface-variant mb-2">慷慨者</Text>
          <View className="flex flex-wrap gap-2">
            {finalPayers.map((p) => (
              <View
                key={p}
                onClick={() => setPayer(p)}
                className={`px-4 py-2 rounded-xl ${payer === p ? 'bg-primary' : 'bg-surface-container'}`}
              >
                <Text className={`block text-sm ${payer === p ? 'text-white' : 'text-on-surface'}`}>{p}</Text>
              </View>
            ))}
            <View className="flex items-center gap-2">
              <View className="bg-surface-container rounded-xl px-3 py-2">
                <Input
                  className="w-20 bg-transparent text-sm"
                  placeholder="添加"
                  value={customPayer}
                  onInput={(e: any) => {
                    setCustomPayer(e.detail.value);
                    setPayer('custom');
                  }}
                />
              </View>
              <View
                onClick={() => {
                  if (customPayer && !participants.includes(customPayer)) {
                    setParticipants([...participants, customPayer]);
                    setPayer(customPayer);
                    setCustomPayer('');
                  }
                }}
                className="bg-primary rounded-xl px-3 py-2"
              >
                <Text className="block text-sm text-white">添加</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 东道之谊 */}
        <View className="flex items-center justify-between bg-surface rounded-xl p-4 shadow-card">
          <View>
            <Text className="block text-sm font-semibold text-on-surface">东道之谊</Text>
            <Text className="block text-xs text-on-surface-variant mt-1">此项不纳入分账</Text>
          </View>
          <View
            onClick={() => setIsTreat(!isTreat)}
            className={`w-12 h-7 rounded-full p-1 transition-colors ${isTreat ? 'bg-primary' : 'bg-surface-container'}`}
          >
            <View
              className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${isTreat ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </View>
        </View>

        {/* 保存按钮 */}
        <View className="mt-2">
          <Button
            onClick={handleSave}
            className="w-full bg-primary text-on-primary py-3 rounded-xl font-semibold"
          >
            <Text className="block text-white">落笔封存</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
