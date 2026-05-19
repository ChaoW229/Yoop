import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Image, Picker } from '@tarojs/components';
import { Input } from '@/components/ui/input';
import { Network } from '@/network';
import { ChartPie, User, Search, Plus, X, Calendar } from 'lucide-react-taro';

interface Project {
  id: string;
  name: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  total_amount: string;
  participants?: string[];
  cover_url?: string;
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

export default function IndexPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  useEffect(() => {
    const info = Taro.getSystemInfoSync();
    setStatusBarHeight(info.statusBarHeight || 0);
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await Network.request({ url: '/api/projects' });
      console.log('projects res', res.data);
      setProjects(res.data?.data || []);
    } catch (e) {
      console.error('fetch projects error', e);
    } finally {
      setLoading(false);
    }
  };

  useLoad(() => {
    fetchProjects();
  });

  const goStats = () => {
    Taro.navigateTo({ url: '/pages/stats/index' });
  };
  const goProfile = () => {
    Taro.navigateTo({ url: '/pages/profile/index' });
  };
  const goProject = (id: string) => {
    Taro.navigateTo({ url: `/pages/project/index?id=${id}` });
  };

  const handleAddProject = async () => {
    if (!newName) {
      Taro.showToast({ title: '请填写项目名', icon: 'none' });
      return;
    }
    try {
      await Network.request({
        url: '/api/projects',
        method: 'POST',
        data: {
          name: newName,
          destination: newName,
          startDate: newStart || undefined,
          endDate: newEnd || undefined,
          participants: ['小明', '小红'],
        },
      });
      Taro.showToast({ title: '新项目已添加', icon: 'success' });
      setShowAddModal(false);
      setNewName('');
      setNewStart('');
      setNewEnd('');
      fetchProjects();
    } catch (e) {
      Taro.showToast({ title: '添加失败', icon: 'none' });
    }
  };

  const filteredProjects = isSearching && searchText
    ? projects.filter(p => p.name?.includes(searchText) || p.destination?.includes(searchText))
    : projects;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <View className="flex flex-col h-full bg-white">
      {/* Header */}
      <View style={{ paddingTop: statusBarHeight }} className="px-4 pb-2 flex items-center gap-3 bg-white">
        <View
          onClick={goStats}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#F0F6FC', boxShadow: '0 4px 12px rgba(91,155,213,0.15)' }}
        >
          <ChartPie size={18} color="#5B9BD5" />
        </View>
        <View
          className="flex-1 h-10 rounded-full flex items-center px-4"
          style={{ backgroundColor: '#F7F9FC', border: '1px solid #EDF2F7' }}
          onClick={() => setIsSearching(true)}
        >
          <Search size={14} color="#8896A6" />
          {isSearching ? (
            <View className="flex-1 ml-2">
              <Input
                className="border-0 bg-transparent shadow-none ring-0 focus-within:ring-0 focus-within:border-0 h-8 text-sm"
                placeholder="搜索项目"
                focus={isSearching}
                value={searchText}
                onInput={e => setSearchText(e.detail.value)}
                onBlur={() => { if (!searchText) setIsSearching(false); }}
              />
            </View>
          ) : (
            <Text className="block text-sm ml-2" style={{ color: '#8896A6' }}>搜索项目</Text>
          )}
        </View>
        <View
          onClick={goProfile}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#F0F6FC', boxShadow: '0 4px 12px rgba(91,155,213,0.15)' }}
        >
          <User size={18} color="#5B9BD5" />
        </View>
      </View>

      {/* Project List */}
      <View className="flex-1 px-4 pb-3">
        <Text className="block text-lg font-semibold mb-3" style={{ color: '#2D3748' }}>我的项目</Text>
        {loading && (
          <View className="flex items-center justify-center py-10">
            <Text className="block text-sm" style={{ color: '#8896A6' }}>加载中...</Text>
          </View>
        )}
        {filteredProjects.map((p) => {
          const [g1, g2] = getGradient(p.id);
          return (
            <View
              key={p.id}
              onClick={() => goProject(p.id)}
              className="flex rounded-2xl mb-4 overflow-hidden"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EDF2F7',
                boxShadow: '0 8px 30px rgba(91,155,213,0.10), 0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              {/* Left: Cover */}
              <View
                className="w-24 h-24 flex items-center justify-center flex-shrink-0"
                style={{
                  background: p.cover_url ? undefined : `linear-gradient(135deg, ${g1}, ${g2})`,
                }}
              >
                {p.cover_url ? (
                  <Image className="w-full h-full" src={p.cover_url} mode="aspectFill" />
                ) : (
                  <Text className="block text-3xl">{getIcon(p.name)}</Text>
                )}
              </View>
              {/* Right: Info */}
              <View className="flex-1 p-3 flex flex-col justify-between">
                <View>
                  <Text className="block text-base font-semibold" style={{ color: '#2D3748' }}>{p.name}</Text>
                  <Text className="block text-xs mt-1" style={{ color: '#8896A6' }}>
                    {p.start_date || '待定'} ~ {p.end_date || '待定'}
                  </Text>
                </View>
                <View className="flex items-center justify-between">
                  <View className="flex gap-1">
                    {(p.participants || []).slice(0, 3).map((name, i) => (
                      <View
                        key={i}
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#F0F6FC' }}
                      >
                        <Text className="block text-xs" style={{ color: '#5B9BD5' }}>{name[0]}</Text>
                      </View>
                    ))}
                  </View>
                  <Text className="block text-base font-bold" style={{ color: '#5B9BD5' }}>
                    ¥{Number(p.total_amount || 0).toFixed(0)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
        {!loading && filteredProjects.length === 0 && (
          <View className="flex flex-col items-center justify-center py-12">
            <Text className="block text-sm" style={{ color: '#8896A6' }}>
              {searchText ? '未找到匹配项目' : '暂无项目，点击右下角添加'}
            </Text>
          </View>
        )}
      </View>

      {/* Floating add button */}
      <View
        onClick={() => setShowAddModal(true)}
        className="fixed right-5 rounded-full flex items-center justify-center"
        style={{
          zIndex: 50,
          bottom: 80,
          width: 54,
          height: 54,
          background: 'linear-gradient(135deg, #5B9BD5, #7EB8E8)',
          boxShadow: '0 10px 40px rgba(91,155,213,0.40), 0 4px 12px rgba(91,155,213,0.20)',
        }}
      >
        <Plus size={26} color="#FFFFFF" />
      </View>

      {/* Full-screen Add project overlay */}
      {showAddModal && (
        <View className="fixed inset-0" style={{ zIndex: 100, backgroundColor: '#FFFFFF' }}>
          <View style={{ paddingTop: statusBarHeight }} className="flex items-center px-4 py-2">
            <View onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center">
              <X size={20} color="#8896A6" />
            </View>
            <Text className="block flex-1 text-center text-base font-semibold pr-8" style={{ color: '#2D3748' }}>添加新项目</Text>
          </View>

          <View className="px-5 pt-6 flex flex-col gap-5">
            <View>
              <Text className="block text-xs mb-2" style={{ color: '#8896A6' }}>项目名</Text>
              <View
                className="rounded-2xl px-4 py-3"
                style={{ backgroundColor: '#F7F9FC', border: '1px solid #EDF2F7' }}
              >
                <Input
                  className="w-full text-sm"
                  placeholder="例如：丽江三日游"
                  style={{ color: '#2D3748' }}
                  value={newName}
                  onInput={e => setNewName(e.detail.value)}
                />
              </View>
            </View>

            <View className="flex gap-3">
              <View className="flex-1">
                <Text className="block text-xs mb-2" style={{ color: '#8896A6' }}>开始日期</Text>
                <Picker mode="date" value={newStart || todayStr} onChange={e => setNewStart(e.detail.value)}>
                  <View
                    className="rounded-2xl px-4 py-3 flex items-center gap-2"
                    style={{ backgroundColor: '#F7F9FC', border: '1px solid #EDF2F7' }}
                  >
                    <Calendar size={14} color="#5B9BD5" />
                    <Text className="block text-sm" style={{ color: '#2D3748' }}>{newStart || '选择日期'}</Text>
                  </View>
                </Picker>
              </View>
              <View className="flex-1">
                <Text className="block text-xs mb-2" style={{ color: '#8896A6' }}>结束日期</Text>
                <Picker mode="date" value={newEnd || todayStr} onChange={e => setNewEnd(e.detail.value)}>
                  <View
                    className="rounded-2xl px-4 py-3 flex items-center gap-2"
                    style={{ backgroundColor: '#F7F9FC', border: '1px solid #EDF2F7' }}
                  >
                    <Calendar size={14} color="#5B9BD5" />
                    <Text className="block text-sm" style={{ color: '#2D3748' }}>{newEnd || '选择日期'}</Text>
                  </View>
                </Picker>
              </View>
            </View>

            <View
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: '#F0F6FC', border: '1px solid #E4EDF7' }}
            >
              <Text className="block text-xs" style={{ color: '#5B9BD5' }}>
                添加账单后，起止日期将根据账单时间自动填充
              </Text>
            </View>

            <View
              onClick={handleAddProject}
              className="w-full py-4 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #5B9BD5, #7EB8E8)',
                boxShadow: '0 8px 30px rgba(91,155,213,0.30)',
              }}
            >
              <Text className="block text-base font-semibold text-white">添加</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
