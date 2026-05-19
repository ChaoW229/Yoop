import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Image } from '@tarojs/components';
import { Network } from '@/network';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-taro';

interface Bill {
  id: string;
  name: string;
  category: string;
  amount: string;
  payer: string;
  is_treat: boolean;
  bill_date?: string;
}

const COVER_COLORS = ['#9AA5B1', '#B5C4B1', '#C4A882', '#A7B8C4', '#C4B1A2', '#9BB5C4'];

function getCoverColor(id: string): string {
  const idx = id ? id.charCodeAt(0) % COVER_COLORS.length : 0;
  return COVER_COLORS[idx];
}

export default function ProjectPage() {
  const [project, setProject] = useState<any>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  useEffect(() => {
    const info = Taro.getSystemInfoSync();
    setStatusBarHeight(info.statusBarHeight || 0);
  }, []);

  const fetchData = async () => {
    const pages = Taro.getCurrentPages();
    const current = pages[pages.length - 1];
    const id = current.options?.id;
    if (!id) return;
    try {
      const [projRes, billsRes] = await Promise.all([
        Network.request({ url: `/api/projects/${id}` }),
        Network.request({ url: `/api/projects/${id}/bills` }),
      ]);
      const proj = projRes.data?.data;
      setProject(proj);
      setBills(billsRes.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useLoad(() => {
    fetchData();
  });

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const goBack = () => Taro.navigateBack();
  const goAddBill = () => Taro.navigateTo({ url: `/pages/add-bill/index?project_id=${project?.id}` });

  const handleChangeCover = async () => {
    const isMiniApp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === Taro.ENV_TYPE.TT;
    if (!isMiniApp) {
      Taro.showToast({ title: '请在小程序中使用', icon: 'none' });
      return;
    }
    try {
      const res = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'] });
      if (res.tempFiles && res.tempFiles.length > 0) {
        await Network.uploadFile({ url: '/api/upload', filePath: res.tempFiles[0].tempFilePath, name: 'file' });
        Taro.showToast({ title: '封面已更新', icon: 'success' });
        setRefreshKey(k => k + 1);
      }
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: '选择失败', icon: 'none' });
    }
  };

  const handleDelete = () => {
    if (!project) return;
    Taro.showModal({
      title: '删除项目',
      content: '确定要删除吗？账单也将一并删除。',
      confirmColor: '#C4716B',
      success: async (res) => {
        if (res.confirm) {
          await Network.request({ url: `/api/projects/${project.id}`, method: 'DELETE' });
          Taro.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => Taro.navigateBack(), 800);
        }
      },
    });
  };

  const billDates = bills.map(b => b.bill_date).filter(Boolean) as string[];
  const autoStart = billDates.length > 0 ? billDates.reduce((a, b) => (a < b ? a : b)) : project?.start_date;
  const autoEnd = billDates.length > 0 ? billDates.reduce((a, b) => (a > b ? a : b)) : project?.end_date;
  const displayStart = project?.start_date || autoStart || '待定';
  const displayEnd = project?.end_date || autoEnd || '待定';
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

  return (
    <View className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <View style={{ paddingTop: statusBarHeight }} className="flex items-center px-4 py-2 bg-white">
        <View onClick={goBack} className="w-8 h-8 flex items-center justify-center">
          <ArrowLeft size={18} color="#9B9690" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold text-[#3D3B38] pr-8">项目详情</Text>
      </View>

      <View className="flex-1 px-4 pt-3 pb-4">
        {/* 封面 + 信息 */}
        <View
          className="flex rounded-2xl overflow-hidden mb-3"
          style={{ border: '1px solid #E0DCD7', boxShadow: '0 4px 16px rgba(154,165,177,0.10)' }}
        >
          {/* 封面图 */}
          <View
            className="w-28 h-28 rounded-l-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: project?.cover_url ? 'transparent' : getCoverColor(project?.id || '') }}
            onClick={handleChangeCover}
          >
            {project?.cover_url ? (
              <Image className="w-full h-full" src={project.cover_url} mode="aspectFill" />
            ) : (
              <Text className="block text-3xl font-bold text-white">{project?.name ? project.name[0] : 'T'}</Text>
            )}
          </View>
          {/* 信息区 */}
          <View className="flex-1 p-3 flex flex-col justify-between">
            <View>
              <View className="bg-[#F7F5F2] rounded-xl px-3 py-2 mb-2" style={{ border: '1px solid #E0DCD7' }}>
                <Text className="block text-sm text-[#3D3B38]">{project?.name}</Text>
              </View>
              <Text className="block text-xs text-[#9B9690]">{displayStart} ~ {displayEnd}</Text>
            </View>
            <View className="flex items-end justify-between">
              <View>
                <Text className="block text-xs text-[#9B9690]">总金额</Text>
                <Text className="block text-xl font-bold text-[#9AA5B1]">¥{totalAmount.toFixed(0)}</Text>
              </View>
              <View className="bg-[#F7F5F2] rounded-xl px-3 py-2" style={{ border: '1px solid #E0DCD7' }}>
                <Text className="block text-xs text-[#9B9690]">人均 ¥{perPerson.toFixed(2)}</Text>
                {treatAmount > 0 && (
                  <Text className="block text-xs text-[#9B9690] mt-1">含请客 ¥{treatAmount.toFixed(0)}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* 添加花费 全宽按钮 */}
        <View
          onClick={goAddBill}
          className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 mb-3"
          style={{ backgroundColor: '#9AA5B1', boxShadow: '0 4px 12px rgba(154,165,177,0.3)' }}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text className="block text-base font-semibold text-white">添加花费</Text>
        </View>

        {/* 账单明细 */}
        <Text className="block text-sm font-semibold text-[#3D3B38] mb-3">账单明细</Text>
        {Object.entries(byDate).map(([date, items]) => (
          <View key={date} className="mb-3">
            <Text className="block text-xs text-[#9B9690] mb-2">{date}</Text>
            {items.map(b => (
              <View
                key={b.id}
                className="flex items-center justify-between bg-[#FAFAF8] rounded-xl p-3 mb-2"
                style={{ border: '1px solid #E8E4DF', boxShadow: '0 2px 8px rgba(154,165,177,0.07)' }}
              >
                <View className="flex items-center gap-3">
                  <View
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: getCoverColor(b.id || '') }}
                  >
                    <Text className="block text-xs text-white">{b.category[0]}</Text>
                  </View>
                  <View>
                    <Text className="block text-sm text-[#3D3B38]">{b.name}</Text>
                    <Text className="block text-xs text-[#9B9690]">{b.payer}</Text>
                  </View>
                </View>
                <View className="flex items-center gap-2">
                  {b.is_treat && (
                    <View className="rounded-full px-2 py-1" style={{ backgroundColor: '#F0EDE8', border: '1px solid #DDD8D2' }}>
                      <Text className="block text-xs text-[#9AA5B1]">请客</Text>
                    </View>
                  )}
                  <Text className={`block text-sm font-semibold ${b.is_treat ? 'text-[#9AA5B1]' : 'text-[#3D3B38]'}`}>
                    ¥{Number(b.amount).toFixed(0)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* 删除项目 全宽按钮 */}
        <View
          onClick={handleDelete}
          className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 mt-4"
          style={{ border: '1px solid #E0DCD7', backgroundColor: '#FAFAF8' }}
        >
          <Trash2 size={16} color="#C4716B" />
          <Text className="block text-sm font-semibold" style={{ color: '#C4716B' }}>删除项目</Text>
        </View>
      </View>
    </View>
  );
}
