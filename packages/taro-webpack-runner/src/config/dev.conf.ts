import { get, mapValues, merge } from 'lodash'
import * as path from 'path'

import { addLeadingSlash, addTrailingSlash, parseHtmlScript } from '../util'
import {
  getCopyWebpackPlugin,
  getDefinePlugin,
  getDevtool,
  getHtmlWebpackPlugin,
  getMainPlugin,
  getMiniCssExtractPlugin,
  getOutput,
  parseModule,
  processEnvOption
} from '../util/chain'
import { BuildConfig } from '../util/types'
import getBaseChain from './base.conf'

const emptyObj = {}

export default function (appPath: string, config: Partial<BuildConfig>): any {
  const chain = getBaseChain(appPath, config)
  const {
    alias = {},
    copy,
    entry = emptyObj,
    entryFileName = 'app',
    output = emptyObj,
    sourceRoot = 'src',
    outputRoot = 'dist',
    publicPath = '',
    staticDirectory = 'static',
    chunkDirectory = 'chunk',
    router = emptyObj,

    designWidth = 750,
    deviceRatio,
    enableSourceMap = true,
    sourceMapType,
    enableExtract = false,

    defineConstants = emptyObj,
    env = emptyObj,
    styleLoaderOption = emptyObj,
    cssLoaderOption = emptyObj,
    sassLoaderOption = emptyObj,
    lessLoaderOption = emptyObj,
    stylusLoaderOption = emptyObj,
    mediaUrlLoaderOption = emptyObj,
    fontUrlLoaderOption = emptyObj,
    imageUrlLoaderOption = emptyObj,

    miniCssExtractPluginOption = emptyObj,
    esnextModules = [],

    useHtmlComponents = false,

    postcss = emptyObj
  } = config
  const sourceDir = path.join(appPath, sourceRoot)
  const outputDir = path.join(appPath, outputRoot)
  const isMultiRouterMode = get(router, 'mode') === 'multi'

  const { rule, postcssOption } = parseModule(appPath, {
    designWidth,
    deviceRatio,
    enableExtract,
    enableSourceMap,

    styleLoaderOption,
    cssLoaderOption,
    lessLoaderOption,
    sassLoaderOption,
    stylusLoaderOption,
    fontUrlLoaderOption,
    imageUrlLoaderOption,
    mediaUrlLoaderOption,
    esnextModules,

    postcss,
    staticDirectory
  })
  const [, pxtransformOption] = postcssOption.find(([name]) => name === 'postcss-pxtransform') || []

  const plugin = {} as any

  plugin.mainPlugin = getMainPlugin({
    framework: config.framework,
    entryFileName,
    sourceDir,
    outputDir,
    routerConfig: router,
    useHtmlComponents,
    designWidth,
    deviceRatio
  })

  if (enableExtract) {
    plugin.miniCssExtractPlugin = getMiniCssExtractPlugin([
      {
        filename: 'css/[name].css',
        chunkFilename: 'css/[name].css'
      },
      miniCssExtractPluginOption
    ])
  }

  if (copy) {
    plugin.copyWebpackPlugin = getCopyWebpackPlugin({ copy, appPath })
  }

  const htmlScript = parseHtmlScript(pxtransformOption)
  if (isMultiRouterMode) {
    merge(plugin, mapValues(entry, (_filePath, entryName) => {
      return getHtmlWebpackPlugin([{
        filename: `${entryName}.html`,
        template: path.join(appPath, sourceRoot, 'index.html'),
        script: htmlScript,
        chunks: [entryName]
      }])
    }))
  } else {
    plugin.htmlWebpackPlugin = getHtmlWebpackPlugin([{
      filename: 'index.html',
      template: path.join(appPath, sourceRoot, 'index.html'),
      script: htmlScript
    }])
  }
  plugin.definePlugin = getDefinePlugin([processEnvOption(env), defineConstants])

  const mode = 'development'

  chain.merge({
    mode,
    devtool: getDevtool({ enableSourceMap, sourceMapType }),
    entry,
    output: getOutput(appPath, [{
      outputRoot,
      publicPath: addLeadingSlash(addTrailingSlash(publicPath)),
      chunkDirectory
    }, output]),
    resolve: { alias },
    module: { rule },
    plugin,
    optimization: {
      noEmitOnErrors: true,
      splitChunks: {
        chunks: 'initial',
        minSize: 0,
        cacheGroups: {
          common: {
            name: 'common',
            minChunks: 2,
            priority: 1
          },
          vendors: {
            name: 'vendors',
            minChunks: 2,
            test: module => /[\\/]node_modules[\\/]/.test(module.resource),
            priority: 10
          },
          taro: {
            name: 'taro',
            test: module => /@tarojs[\\/][a-z]+/.test(module.context),
            priority: 100
          }
        }
      }
    }
  })

  return chain
}
