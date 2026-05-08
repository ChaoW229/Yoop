export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '支出统计' })
  : { navigationBarTitleText: '支出统计' }
