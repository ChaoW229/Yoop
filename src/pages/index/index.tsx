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

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await Network.request({ url: '/api/projects' });
      console.log('journeys res', res.data);
      setProjects(res.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useLoad(() => {
    fetchProjects();
  });

  useEffect(() => {
    if (!loading && projects.length === 0) {
      seedData();
    }
  }, [loading]);

  const seedData = async () => {
    const seeds = [
      { name: '丽江三日游', destination: '丽江古城', start_date: '2024.03.15', end_date: '2024.03.17', participants: ['小明', '小红', '自己'] },
      { name: '青岛海滨之旅', destination: '青岛', start_date: '2024.05.01', end_date: '2024.05.03', participants: ['小明', '小红'] },
      { name: '成都美食行', destination: '成都', start_date: '2024.06.10', end_date: '2024.06.12', participants: ['小明', '自己'] },
    ];
    for (const s of seeds) {
      await Network.request({ url: '/api/projects', method: 'POST', data: s });
    }
    fetchProjects();
  };

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
      Taro.showToast({ title: '请填写旅程名与远方', icon: 'none' });
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
          participants: ['自己'],
        },
      });
      setShowAddModal(false);
      setNewName('');
      setNewDest('');
      setNewStart('');
      setNewEnd('');
      fetchProjects();
      Taro.showToast({ title: '新旅程已启程', icon: 'success' });
    } catch (e) {
      console.error(e);
      Taro.showToast({ title: '启程失败', icon: 'none' });
    }
  };

  return (
    <View className="flex flex-col min-h-full bg-background">
      <View className="flex items-center gap-3 px-4 py-3 bg-surface">
        <View
          onClick={goStats}
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center"
        >
          <ChartPie size={20} color="#9AA5B1" />
        </View>
        <View className="flex-1 flex items-center gap-2 bg-surface-container rounded-full px-4 py-2">
          <Search size={16} color="#8A8680" />
          <Text className="block text-sm text-on-surface-variant">寻一段旅途</Text>
        </View>
        <View
          onClick={goProfile}
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center"
        >
          <User size={20} color="#9AA5B1" />
        </View>
      </View>

      <View className="flex-1 px-4 py-4">
        <Text className="block text-lg font-semibold text-on-surface mb-4">我的足迹</Text>
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
        <View className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center" style={{ zIndex: 100 }}>
          <View className="w-full bg-surface rounded-t-3xl p-6">
            <View className="flex items-center justify-between mb-6">
              <Text className="block text-lg font-semibold text-on-surface">开启新旅程</Text>
              <View onClick={() => setShowAddModal(false)}>
                <X size={24} color="#8A8680" />
              </View>
            </View>

            <View className="flex flex-col gap-4 mb-6">
              <View>
                <Text className="block text-sm text-on-surface mb-2">旅程名</Text>
                <View className="bg-surface-container rounded-xl px-4 py-3">
                  <Text
                    className="block text-sm text-on-surface"
                    onClick={() => {
                      (Taro as any).showModal({
                        title: '旅程名',
                        editable: true,
                        placeholderText: '例如：丽江三日游',
                        success: (res: any) => {
                          if (res.confirm && res.content) setNewName(res.content);
                        },
                      });
                    }}
                  >
                    {newName || '请输入旅程名'}
                  </Text>
                </View>
              </View>

              <View>
                <Text className="block text-sm text-on-surface mb-2">远方</Text>
                <View className="bg-surface-container rounded-xl px-4 py-3">
                  <Text
                    className="block text-sm text-on-surface"
                    onClick={() => {
                      (Taro as any).showModal({
                        title: '远方',
                        editable: true,
                        placeholderText: '例如：丽江古城',
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

              <View className="flex gap-3">
                <View className="flex-1">
                  <Text className="block text-sm text-on-surface mb-2">启程</Text>
                  <View
                    className="bg-surface-container rounded-xl px-4 py-3"
                    onClick={() => {
                      (Taro as any).showModal({
                        title: '启程日期',
                        editable: true,
                        placeholderText: '2024.03.15',
                        success: (res: any) => {
                          if (res.confirm && res.content) setNewStart(res.content);
                        },
                      });
                    }}
                  >
                    <Text className="block text-sm text-on-surface">{newStart || '选择日期'}</Text>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="block text-sm text-on-surface mb-2">归程</Text>
                  <View
                    className="bg-surface-container rounded-xl px-4 py-3"
                    onClick={() => {
                      (Taro as any).showModal({
                        title: '归程日期',
                        editable: true,
                        placeholderText: '2024.03.17',
                        success: (res: any) => {
                          if (res.confirm && res.content) setNewEnd(res.content);
                        },
                      });
                    }}
                  >
                    <Text className="block text-sm text-on-surface">{newEnd || '选择日期'}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View
              onClick={handleAddProject}
              className="w-full bg-primary rounded-xl py-4 flex items-center justify-center"
            >
              <Text className="block text-sm font-semibold text-white">启程</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
