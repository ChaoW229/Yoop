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

  const handleChangeCover = async (_projectId: string) => {
    // Stop propagation so card click doesn't fire
    const isMiniApp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === Taro.ENV_TYPE.TT;
    if (isMiniApp) {
      try {
        const res = await Taro.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
        });
        if (res.tempFiles && res.tempFiles.length > 0) {
          const tempFile = res.tempFiles[0];
          const uploadRes = await Network.uploadFile({
            url: '/api/upload',
            filePath: tempFile.tempFilePath,
            name: 'file',
          });
          console.log('cover upload result', uploadRes);
          Taro.showToast({ title: '封面已更新', icon: 'success' });
          fetchProjects();
        }
      } catch (e) {
        console.error('choose cover error', e);
        Taro.showToast({ title: '选择失败', icon: 'none' });
      }
    } else {
      Taro.showToast({ title: '请在小程序中使用', icon: 'none' });
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
      <View
        style={{ paddingTop: statusBarHeight }}
        className="px-4 pt-3 pb-2 flex items-center gap-3 bg-white"
      >
        <View
          onClick={goStats}
          className="w-10 h-10 rounded-full bg-[#F0EDE8] flex items-center justify-center"
          style={{ boxShadow: '0 2px 8px rgba(154,165,177,0.15)' }}
        >
          <ChartPie size={18} color="#9AA5B1" />
        </View>
        <View
          className="flex-1 h-10 bg-[#F7F5F2] rounded-full flex items-center px-4"
          style={{ boxShadow: 'inset 0 1px 3px rgba(154,165,177,0.1)' }}
          onClick={() => setIsSearching(true)}
        >
          <Search size={14} color="#9B9690" />
          {isSearching ? (
            <View className="flex-1 ml-2">
              <Input
                className="border-0 bg-transparent shadow-none ring-0 focus-within:ring-0 focus-within:border-0 h-8 text-sm text-[#3D3B38]"
                placeholder="搜索项目"
                focus={isSearching}
                value={searchText}
                onInput={e => setSearchText(e.detail.value)}
                onBlur={() => { if (!searchText) setIsSearching(false); }}
              />
            </View>
          ) : (
            <Text className="block text-sm text-[#9B9690] ml-2">搜索项目</Text>
          )}
        </View>
        <View
          onClick={goProfile}
          className="w-10 h-10 rounded-full bg-[#F0EDE8] flex items-center justify-center"
          style={{ boxShadow: '0 2px 8px rgba(154,165,177,0.15)' }}
        >
          <User size={18} color="#9AA5B1" />
        </View>
      </View>

      {/* Project List */}
      <View className="flex-1 px-4 pb-3">
        <Text className="block text-lg font-semibold text-[#3D3B38] mb-2">我的项目</Text>
        {loading && (
          <View className="flex items-center justify-center py-10">
            <Text className="block text-sm text-[#9B9690]">加载中...</Text>
          </View>
        )}
        {filteredProjects.map((p) => (
          <View
            key={p.id}
            onClick={() => goProject(p.id)}
            className="flex bg-[#FAFAF8] rounded-2xl mb-3 overflow-hidden"
            style={{
              border: '1px solid #E0DCD7',
              boxShadow: '0 4px 16px rgba(154,165,177,0.10)',
            }}
          >
            {/* Left: Cover image */}
            <View
              className="w-24 h-24 rounded-l-2xl flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ backgroundColor: p.cover_url ? 'transparent' : getCoverColor(p.id) }}
              onClick={(e) => {
                e.stopPropagation();
                handleChangeCover(p.id);
              }}
            >
              {p.cover_url ? (
                <Image
                  className="w-full h-full"
                  src={p.cover_url}
                  mode="aspectFill"
                />
              ) : (
                <Text className="block text-lg font-bold text-white">{p.name ? p.name[0] : 'T'}</Text>
              )}
            </View>
            {/* Right: Info */}
            <View className="flex-1 p-3 flex flex-col justify-between">
              <View>
                <Text className="block text-base font-semibold text-[#3D3B38]">{p.name}</Text>
                <Text className="block text-xs text-[#9B9690] mt-1">
                  {p.start_date || '待定'} ~ {p.end_date || '待定'}
                </Text>
              </View>
              <View className="flex items-center justify-between">
                <View className="flex gap-1">
                  {(p.participants || []).slice(0, 3).map((name, i) => (
                    <View
                      key={i}
                      className="w-5 h-5 rounded-full bg-[#F0EDE8] flex items-center justify-center"
                    >
                      <Text className="block text-xs text-[#9AA5B1]">{name[0]}</Text>
                    </View>
                  ))}
                </View>
                <Text className="block text-base font-bold text-[#9AA5B1]">
                  ¥{Number(p.total_amount || 0).toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        ))}
        {!loading && filteredProjects.length === 0 && (
          <View className="flex flex-col items-center justify-center py-12">
            <Text className="block text-sm text-[#9B9690]">
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
          width: 52,
          height: 52,
          backgroundColor: '#9AA5B1',
          boxShadow: '0 6px 20px rgba(154,165,177,0.45)',
        }}
      >
        <Plus size={24} color="#FFFFFF" />
      </View>

      {/* Full-screen Add project overlay */}
      {showAddModal && (
        <View className="fixed inset-0" style={{ zIndex: 100, backgroundColor: 'rgba(255,255,255,0.97)' }}>
          <View style={{ paddingTop: statusBarHeight }} className="flex items-center px-4 py-2">
            <View onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center">
              <X size={20} color="#9AA5B1" />
            </View>
            <Text className="block flex-1 text-center text-base font-semibold text-[#3D3B38] pr-8">添加新项目</Text>
          </View>

          <View className="px-5 pt-4 flex flex-col gap-4">
            {/* 项目名 */}
            <View>
              <Text className="block text-xs text-[#9B9690] mb-2">项目名</Text>
              <View className="bg-[#F7F5F2] rounded-2xl px-4 py-3" style={{ border: '1px solid #DDD8D2' }}>
                <Input
                  className="w-full text-sm text-[#3D3B38]"
                  placeholder="例如：丽江三日游"
                  value={newName}
                  onInput={e => setNewName(e.detail.value)}
                />
              </View>
            </View>

            {/* 日期选择 */}
            <View className="flex gap-3">
              <View className="flex-1">
                <Text className="block text-xs text-[#9B9690] mb-2">开始日期</Text>
                <Picker mode="date" value={newStart || todayStr} onChange={e => setNewStart(e.detail.value)}>
                  <View
                    className="bg-[#F7F5F2] rounded-2xl px-4 py-3 flex items-center gap-2"
                    style={{ border: '1px solid #DDD8D2' }}
                  >
                    <Calendar size={14} color="#9AA5B1" />
                    <Text className="block text-sm text-[#3D3B38]">{newStart || '选择日期'}</Text>
                  </View>
                </Picker>
              </View>
              <View className="flex-1">
                <Text className="block text-xs text-[#9B9690] mb-2">结束日期</Text>
                <Picker mode="date" value={newEnd || todayStr} onChange={e => setNewEnd(e.detail.value)}>
                  <View
                    className="bg-[#F7F5F2] rounded-2xl px-4 py-3 flex items-center gap-2"
                    style={{ border: '1px solid #DDD8D2' }}
                  >
                    <Calendar size={14} color="#9AA5B1" />
                    <Text className="block text-sm text-[#3D3B38]">{newEnd || '选择日期'}</Text>
                  </View>
                </Picker>
              </View>
            </View>

            {/* 提示 */}
            <View className="bg-[#F0EDE8] rounded-2xl px-4 py-3">
              <Text className="block text-xs text-[#9B9690]">
                添加账单后，起止日期将根据账单时间自动填充
              </Text>
            </View>

            {/* 添加按钮 */}
            <View
              onClick={handleAddProject}
              className="w-full py-3 rounded-2xl flex items-center justify-center mt-1"
              style={{ backgroundColor: '#9AA5B1', boxShadow: '0 4px 12px rgba(154,165,177,0.3)' }}
            >
              <Text className="block text-sm font-semibold text-white">添加</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
