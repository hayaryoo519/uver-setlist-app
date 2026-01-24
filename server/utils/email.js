const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendVerificationEmail = async (email, token) => {
    // For dev: if credentials are dummy, log the link
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your_email')) {
        console.log('====================================================');
        console.log(`[EMAIL MOCK] Verification Link for ${email}:`);
        console.log(`http://localhost:5173/verify-email?token=${token}`);
        console.log('====================================================');
        return;
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '【UVERworld SETLIST Archive】メールアドレス認証のお願い',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
                <h2>UVERworld SETLIST Archive</h2>
                <p>アカウント登録ありがとうございます。</p>
                <p>以下のリンクをクリックして、メールアドレスの認証を完了してください。</p>
                <div style="margin: 30px 0;">
                    <a href="http://localhost:5173/verify-email?token=${token}" 
                       style="display: inline-block; background: #fbbf24; color: black; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       メールアドレスを認証する
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 0.9rem;">認証コードの有効期限が切れた場合、お手数ですが再度登録手続きをお願いいたします。</p>
                <p style="font-size: 0.9rem;">このメールはご本人様確認のため、UVERworld Setlist Archiveにご登録いただいたメールアドレス宛にお送りしております。心当たりがない場合、お手数ですがこのメールは削除ください。</p>
                <p style="font-size: 0.9rem; color: #666;">
                    このメールアドレスは配信専用です。ご返信頂いてもご返答が出来ません。ご了承ください。<br /><br />
                    これはシステム生成メッセージです。このメッセージに返信しないでください。
                </p>
                <div style="margin-top: 40px; font-size: 0.8rem; color: #888;">
                    Copyright © UVERworld Setlist Archive All rights reserved.
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
};

module.exports = { sendVerificationEmail };
