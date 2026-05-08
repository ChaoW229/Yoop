export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '项目详情' })
  : { navigationBarTitleText: '项目详情' }
