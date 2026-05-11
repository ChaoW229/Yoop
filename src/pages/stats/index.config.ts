export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '支出统计', navigationStyle: 'custom' })
  : { navigationBarTitleText: '支出统计', navigationStyle: 'custom' }
