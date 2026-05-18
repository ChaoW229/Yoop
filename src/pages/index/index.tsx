import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Picker } from '@tarojs/components';
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

const COVER_COLORS = ['#9AA5B1', '#B5C4B1', '#C4A882', '#A7B8C4', '#C4B1A2', '#9BB5C4'];

function getCoverColor(id: string): string {
  const idx = id ? id.charCodeAt(0) % COVER_COLORS.length : 0;
  return COVER_COLORS[idx];
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
      <View style={{ paddingTop: statusBarHeight }} className="px-4 pt-4 pb-3 flex items-center gap-3 bg-white">
        <View onClick={goStats} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
          <ChartPie size={18} color="#9AA5B1" />
        </View>
        <View
          className="flex-1 h-10 bg-surface-container rounded-full flex items-center px-4"
          onClick={() => setIsSearching(true)}
        >
          <Search size={14} color="#9B9690" />
          {isSearching ? (
            <View className="flex-1 ml-2">
              <Input
                className="border-0 bg-transparent shadow-none ring-0 focus-within:ring-0 focus-within:border-0 h-8 text-sm text-on-surface"
                placeholder="搜索项目"
                focus={isSearching}
                value={searchText}
                onInput={e => setSearchText(e.detail.value)}
                onBlur={() => { if (!searchText) setIsSearching(false); }}
              />
            </View>
          ) : (
            <Text className="block text-sm text-on-surface-variant ml-2">搜索项目</Text>
          )}
        </View>
        <View onClick={goProfile} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
          <User size={18} color="#9AA5B1" />
        </View>
      </View>

      {/* Project List */}
      <View className="flex-1 px-4 py-3">
        <Text className="block text-lg font-semibold text-on-surface mb-3">我的项目</Text>
        {loading && <Text className="block text-sm text-on-surface-variant">加载中...</Text>}
        {filteredProjects.map((p) => (
          <View
            key={p.id}
            onClick={() => goProject(p.id)}
            className="flex bg-card rounded-2xl shadow-card mb-3 overflow-hidden"
          >
            <View
              className="w-24 h-24 rounded-l-2xl flex items-center justify-center"
              style={{ backgroundColor: getCoverColor(p.id) }}
            >
              <Text className="block text-lg font-bold" style={{ color: '#FFFFFF' }}>
                {(p.name || 'T')[0]}
              </Text>
            </View>
            <View className="flex-1 p-3 flex flex-col justify-between">
              <View>
                <Text className="block text-base font-semibold text-on-surface">{p.name}</Text>
                <Text className="block text-xs text-on-surface-variant mt-1">
                  {p.start_date || '待定'} - {p.end_date || '待定'}
                </Text>
              </View>
              <View className="flex items-center justify-between">
                <View className="flex gap-1">
                  {(p.participants || []).slice(0, 3).map((name, i) => (
                    <View
                      key={i}
                      className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center"
                    >
                      <Text className="block text-xs text-primary">{name[0]}</Text>
                    </View>
                  ))}
                </View>
                <Text className="block text-base font-bold text-primary">
                  ¥{Number(p.total_amount || 0).toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        ))}
        {!loading && filteredProjects.length === 0 && (
          <View className="flex items-center justify-center py-12">
            <Text className="block text-sm text-on-surface-variant">{searchText ? '未找到匹配项目' : '暂无项目，点击右下角添加'}</Text>
          </View>
        )}
      </View>

      {/* Floating add button */}
      <View
        onClick={() => setShowAddModal(true)}
        className="fixed right-5 rounded-full bg-primary flex items-center justify-center shadow-float"
        style={{ zIndex: 50, bottom: 80, width: 52, height: 52 }}
      >
        <Plus size={24} color="#FFFFFF" />
      </View>

      {/* Full-screen Add project overlay */}
      {showAddModal && (
        <View
          className="fixed inset-0"
          style={{ zIndex: 100, backgroundColor: 'rgba(255,255,255,0.97)' }}
        >
          <View style={{ paddingTop: statusBarHeight }} className="flex items-center px-4 py-2">
            <View onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center">
              <X size={20} color="#3D3B38" />
            </View>
            <Text className="block flex-1 text-center text-base font-semibold text-on-surface pr-8">添加新项目</Text>
          </View>

          <View className="px-5 pt-6 flex flex-col gap-4">
            {/* 项目名 */}
            <View>
              <Text className="block text-xs text-on-surface-variant mb-2">项目名</Text>
              <View className="bg-surface-container rounded-2xl px-4 py-3">
                <Input
                  className="w-full text-sm text-on-surface"
                  placeholder="例如：丽江三日游"
                  value={newName}
                  onInput={e => setNewName(e.detail.value)}
                />
              </View>
            </View>

            {/* 日期选择 */}
            <View className="flex gap-3">
              <View className="flex-1">
                <Text className="block text-xs text-on-surface-variant mb-2">开始日期</Text>
                <Picker mode="date" value={newStart || todayStr} onChange={e => setNewStart(e.detail.value)}>
                  <View className="bg-surface-container rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Calendar size={14} color="#9AA5B1" />
                    <Text className="block text-sm text-on-surface">{newStart || '选择日期'}</Text>
                  </View>
                </Picker>
              </View>
              <View className="flex-1">
                <Text className="block text-xs text-on-surface-variant mb-2">结束日期</Text>
                <Picker mode="date" value={newEnd || todayStr} onChange={e => setNewEnd(e.detail.value)}>
                  <View className="bg-surface-container rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Calendar size={14} color="#9AA5B1" />
                    <Text className="block text-sm text-on-surface">{newEnd || '选择日期'}</Text>
                  </View>
                </Picker>
              </View>
            </View>

            {/* 提示 */}
            <View className="bg-surface-container rounded-2xl px-4 py-3">
              <Text className="block text-xs text-on-surface-variant">
                添加账单后，起止日期将根据账单时间自动填充
              </Text>
            </View>

            {/* 添加按钮 */}
            <View
              onClick={handleAddProject}
              className="w-full py-3 rounded-2xl bg-primary flex items-center justify-center mt-2"
            >
              <Text className="block text-sm font-semibold text-primary-foreground">添加</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
