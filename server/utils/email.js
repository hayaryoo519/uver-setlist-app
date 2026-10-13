const nodemailer = require('nodemailer');
require('dotenv').config({ quiet: true });
const { getEmailConfiguration } = require('./emailConfiguration');

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const getDeliveryConfiguration = () => {
    try { return getEmailConfiguration(); }
    catch (err) {
        console.error('Email delivery configuration invalid');
        throw err;
    }
};

const sendVerificationEmail = async (email, token) => {
    // Missing/dummy credentials skip delivery without exposing the verification link.
    const configuration = getDeliveryConfiguration();
    const appUrl = configuration.appUrl;
    
    if (!configuration.enabled) {
        console.log('[EMAIL MOCK] Verification email skipped: email credentials are not configured');
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
                    <a href="${appUrl}/verify-email?token=${token}" 
                       style="display: inline-block; background: #fbbf24; color: black; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       メールアドレスを認証する
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 0.9rem;">この認証リンクの有効期限は24時間です。</p>
                <p style="font-size: 0.9rem;">期限切れやメールが届かない場合は、ログイン画面の「認証メールが届かない・期限が切れた場合」から再送を依頼してください。再送後は最新のリンクをお使いください。</p>
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
        console.log('Verification email sent');
    } catch (error) {
        console.error('Verification email send failed');
        throw error;
    }
};

const sendPasswordResetEmail = async (email, token) => {
    const configuration = getDeliveryConfiguration();
    const appUrl = configuration.appUrl;
    
    // Missing/dummy credentials skip delivery without exposing the reset link.
    if (!configuration.enabled) {
        console.log('[EMAIL MOCK] Password reset email skipped: email credentials are not configured');
        return;
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '【UVERworld SETLIST Archive】パスワード再設定のお願い',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
                <h2>UVERworld SETLIST Archive</h2>
                <p>パスワード再設定のリクエストをいただきました。</p>
                <p>以下のリンクをクリックして、新しいパスワードの設定を完了してください。</p>
                <div style="margin: 30px 0;">
                    <a href="${appUrl}/reset-password?token=${token}" 
                       style="display: inline-block; background: #fbbf24; color: black; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                       パスワードを再設定する
                    </a>
                </div>
                <p>※このリンクの有効期限は1時間です。期限が切れた場合は、再度リクエストを行ってください。</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 0.9rem;">このメールはご本人様確認のため、UVERworld Setlist Archiveにご登録いただいたメールアドレス宛にお送りしております。心当たりがない場合、第三者が誤って入力した可能性があります。その場合は、お手数ですがこのメールを削除してください。現在のパスワードが無効になることはありません。</p>
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
        console.log('Password reset email sent');
    } catch (error) {
        console.error('Password reset email send failed');
        throw error;
    }
};

const sendEmailChangeConfirmation = async (email, token) => {
    const configuration = getDeliveryConfiguration();
    if (!configuration.enabled) {
        console.log('[EMAIL MOCK] Email change confirmation skipped: email credentials are not configured');
        return;
    }
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: '【UVERworld SETLIST Archive】メールアドレス変更の確認',
            html: `<p>メールアドレス変更の依頼を受け付けました。</p><p><a href="${configuration.appUrl}/confirm-email-change?token=${token}">メールアドレスの変更を確認する</a></p><p>有効期限は1時間です。確認が完了するまで現在のメールアドレスは変更されません。確認後は新しいメールアドレスで再度ログインしてください。</p><p>心当たりがない場合はこのメールを削除してください。</p>`
        });
        console.log('Email change confirmation sent');
    } catch (err) {
        console.error('Email change confirmation send failed');
        throw err;
    }
};

const verifyEmailConnection = async () => {
    const configuration = getDeliveryConfiguration();
    if (!configuration.enabled) throw new Error('Email delivery is disabled');
    await transporter.verify();
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendEmailChangeConfirmation, verifyEmailConnection };
