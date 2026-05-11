export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '个人信息', navigationStyle: 'custom' })
  : { navigationBarTitleText: '个人信息', navigationStyle: 'custom' }
