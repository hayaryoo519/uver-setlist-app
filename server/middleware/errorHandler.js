module.exports = (err, req, res, next) => {
    console.error('Server Error: request handling failed');
    res.status(500).json({
        message: 'Internal Server Error',
        error: 'Internal Server Error',
        stack: null
    });
};
