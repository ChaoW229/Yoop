export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: 'Yoop' })
  : { navigationBarTitleText: 'Yoop' }
