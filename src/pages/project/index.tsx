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

/* 与首页一致的8种低饱和度色系 */
const CARD_COLORS = [
  { bg: '#E8F0F7', accent: '#6B9BD5' },
  { bg: '#EDF4EE', accent: '#7BA888' },
  { bg: '#F5EDE8', accent: '#C49A7A' },
  { bg: '#EBE8F3', accent: '#9B8EC4' },
  { bg: '#F0EDE8', accent: '#B8A07A' },
  { bg: '#E5EFF1', accent: '#6BAFA5' },
  { bg: '#F2EBEF', accent: '#B87D9A' },
  { bg: '#EAF0E8', accent: '#8FB894' },
];

function getCardColor(id: string) {
  const idx = id ? Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % CARD_COLORS.length : 0;
  return CARD_COLORS[idx];
}

function getIcon(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('海') || n.includes('滩') || n.includes('岛')) return '\u{1F3D6}';
  if (n.includes('山') || n.includes('峰') || n.includes('岭')) return '\u{1F3D4}';
  if (n.includes('湖') || n.includes('水')) return '\u{1F4A7}';
  if (n.includes('城') || n.includes('京') || n.includes('都')) return '\u{1F3D9}';
  if (n.includes('古镇') || n.includes('丽江') || n.includes('巷')) return '\u{1F3EF}';
  if (n.includes('雪') || n.includes('冰')) return '\u{2744}\uFE0F';
  if (n.includes('花') || n.includes('园')) return '\u{1F338}';
  if (n.includes('森') || n.includes('林') || n.includes('木')) return '\u{1F332}';
  if (n.includes('食') || n.includes('吃') || n.includes('味')) return '\u{1F35C}';
  if (n.includes('酒') || n.includes('吧')) return '\u{1F37A}';
  return '\u{2708}\uFE0F';
}

const CATEGORY_ICONS: Record<string, string> = {
  '交通': '\uD83D\uDE97', '餐饮': '\uD83C\uDF7D', '住宿': '\uD83C\uDFE8', '纪念品': '\uD83C\uDF81', '门票': '\uD83C\uDFAB', '其他': '\uD83D\uDCCC',
};

export default function ProjectPage() {
  const [project, setProject] = useState<any>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  /* 顶部与胶囊按钮对齐 */
  const statusBarH = Taro.getSystemInfoSync().statusBarHeight || 0;
  let capsuleBottom = statusBarH + 44;
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
  if (isWeapp) {
    try {
      const capsule = Taro.getMenuButtonBoundingClientRect();
      if (capsule && capsule.bottom) {
        capsuleBottom = capsule.bottom + 6;
      }
    } catch (e) { /* H5 fallback */ }
  }

  const fetchData = async () => {
    try {
      const pages = Taro.getCurrentPages();
      const current = pages[pages.length - 1];
      const id = current.options?.id;
      if (!id) return;

      const [projRes, billsRes] = await Promise.all([
        Network.request({ url: `/api/projects/${id}` }),
        Network.request({ url: `/api/projects/${id}/bills` }),
      ]);
      console.log('project detail', projRes.data);
      setProject(projRes.data?.data);
      setBills(billsRes.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useLoad(() => {
    setTimeout(fetchData, 50);
  });

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const goBack = () => Taro.navigateBack();
  const goAddBill = () => Taro.navigateTo({ url: `/pages/add-bill/index?project_id=${project?.id}` });

  const handleChangeCover = async () => {
    const isMiniApp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === Taro.ENV_TYPE.TT;
    try {
      let tempFilePath = '';
      if (isMiniApp) {
        const res = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'] });
        if (res.tempFiles && res.tempFiles.length > 0) {
          tempFilePath = res.tempFiles[0].tempFilePath;
        }
      } else {
        const res = await Taro.chooseImage({ count: 1, sourceType: ['album', 'camera'] });
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          tempFilePath = res.tempFilePaths[0];
        }
      }
      if (!tempFilePath) return;
      const uploadRes = await Network.uploadFile({
        url: '/api/upload',
        filePath: tempFilePath,
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
    } catch (e) {
      console.error('choose cover error', e);
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
  const displayStart = (project?.start_date || autoStart || '待定').replace(/-/g, '/');
  const displayEnd = (project?.end_date || autoEnd || '待定').replace(/-/g, '/');
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

  const cc = getCardColor(project?.id || '');

  /* 数据未加载时渲染占位，避免闪烁 */
  if (!project) {
    return (
      <View className="flex flex-col min-h-full bg-white">
        <View
          style={{ paddingTop: statusBarH, height: capsuleBottom }}
          className="flex items-center px-4"
        >
          <View onClick={goBack} className="w-8 h-8 flex items-center justify-center">
            <ArrowLeft size={18} color="#8896A6" />
          </View>
          <Text className="block flex-1 text-center text-base font-semibold pr-8" style={{ color: '#2D3748' }}>项目详情</Text>
        </View>
        <View className="px-4 pt-4 flex items-center justify-center" style={{ height: 200 }}>
          <Text className="block text-sm" style={{ color: '#A0ABB8' }}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex flex-col min-h-full bg-white">
      {/* Header：与胶囊按钮对齐，无重叠 */}
      <View
        style={{
          paddingTop: statusBarH,
          height: capsuleBottom,
        }}
        className="flex items-center px-4 bg-white"
      >
        <View onClick={goBack} className="w-8 h-8 flex items-center justify-center">
          <ArrowLeft size={18} color="#8896A6" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold pr-8" style={{ color: '#2D3748' }}>项目详情</Text>
      </View>

      <View className="flex-1 px-4 pb-4" style={{ paddingTop: 4 }}>
        {/* 封面 + 信息 */}
        <View
          className="flex items-center rounded-2xl overflow-hidden mb-3"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)',
            minHeight: 104,
          }}
        >
          {/* 封面图 */}
          <View
            className="flex items-center justify-center flex-shrink-0 relative overflow-hidden"
            style={{
              width: 96,
              height: 96,
              borderRadius: '16px',
              marginLeft: 12,
              marginTop: 4,
              marginBottom: 4,
              background: project?.cover_url ? undefined : cc.accent,
              opacity: project?.cover_url ? undefined : 0.85,
            }}
            onClick={handleChangeCover}
          >
            {project?.cover_url ? (
              <Image style={{ width: 96, height: 96 }} src={project.cover_url} mode="aspectFill" />
            ) : (
              <Text className="block text-3xl">{getIcon(project?.name || '')}</Text>
            )}
            <View className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}>
              <Camera size={10} color={cc.accent} />
            </View>
          </View>
          {/* 信息区：项目名水平居中 */}
          <View className="flex-1 p-3 flex flex-col justify-between">
            <View>
              <Text className="block text-base font-semibold" style={{ color: '#2D3748', textAlign: 'center', letterSpacing: '0.5px' }}>
                {project?.name}
              </Text>
              <Text className="block text-xs mt-1" style={{ color: '#8896A6', textAlign: 'center' }}>
                {displayStart} ~ {displayEnd}
              </Text>
            </View>
            <View className="flex items-end justify-between mt-2">
              <View>
                <Text className="block text-xs" style={{ color: '#8896A6' }}>总金额</Text>
                <Text className="block text-xl font-bold" style={{ color: cc.accent }}>¥{totalAmount.toFixed(0)}</Text>
              </View>
              <View
                className="rounded-xl px-3 py-2"
                style={{ backgroundColor: '#F0F6FC', border: '1px solid #E4EDF7' }}
              >
                <Text className="block text-xs" style={{ color: cc.accent }}>人均 ¥{perPerson.toFixed(2)}</Text>
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
            background: `linear-gradient(135deg, ${cc.accent}, ${cc.bg})`,
            boxShadow: '0 6px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text className="block text-base font-semibold text-white">添加花费</Text>
        </View>

        {/* 账单明细 */}
        <Text className="block text-sm font-semibold mb-2" style={{ color: '#2D3748' }}>账单明细</Text>
        {Object.entries(byDate).map(([date, items]) => (
          <View key={date} className="mb-3">
            <Text className="block text-xs mb-2" style={{ color: '#8896A6' }}>{date}</Text>
            {items.map(b => (
              <View
                key={b.id}
                className="flex items-center justify-between rounded-xl p-3 mb-2"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 4px 16px rgba(91,155,213,0.06)',
                }}
              >
                <View className="flex items-center gap-3">
                  <View
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#F0F6FC' }}
                  >
                    <Text className="block text-sm">{CATEGORY_ICONS[b.category] || '\uD83D\uDCCC'}</Text>
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
                      <Text className="block text-xs" style={{ color: cc.accent }}>请客</Text>
                    </View>
                  )}
                  <Text className="block text-sm font-semibold" style={{ color: b.is_treat ? cc.accent : '#2D3748' }}>
                    ¥{Number(b.amount).toFixed(0)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
        {bills.length === 0 && (
          <View className="flex items-center justify-center py-8">
            <Text className="block text-sm" style={{ color: '#8896A6' }}>暂无账单，点击上方添加</Text>
          </View>
        )}

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
