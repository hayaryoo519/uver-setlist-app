-- Guestユーザー作成用SQL (修正版)
-- gen_random_bytesの代わりに標準関数を使用

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE email = 'guest@example.com') THEN
        UPDATE users 
        SET 
            password = '$2b$10$tseHV8yBH7sNQjqd8PLjBe4Nawh40UuKfmsdBP9./Ji97hExjur7y',
            role = 'user',
            is_verified = TRUE
        WHERE email = 'guest@example.com';
        RAISE NOTICE 'Guest User updated.';
    ELSE
        INSERT INTO users (username, email, password, role, is_verified, verification_token)
        VALUES (
            'guest',
            'guest@example.com',
            '$2b$10$tseHV8yBH7sNQjqd8PLjBe4Nawh40UuKfmsdBP9./Ji97hExjur7y',
            'user',
            TRUE,
            -- gen_random_bytesの代わりにMD5(乱数)を使用
            md5(random()::text || clock_timestamp()::text)
        );
        RAISE NOTICE 'Guest User created.';
    END IF;
END $$;
