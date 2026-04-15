const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Alias
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@': path.resolve(__dirname, 'src'),
      };
      
      // Desactivar minimización de CSS en producción
      if (env === 'production') {
        const miniCssExtractPlugin = webpackConfig.plugins.find(
          plugin => plugin.constructor.name === 'MiniCssExtractPlugin'
        );
        if (miniCssExtractPlugin) {
          miniCssExtractPlugin.options.ignoreOrder = true;
        }
        
        // Desactivar CssMinimizerPlugin
        webpackConfig.optimization.minimizer = webpackConfig.optimization.minimizer.filter(
          minimizer => minimizer.constructor.name !== 'CssMinimizerPlugin'
        );
      }
      
      return webpackConfig;
    },
  },
  style: {
    postcss: {
      mode: 'extends',
      loaderOptions: (postcssLoaderOptions) => {
        const postcssOptions = postcssLoaderOptions.postcssOptions;
        postcssOptions.plugins = [
          require('tailwindcss'),
          require('autoprefixer'),
        ];
        return postcssLoaderOptions;
      },
    },
  },
};