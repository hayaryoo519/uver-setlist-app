const crypto = require('crypto');

const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');
const createToken = lifetimeMs => {
    const token = crypto.randomBytes(32).toString('hex');
    return { token, hash: hashToken(token), expires: Date.now() + lifetimeMs };
};

module.exports = { hashToken, createToken };
