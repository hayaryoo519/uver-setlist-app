const crypto = require('crypto');

/**
 * リフレッシュトークンなどの機密情報を暗号化・復号するためのユーティリティ
 * アルゴリズム: AES-256-GCM
 */

const ALGORITHM = 'aes-256-gcm';
// .env から取得。32バイトの16進数文字列（64文字）を想定
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

/**
 * テキストを暗号化する
 * @param {string} text 
 * @returns {string} v1:iv:authTag:encrypted
 */
function encrypt(text) {
    if (!ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY is not set in environment variables');
    }
    
    const iv = crypto.randomBytes(12); // GCM推奨の12バイト
    const cipher = crypto.createCipheriv(
        ALGORITHM, 
        Buffer.from(ENCRYPTION_KEY, 'hex'), 
        iv
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // 将来のキーローテーションに対応するためバージョン(v1)を付与
    return `v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * 暗号化されたテキストを復号する
 * @param {string} encryptedText 
 * @returns {string}
 */
function decrypt(encryptedText) {
    if (!ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY is not set in environment variables');
    }

    const parts = encryptedText.split(':');
    const version = parts[0];
    
    if (version !== 'v1') {
        throw new Error(`Unsupported encryption version: ${version}`);
    }

    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];

    const decipher = crypto.createDecipheriv(
        ALGORITHM, 
        Buffer.from(ENCRYPTION_KEY, 'hex'), 
        iv
    );
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

/**
 * OAuth state パラメータに HMAC 署名を付与し改ざん検知を可能にする
 * @param {string|number} userId
 * @returns {string} base64url_payload.hmac_signature
 */
function signState(userId) {
    if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is not set in environment variables');
    const nonce = crypto.randomBytes(8).toString('hex');
    const payload = Buffer.from(JSON.stringify({ userId, nonce })).toString('base64url');
    const sig = crypto.createHmac('sha256', Buffer.from(ENCRYPTION_KEY, 'hex'))
        .update(payload).digest('hex').slice(0, 16);
    return `${payload}.${sig}`;
}

/**
 * HMAC 署名を検証して userId を返す
 * @param {string} state
 * @returns {string} userId
 */
function verifyState(state) {
    if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is not set in environment variables');
    if (!state || !state.includes('.')) throw new Error('Invalid state format');
    const dotIdx = state.lastIndexOf('.');
    const payload = state.slice(0, dotIdx);
    const sig = state.slice(dotIdx + 1);
    const expectedSig = crypto.createHmac('sha256', Buffer.from(ENCRYPTION_KEY, 'hex'))
        .update(payload).digest('hex').slice(0, 16);
    if (sig !== expectedSig) throw new Error('Invalid state signature');
    try {
        return String(JSON.parse(Buffer.from(payload, 'base64url').toString()).userId);
    } catch {
        throw new Error('Failed to parse state payload');
    }
}

module.exports = { encrypt, decrypt, signState, verifyState };
