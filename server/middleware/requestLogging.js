const methods = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

module.exports = (req, res, next) => {
    res.once('finish', () => {
        // Registered route patterns are safe to record; actual URLs and headers are not.
        console.log(`[${new Date().toISOString()}]`, {
            method: methods.has(req.method) ? req.method : 'OTHER',
            route: typeof req.route?.path === 'string' ? req.route.path : '<unmatched>',
            status: res.statusCode
        });
    });
    next();
};
