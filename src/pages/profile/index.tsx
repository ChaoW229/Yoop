import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Map, Wallet, Settings, ChevronRight } from 'lucide-react-taro';
import Taro from '@tarojs/taro';

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState<any>(null);

  const goBack = () => Taro.navigateBack();

  const handleLogin = () => {
    Taro.getUserProfile({
      desc: '用于展示用户信息',
      success: (res) => {
        console.log('user profile', res);
        setUserInfo(res.userInfo);
      },
      fail: (err) => {
        console.error('login fail', err);
        // Fallback: mock login
        setUserInfo({
          nickName: '小初',
          avatarUrl: '',
        });
      },
    });
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          setUserInfo(null);
        }
      },
    });
  };

  const menuItems = [
    { icon: Settings, label: '编辑资料' },
    { icon: Map, label: '我的旅行项目', badge: '3' },
    { icon: Wallet, label: '分账记录' },
    { icon: Settings, label: '设置' },
  ];

  return (
    <View className="flex flex-col min-h-full bg-background">
      <View className="flex items-center px-4 py-3 bg-surface">
        <View onClick={goBack} className="w-10 h-10 flex items-center justify-center">
          <ArrowLeft size={20} color="#3D3B38" />
        </View>
        <Text className="block flex-1 text-center text-base font-semibold text-on-surface pr-10">
          个人信息
        </Text>
      </View>

      <View className="px-4 py-4 flex flex-col items-center">
        {userInfo ? (
          <>
            <View className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center">
              {userInfo.avatarUrl ? (
                <Text>头像</Text>
              ) : (
                <Text className="block text-2xl font-bold text-primary">
                  {(userInfo.nickName || '用')[0]}
                </Text>
              )}
            </View>
            <Text className="block text-lg font-semibold text-on-surface mt-3">
              {userInfo.nickName || '用户'}
            </Text>
          </>
        ) : (
          <>
            <View className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">
              <Text className="block text-2xl text-on-surface-variant">?</Text>
            </View>
            <Text className="block text-sm text-on-surface-variant mt-3">未登录</Text>
            <View className="mt-4 w-full">
              <Button
                onClick={handleLogin}
                className="bg-primary text-white rounded-xl py-3 w-full"
              >
                微信一键登录
              </Button>
            </View>
          </>
        )}
      </View>

      {userInfo && (
        <>
          <View className="mx-4 bg-surface rounded-2xl shadow-card overflow-hidden">
            {menuItems.map((item, i) => (
              <View
                key={i}
                className={`flex items-center px-4 py-4 ${
                  i < menuItems.length - 1 ? 'border-b border-outline-variant' : ''
                }`}
              >
                <item.icon size={18} color="#8A8680" className="mr-3" />
                <Text className="block flex-1 text-sm text-on-surface">{item.label}</Text>
                {item.badge && (
                  <View className="bg-surface-container-high rounded-full px-2 py-1 mr-2">
                    <Text className="block text-xs text-primary font-bold">{item.badge}</Text>
                  </View>
                )}
                <ChevronRight size={16} color="#8A8680" />
              </View>
            ))}
          </View>

          <View className="mt-auto p-4">
            <View
              onClick={handleLogout}
              className="w-full py-4 rounded-xl bg-surface-container flex items-center justify-center"
            >
              <Text className="block text-sm font-semibold text-error">退出登录</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
