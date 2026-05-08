# Yoop 设计指南

## 品牌定位
Yoop — 朋友出游后账单管理与分账工具。面向年轻朋友群体，视觉风格温馨、清爽、亲和。

## 配色方案（莫兰迪色系）

| Token | 色值 | 用途 |
|-------|------|------|
| primary | #9AA5B1 | 主色调，按钮、金额、选中态 |
| primary-foreground | #FFFFFF | 主色上的文字 |
| background | #F0EDE8 | 页面背景（暖米灰） |
| surface | #F7F5F2 | 卡片背景 |
| surface-container | #EBE8E3 | 输入框、次级容器 |
| surface-container-high | #E2DED8 | hover/激活态 |
| on-surface | #3D3B38 | 主要文字 |
| on-surface-variant | #8A8680 | 次要文字、说明 |
| outline | #C4BFB8 | 边框、分割线 |
| outline-variant | #DDD8D2 | 浅分割线 |
| error | #C4716B | 错误、删除（莫兰迪红） |

## 字体规范
- 全局字体：system-ui, -apple-system, sans-serif
- H1: text-xl font-bold
- H2: text-lg font-semibold
- Body: text-sm / text-base
- Caption: text-xs text-on-surface-variant

## 间距系统
- 页面边距：px-4（16px）
- 卡片内边距：p-4（16px）
- 组件间距：gap-3 / gap-4
- 列表项间距：py-3

## 组件使用原则
- 按钮、输入框、卡片、标签、弹窗、Toast、Tabs 等通用 UI 优先使用 `@/components/ui/*`
- 禁止用 `View/Text` 手搓上述通用组件
- 新页面先拆分 UI 单元，再映射到组件库

## 导航结构
- 首页：pages/index/index（项目列表）
- 统计：pages/stats/index
- 项目详情：pages/project/index
- 添加账单：pages/add-bill/index
- 个人信息：pages/profile/index

## 小程序约束
- 包体积优化：图片使用对象存储或 Unsplash
- 性能优先：避免大数据量渲染
- 跨端兼容：H5/小程序表现一致
