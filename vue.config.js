module.exports = {
  chainWebpack: config => {
    config.module
      .rule('raw')
      .test(/\.lean$/)
      .use('raw-loader')
      .loader('raw-loader')
      .end()
  }
}