export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '项目详情', navigationStyle: 'custom' })
  : { navigationBarTitleText: '项目详情', navigationStyle: 'custom' }
