jest.mock('https', () => ({ request: jest.fn() }));

const { EventEmitter } = require('events');

describe('LINE通知のログ保護', () => {
    const marker = 'private-line@example.invalid Bearer fixture-token';
    const savedToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const savedUser = process.env.LINE_USER_ID;
    let notifications;
    let logSpy;
    let errorSpy;
    let warnSpy;
    let response;
    let outgoing;

    beforeEach(() => {
        jest.resetModules();
        process.env.LINE_CHANNEL_ACCESS_TOKEN = marker;
        process.env.LINE_USER_ID = 'fixture-recipient';
        notifications = require('../../utils/lineNotification');
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        // resetModules後のhttpsモックを使う。
        require('https').request.mockImplementation((_options, callback) => {
            response = new EventEmitter();
            response.statusCode = 200;
            response.resume = jest.fn();
            outgoing = new EventEmitter();
            outgoing.write = jest.fn();
            outgoing.end = jest.fn();
            callback(response);
            return outgoing;
        });
    });

    afterEach(() => {
        expect(JSON.stringify([...logSpy.mock.calls, ...errorSpy.mock.calls, ...warnSpy.mock.calls])).not.toContain(marker);
        logSpy.mockRestore();
        errorSpy.mockRestore();
        warnSpy.mockRestore();
        if (savedToken === undefined) delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
        else process.env.LINE_CHANNEL_ACCESS_TOKEN = savedToken;
        if (savedUser === undefined) delete process.env.LINE_USER_ID;
        else process.env.LINE_USER_ID = savedUser;
    });

    async function send(kind) {
        if (kind === 'ドラフト追加通知') {
            await notifications.notifyDraftAdded({ source: 'manual', parsed_json: [{ position: 1, title: 'CORE PRIDE' }] });
        } else {
            await notifications.notifyDraftsCollected({ date: '2026-10-13', venue: '会場' }, [{ id: 5, parsed_json: [] }]);
        }
    }

    it.each(['ドラフト追加通知', '収集まとめ通知'])('%sの送信内容と成功ログを保持する', async kind => {
        await send(kind);
        response.emit('end');

        expect(response.resume).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith(`[LINE] ${kind}を送信しました。`);
        expect(errorSpy).not.toHaveBeenCalled();
        const body = JSON.parse(outgoing.write.mock.calls[0][0]);
        expect(body.to).toBe('fixture-recipient');
        expect(body.messages[0].text).toContain('/admin/drafts');
        expect(outgoing.end).toHaveBeenCalledTimes(1);
    });

    it.each(['ドラフト追加通知', '収集まとめ通知'])('%sの失敗応答本文を保存・出力しない', async kind => {
        await send(kind);
        response.statusCode = 401;
        response.emit('data', Buffer.from(marker));
        response.emit('end');

        expect(response.listenerCount('data')).toBe(0);
        expect(response.resume).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith('[LINE] 通知失敗 (status: 401): 詳細は非表示');
    });

    it('非同期の接続エラー詳細を出さない', async () => {
        await send('ドラフト追加通知');
        expect(() => outgoing.emit('error', new Error(marker))).not.toThrow();
        expect(errorSpy).toHaveBeenCalledWith('[LINE] 通知送信中にエラーが発生しました: 詳細は非表示');
    });

    it('同期の要求エラーも固定ログにし呼び出し元を止めない', async () => {
        require('https').request.mockImplementationOnce(() => { throw new Error(marker); });
        await expect(send('ドラフト追加通知')).resolves.toBeUndefined();
        expect(errorSpy).toHaveBeenCalledWith('[LINE] 通知処理中に致命的なエラーが発生しました: 詳細は非表示');
    });

    it('未設定なら従来どおり送信をスキップする', async () => {
        jest.resetModules();
        delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
        notifications = require('../../utils/lineNotification');
        await send('ドラフト追加通知');
        expect(require('https').request).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledTimes(1);
    });
});
