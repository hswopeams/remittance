const webpack = require('webpack')

module.exports = {
    entry: "./app/js/app.js",
    output: {
        path: __dirname + "/build/app/js",
        filename: "app.js"
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [ "style-loader", "css-loader" ]
            }
        ]
    },
    resolve: {
        fallback: {
            "os": require.resolve("os-browserify/browser"),
            "https": require.resolve("https-browserify"),
            "http": require.resolve("stream-http"),
            "crypto": require.resolve("crypto-browserify"),
            "util": require.resolve("util/"),
            "stream": require.resolve("stream-browserify")
        }
    },
    experiments: {
        topLevelAwait: true
    },
    plugins: [
        // fix "process is not defined" error:
        new webpack.ProvidePlugin({
          process: 'process/browser',
        }),
      ]
};