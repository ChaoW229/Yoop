export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '个人信息' })
  : { navigationBarTitleText: '个人信息' }
