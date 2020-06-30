const path = require('path');

module.exports = {
    entry: {
        render: './demo/render.js',
        sel: './demo/sel.js',
        raw: './demo/raw.js'
    },
    output: {
        path: path.resolve(__dirname, 'demo'),
        filename: '[name].bundle.js'
    },
    devServer: {
        contentBase: './demo',
        // openPage: 'render.html',
        // openPage: 'sel.html',
        openPage: 'raw.html',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    }
};
