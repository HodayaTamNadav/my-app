const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        '/api/boi',
        createProxyMiddleware({
            target: 'https://boi.org.il',
            changeOrigin: true,
        })
    );
    
    app.use(
        '/api/edge',
        createProxyMiddleware({
            target: 'https://edge.boi.gov.il',
            changeOrigin: true,
        })
    );
};
