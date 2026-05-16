import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Image } from '@tarojs/components';
import { Network } from '@/network';
import { ChartPie, User, Search, Plus, X } from 'lucide-react-taro';

interface Project {
  id: string;
  name: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  total_amount: string;
  participants?: string[];
}

export default function IndexPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDest, setNewDest] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
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
    if (!newName || !newDest) {
      Taro.showToast({ title: '请填写项目名和目的地', icon: 'none' });
      return;
    }
    try {
      await Network.request({
        url: '/api/projects',
        method: 'POST',
        data: {
          name: newName,
          destination: newDest,
          startDate: newStart,
          endDate: newEnd,
          participants: ['小明', '小红'],
        },
      });
      Taro.showToast({ title: '新项目已添加', icon: 'success' });
      setShowAddModal(false);
      setNewName('');
      setNewDest('');
      setNewStart('');
      setNewEnd('');
      fetchProjects();
    } catch (e) {
      Taro.showToast({ title: '添加失败', icon: 'none' });
    }
  };

  return (
    <View className="flex flex-col h-full bg-background">
      {/* Header with status bar padding */}
      <View style={{ paddingTop: statusBarHeight }} className="px-4 pt-4 pb-3 flex items-center gap-3 bg-surface">
        <View onClick={goStats} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
          <ChartPie size={20} color="#9AA5B1" />
        </View>
        <View className="flex-1 h-10 bg-surface-container rounded-full flex items-center px-4">
          <Search size={16} color="#9AA5B1" />
          <Text className="block text-sm text-on-surface-variant ml-2">搜索项目</Text>
        </View>
        <View onClick={goProfile} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
          <User size={20} color="#9AA5B1" />
        </View>
      </View>

      <View className="flex-1 px-4 py-4">
        <Text className="block text-lg font-semibold text-on-surface mb-4">我的项目</Text>
        {loading && <Text className="block text-sm text-on-surface-variant">加载中...</Text>}
        {projects.map((p) => (
          <View
            key={p.id}
            onClick={() => goProject(p.id)}
            className="flex bg-surface rounded-2xl shadow-card mb-4 overflow-hidden"
          >
            <Image
              className="w-28 h-28 rounded-l-2xl"
              src={`https://picsum.photos/seed/${p.id}/200/200`}
              mode="aspectFill"
            />
            <View className="flex-1 p-4 flex flex-col justify-between">
              <View>
                <Text className="block text-base font-semibold text-on-surface">{p.name}</Text>
                <Text className="block text-xs text-on-surface-variant mt-1">
                  {p.start_date} - {p.end_date}
                </Text>
              </View>
              <View className="flex items-center justify-between">
                <View className="flex gap-1">
                  {(p.participants || []).map((name, i) => (
                    <View
                      key={i}
                      className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center"
                    >
                      <Text className="block text-xs text-primary">{name[0]}</Text>
                    </View>
                  ))}
                </View>
                <Text className="block text-lg font-bold text-primary">
                  ¥{Number(p.total_amount || 0).toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Floating add button */}
      <View
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-float"
        style={{ zIndex: 50 }}
      >
        <Plus size={28} color="#fff" />
      </View>

      {/* Add project modal */}
      {showAddModal && (
        <View
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View className="w-full bg-surface rounded-t-3xl p-6">
            <View className="flex items-center justify-between mb-6">
              <Text className="block text-lg font-semibold text-on-surface">添加新项目</Text>
              <View onClick={() => setShowAddModal(false)}>
                <X size={24} color="#8A8680" />
              </View>
            </View>

            <View className="flex flex-col gap-4 mb-6">
              <View>
                <Text className="block text-sm text-on-surface-variant mb-2">项目名</Text>
                <View className="bg-surface-container rounded-xl px-4 py-3">
                  <Text
                    className="block text-sm text-on-surface"
                    onClick={() => {
                      (Taro as any).showModal({
                        title: '项目名',
                        editable: true,
                        placeholderText: '例如：丽江三日游',
                        success: (res: any) => {
                          if (res.confirm && res.content) setNewName(res.content);
                        },
                      });
                    }}
                  >
                    {newName || '请输入项目名'}
                  </Text>
                </View>
              </View>

              <View>
                <Text className="block text-sm text-on-surface-variant mb-2">目的地</Text>
                <View className="bg-surface-container rounded-xl px-4 py-3">
                  <Text
                    className="block text-sm text-on-surface"
                    onClick={() => {
                      (Taro as any).showModal({
                        title: '目的地',
                        editable: true,
                        placeholderText: '例如：云南',
                        success: (res: any) => {
                          if (res.confirm && res.content) setNewDest(res.content);
                        },
                      });
                    }}
                  >
                    {newDest || '请输入目的地'}
                  </Text>
                </View>
              </View>

              <View className="flex gap-4">
                <View className="flex-1">
                  <Text className="block text-sm text-on-surface-variant mb-2">开始日期</Text>
                  <View className="bg-surface-container rounded-xl px-4 py-3">
                    <Text
                      className="block text-sm text-on-surface"
                      onClick={() => {
                        (Taro as any).showModal({
                          title: '开始日期',
                          editable: true,
                          placeholderText: '2024-03-15',
                          success: (res: any) => {
                            if (res.confirm) setNewStart(res.content);
                          },
                        });
                      }}
                    >
                      {newStart || '选择日期'}
                    </Text>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="block text-sm text-on-surface-variant mb-2">结束日期</Text>
                  <View className="bg-surface-container rounded-xl px-4 py-3">
                    <Text
                      className="block text-sm text-on-surface"
                      onClick={() => {
                        (Taro as any).showModal({
                          title: '结束日期',
                          editable: true,
                          placeholderText: '2024-03-17',
                          success: (res: any) => {
                            if (res.confirm) setNewEnd(res.content);
                          },
                        });
                      }}
                    >
                      {newEnd || '选择日期'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="flex gap-3">
              <View
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-xl bg-surface-container flex items-center justify-center"
              >
                <Text className="block text-sm font-semibold text-on-surface">取消</Text>
              </View>
              <View
                onClick={handleAddProject}
                className="flex-1 py-3 rounded-xl bg-primary flex items-center justify-center"
              >
                <Text className="block text-sm font-semibold text-white">添加</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
