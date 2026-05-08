export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '添加花费' })
  : { navigationBarTitleText: '添加花费' }
