export default typeof definePageConfig === 'function'
  ? definePageConfig({ 
      navigationBarTitleText: 'Yoop',
      navigationStyle: 'custom',
    })
  : { 
      navigationBarTitleText: 'Yoop',
      navigationStyle: 'custom',
    }
