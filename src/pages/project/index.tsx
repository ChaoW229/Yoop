import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Image } from '@tarojs/components';
import { Network } from '@/network';
import { ArrowLeft, Plus, Trash2, Camera } from 'lucide-react-taro';

interface Bill {
  id: string;
  name: string;
  category: string;
  amount: string;
  payer: string;
  is_treat: boolean;
  bill_date?: string;
}

const GRADIENTS = [
  ['#5B9BD5', '#7EB8E8'],
  ['#6CC4A1', '#8ED8BA'],
  ['#F2A65A', '#F5C28A'],
  ['#E8736C', '#F09A94'],
  ['#9B8EC4', '#BDB1D8'],
  ['#5BBDB5', '#82D4CD'],
];

function getGradient(id: string): string[] {
  const idx = id ? id.charCodeAt(0) % GRADIENTS.length : 0;
  return GRADIENTS[idx];
}

function getIcon(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('海') || n.includes('滩') || n.includes('岛')) return '🏖';
  if (n.includes('山') || n.includes('峰') || n.includes('岭')) return '🏔';
  if (n.includes('湖') || n.includes('水')) return '💧';
  if (n.includes('城') || n.includes('京') || n.includes('都')) return '🏙';
  if (n.includes('古镇') || n.includes('丽江') || n.includes('巷')) return '🏮';
  if (n.includes('雪') || n.includes('冰')) return '❄';
  if (n.includes('花') || n.includes('园')) return '🌸';
  if (n.includes('森') || n.includes('林') || n.includes('木')) return '🌲';
  if (n.includes('食') || n.includes('吃') || n.includes('味')) return '🍜';
  if (n.includes('酒') || n.includes('吧')) return '🍸';
  return '✈';
}

const CATEGORY_ICONS: Record<string, string> = {
  '交通': '🚗', '餐饮': '🍽', '住宿': '🏨', '纪念品': '🎁', '门票': '🎫', '其他': '📌',
};

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
      setProject(projRes.data?.data);
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
      // H5 fallback: use file input
      try {
        const res = await Taro.chooseImage({ count: 1, sourceType: ['album', 'camera'] });
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          const uploadRes = await Network.uploadFile({
            url: '/api/upload',
            filePath: res.tempFilePaths[0],
            name: 'file',
          });
          console.log('cover upload result', uploadRes.data);
          const parsed = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;
          const url = parsed?.data?.url;
          if (url && project?.id) {
            await Network.request({
              url: `/api/projects/${project.id}`,
              method: 'PUT',
              data: { cover_url: url },
            });
            Taro.showToast({ title: '封面已更新', icon: 'success' });
            setRefreshKey(k => k + 1);
          }
        }
      } catch (e) {
        console.error('choose cover error', e);
        Taro.showToast({ title: '选择失败', icon: 'none' });
      }
      return;
    }
    try {
      const res = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'] });
      if (res.tempFiles && res.tempFiles.length > 0) {
        const uploadRes = await Network.uploadFile({
          url: '/api/upload',
          filePath: res.tempFiles[0].tempFilePath,
          name: 'file',
        });
        console.log('cover upload result', uploadRes.data);
        const parsed = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;
        const url = parsed?.data?.url;
        if (url && project?.id) {
          await Network.request({
            url: `/api/projects/${project.id}`,
            method: 'PUT',
            data: { cover_url: url },
          });
          Taro.showToast({ title: '封面已更新', icon: 'success' });
          setRefreshKey(k => k + 1);
        }
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
      confirmColor: '#E86C6C',
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

  const [g1, g2] = getGradient(project?.id || '');

  return (
    <View className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <View style={{ paddingTop: statusBarHeight }} className="flex items-center px-4 py-2 bg-white">
        <View onClick={goBack} className="w-8 h-8 flex items-center justify-center">
          <ArrowLeft size={18} color="#8896A6" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold pr-8" style={{ color: '#2D3748' }}>项目详情</Text>
      </View>

      <View className="flex-1 px-4 pt-2 pb-4">
        {/* 封面 + 信息 */}
        <View
          className="flex rounded-2xl overflow-hidden mb-3"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EDF2F7',
            boxShadow: '0 8px 30px rgba(91,155,213,0.10), 0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {/* 封面图 */}
          <View
            className="w-28 h-28 flex items-center justify-center flex-shrink-0 relative"
            style={{
              background: project?.cover_url ? undefined : `linear-gradient(135deg, ${g1}, ${g2})`,
            }}
            onClick={handleChangeCover}
          >
            {project?.cover_url ? (
              <Image className="w-full h-full" src={project.cover_url} mode="aspectFill" />
            ) : (
              <Text className="block text-4xl">{getIcon(project?.name || '')}</Text>
            )}
            <View className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}>
              <Camera size={10} color="#5B9BD5" />
            </View>
          </View>
          {/* 信息区 */}
          <View className="flex-1 p-3 flex flex-col justify-between">
            <View>
              <Text className="block text-base font-semibold" style={{ color: '#2D3748' }}>{project?.name}</Text>
              <Text className="block text-xs mt-1" style={{ color: '#8896A6' }}>{displayStart} ~ {displayEnd}</Text>
            </View>
            <View className="flex items-end justify-between">
              <View>
                <Text className="block text-xs" style={{ color: '#8896A6' }}>总金额</Text>
                <Text className="block text-xl font-bold" style={{ color: '#5B9BD5' }}>¥{totalAmount.toFixed(0)}</Text>
              </View>
              <View
                className="rounded-xl px-3 py-2"
                style={{ backgroundColor: '#F0F6FC', border: '1px solid #E4EDF7' }}
              >
                <Text className="block text-xs" style={{ color: '#5B9BD5' }}>人均 ¥{perPerson.toFixed(2)}</Text>
                {treatAmount > 0 && (
                  <Text className="block text-xs mt-1" style={{ color: '#8896A6' }}>含请客 ¥{treatAmount.toFixed(0)}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* 添加花费 全宽按钮 */}
        <View
          onClick={goAddBill}
          className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 mb-3"
          style={{
            background: 'linear-gradient(135deg, #5B9BD5, #7EB8E8)',
            boxShadow: '0 8px 30px rgba(91,155,213,0.30), 0 2px 8px rgba(91,155,213,0.15)',
          }}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text className="block text-base font-semibold text-white">添加花费</Text>
        </View>

        {/* 账单明细 */}
        <Text className="block text-sm font-semibold mb-3" style={{ color: '#2D3748' }}>账单明细</Text>
        {Object.entries(byDate).map(([date, items]) => (
          <View key={date} className="mb-3">
            <Text className="block text-xs mb-2" style={{ color: '#8896A6' }}>{date}</Text>
            {items.map(b => (
              <View
                key={b.id}
                className="flex items-center justify-between rounded-xl p-3 mb-2"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EDF2F7',
                  boxShadow: '0 4px 16px rgba(91,155,213,0.06)',
                }}
              >
                <View className="flex items-center gap-3">
                  <View
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#F0F6FC' }}
                  >
                    <Text className="block text-sm">{CATEGORY_ICONS[b.category] || '📌'}</Text>
                  </View>
                  <View>
                    <Text className="block text-sm" style={{ color: '#2D3748' }}>{b.name}</Text>
                    <Text className="block text-xs" style={{ color: '#8896A6' }}>{b.payer}</Text>
                  </View>
                </View>
                <View className="flex items-center gap-2">
                  {b.is_treat && (
                    <View
                      className="rounded-full px-2 py-1"
                      style={{ backgroundColor: '#F0F6FC', border: '1px solid #E4EDF7' }}
                    >
                      <Text className="block text-xs" style={{ color: '#5B9BD5' }}>请客</Text>
                    </View>
                  )}
                  <Text className="block text-sm font-semibold" style={{ color: b.is_treat ? '#5B9BD5' : '#2D3748' }}>
                    ¥{Number(b.amount).toFixed(0)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* 删除项目 */}
        <View
          onClick={handleDelete}
          className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 mt-4"
          style={{ border: '1px solid #FDE8E8', backgroundColor: '#FFF5F5' }}
        >
          <Trash2 size={16} color="#E86C6C" />
          <Text className="block text-sm font-semibold" style={{ color: '#E86C6C' }}>删除项目</Text>
        </View>
      </View>
    </View>
  );
}
