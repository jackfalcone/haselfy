module.exports = function override(config, env) {
  if (process.env.NODE_ENV === 'development') {
    config.plugins.forEach(plugin => {
      if (plugin.constructor.name === 'HtmlWebpackPlugin') {
        plugin.options.template = './public/index.dev.html';
      }
    });
  }
  return config;
}