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

module.exports = {
    encrypt,
    decrypt
};
