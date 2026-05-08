import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Image } from '@tarojs/components';
import { Network } from '@/network';
import { ChartPie, User, Search } from 'lucide-react-taro';

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

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await Network.request({ url: '/api/projects' });
      console.log('projects res', res.data);
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
          <Text className="block text-sm text-on-surface-variant">搜索旅行项目</Text>
        </View>
        <View
          onClick={goProfile}
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center"
        >
          <User size={20} color="#9AA5B1" />
        </View>
      </View>

      <View className="flex-1 px-4 py-4">
        <Text className="block text-lg font-semibold text-on-surface mb-4">我的旅行</Text>
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
                <Text className="block text-lg font-bold text-primary">¥{p.total_amount}</Text>
              </View>
            </View>
          </View>
        ))}
        {loading && (
          <View className="flex items-center justify-center py-12">
            <Text className="block text-sm text-on-surface-variant">加载中...</Text>
          </View>
        )}
      </View>
    </View>
  );
}
