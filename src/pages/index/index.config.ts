export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationStyle: 'custom',
      navigationBarTitleText: '',
    })
  : {
      navigationStyle: 'custom',
      navigationBarTitleText: '',
    }
