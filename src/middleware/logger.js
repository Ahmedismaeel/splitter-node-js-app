const logger = (req, res, next) => {
    // Log request details
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (Object.keys(req.body).length > 0) {
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
    }

    // Capture original send and json methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Override res.send
    res.send = function (body) {
        if (!res.locals.logged) {
            console.log(`Response Status: ${res.statusCode}`);
            console.log('Response Body:', body);
            res.locals.logged = true;
        }
        return originalSend.apply(this, arguments);
    };

    // Override res.json
    res.json = function (body) {
        if (!res.locals.logged) {
            console.log(`Response Status: ${res.statusCode}`);
            console.log('Response Body:', JSON.stringify(body, null, 2));
            res.locals.logged = true;
        }
        return originalJson.apply(this, arguments);
    };

    next();
};

module.exports = logger;
