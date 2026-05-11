export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '添加花费', navigationStyle: 'custom' })
  : { navigationBarTitleText: '添加花费', navigationStyle: 'custom' }
