import { useState, useEffect } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, Image } from '@tarojs/components';

import { Network } from '@/network';
import { ArrowLeft, User, LogOut, Settings, Map, Wallet } from 'lucide-react-taro';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  useEffect(() => {
    const info = Taro.getSystemInfoSync();
    setStatusBarHeight(info.statusBarHeight || 0);
  }, []);

  useLoad(() => {
    const getUser = async () => {
      try {
        const res = await Network.request({ url: '/api/users/me' });
        if (res.data?.data) setUser(res.data.data);
      } catch (e) {
        console.error(e);
      }
    };
    getUser();
  });

  const goBack = () => Taro.navigateBack();

  const handleLogin = () => {
    Taro.getUserProfile({
      desc: '用于展示用户昵称和头像',
      success: (res) => {
        setUser(res.userInfo);
      },
      fail: () => {
        Taro.showToast({ title: '登录失败', icon: 'none' });
      },
    });
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确定要退出吗？',
      success: (res) => {
        if (res.confirm) {
          setUser(null);
          Taro.showToast({ title: '已退出', icon: 'success' });
        }
      },
    });
  };

  return (
    <View className="flex flex-col h-full bg-background">
      <View style={{ paddingTop: statusBarHeight }} className="flex items-center px-4 py-3 bg-surface">
        <View onClick={goBack} className="w-10 h-10 flex items-center justify-center">
          <ArrowLeft size={20} color="#3D3B38" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold text-on-surface pr-10">个人信息</Text>
      </View>

      {!user && (
        <View className="flex-1 flex flex-col items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-4">
            <User size={36} color="#C4BFB8" />
          </View>
          <Text className="block text-base text-on-surface-variant mb-6">未登录</Text>
          <View onClick={handleLogin} className="w-full py-3 rounded-xl bg-primary flex items-center justify-center">
            <Text className="block text-sm font-semibold text-white">微信登录</Text>
          </View>
        </View>
      )}

      {user && (
        <>
          <View className="mx-4 mt-4 bg-surface rounded-2xl shadow-card p-6 flex flex-col items-center">
            {user.avatarUrl ? (
              <Image className="w-20 h-20 rounded-full mb-3" src={user.avatarUrl} />
            ) : (
              <View className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mb-3">
                <Text className="block text-2xl font-bold text-primary">
                  {user.nickName?.[0] || '?'}
                </Text>
              </View>
            )}
            <Text className="block text-lg font-semibold text-on-surface">{user.nickName || '用户'}</Text>
          </View>

          <View className="mx-4 mt-6 bg-surface rounded-2xl shadow-card overflow-hidden">
            <View className="flex items-center px-4 py-4 border-b border-outline-variant">
              <User size={18} color="#8A8680" />
              <Text className="block text-sm text-on-surface ml-3 flex-1">编辑资料</Text>
              <Text className="block text-sm text-on-surface-variant">{String.fromCharCode(62)}</Text>
            </View>
            <View className="flex items-center px-4 py-4 border-b border-outline-variant">
              <Map size={18} color="#8A8680" />
              <Text className="block text-sm text-on-surface ml-3 flex-1">我的项目</Text>
              <View className="bg-surface-container-high rounded-full px-2 py-1">
                <Text className="block text-xs text-primary font-bold">4</Text>
              </View>
            </View>
            <View className="flex items-center px-4 py-4 border-b border-outline-variant">
              <Wallet size={18} color="#8A8680" />
              <Text className="block text-sm text-on-surface ml-3 flex-1">分账记录</Text>
              <Text className="block text-sm text-on-surface-variant">{String.fromCharCode(62)}</Text>
            </View>
            <View className="flex items-center px-4 py-4">
              <Settings size={18} color="#8A8680" />
              <Text className="block text-sm text-on-surface ml-3 flex-1">设置</Text>
              <Text className="block text-sm text-on-surface-variant">{String.fromCharCode(62)}</Text>
            </View>
          </View>

          <View className="mt-auto p-4">
            <View
              onClick={handleLogout}
              className="w-full py-4 rounded-xl bg-surface-container flex items-center justify-center"
            >
              <LogOut size={16} color="#ef4444" />
              <Text className="block text-sm font-semibold text-red-500 ml-2">退出登录</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
