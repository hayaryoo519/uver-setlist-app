jest.mock('axios');

const axios = require('axios');
const systemOne = require('../../services/typesafeSystemOne');

describe('typesafeSystemOne', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.TYPESAFE_API_KEY;
        delete process.env.TYPE_SAFE_API_KEY;
        delete process.env.TYPESAFE_SYSTEM_ONE_URL;
        delete process.env.TYPESAFE_MODEL;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('APIキー未設定時は無効になること', () => {
        expect(systemOne.isEnabled()).toBe(false);
    });

    it('Choice質問をTypeSafe System One APIへ送信すること', async () => {
        process.env.TYPESAFE_API_KEY = 'secret';
        process.env.TYPESAFE_SYSTEM_ONE_URL = 'https://example.test/systemone';
        process.env.TYPESAFE_MODEL = 'jev-test';
        axios.post.mockResolvedValue({
            data: {
                answers: {
                    route: {
                        choice: 'actual_setlist',
                        probabilities: { actual_setlist: 0.88 },
                        confidence: 0.88,
                    },
                },
                usage: { input_tokens: 123 },
            },
        });

        const result = await systemOne.askChoice(
            'route',
            { postText: '本日のセトリ' },
            'Classify this post.',
            { actual_setlist: 'Actual setlist', unrelated: 'Unrelated' }
        );

        expect(axios.post).toHaveBeenCalledWith(
            'https://example.test/systemone',
            {
                model: 'jev-test',
                state: { postText: '本日のセトリ' },
                questions: {
                    route: {
                        type: 'choice',
                        instructions: 'Classify this post.',
                        criteria: { actual_setlist: 'Actual setlist', unrelated: 'Unrelated' },
                    },
                },
            },
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
            })
        );
        expect(result).toMatchObject({
            enabled: true,
            choice: 'actual_setlist',
            confidence: 0.88,
            usage: { input_tokens: 123 },
        });
    });

    it('answer/value形式の応答も正規化できること', () => {
        const normalized = systemOne._private.normalizeChoiceAnswer({
            answer: 'unrelated',
            probs: { unrelated: 0.77 },
        });

        expect(normalized).toEqual({
            choice: 'unrelated',
            probabilities: { unrelated: 0.77 },
            confidence: 0.77,
        });
    });
});
