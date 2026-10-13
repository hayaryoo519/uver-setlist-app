const http = require('http');
const axios = require('axios');

describe('Axios更新後の外部通信と安全性', () => {
    let server;
    let baseUrl;
    let redirectedRequests;

    beforeAll(async () => {
        server = http.createServer((req, res) => {
            if (req.url === '/redirect') {
                res.writeHead(302, { Location: '/destination' });
                return res.end();
            }
            if (req.url === '/destination') redirectedRequests++;
            if (req.url === '/slow') return;
            if (req.url === '/failure') {
                res.writeHead(503);
                return res.end('unavailable');
            }
            if (req.url === '/html') return res.end('<html>fixture</html>');
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ method: req.method, body, type: req.headers['content-type'] }));
            });
        });
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterAll(async () => {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    });

    it('JSON POSTの本文とHTTPメソッドを維持する', async () => {
        const response = await axios.post(baseUrl, { question: 'fixture' }, { proxy: false });
        expect(response.data.method).toBe('POST');
        expect(JSON.parse(response.data.body)).toEqual({ question: 'fixture' });
        expect(response.data.type).toBe('application/json');
    });

    it('OAuthのURLSearchParamsフォーム送信を維持する', async () => {
        const response = await axios.post(baseUrl, new URLSearchParams({ grant_type: 'refresh_token', refresh_token: 'fixture' }), { proxy: false });
        expect(response.data.method).toBe('POST');
        expect(response.data.body).toBe('grant_type=refresh_token&refresh_token=fixture');
        expect(response.data.type).toContain('application/x-www-form-urlencoded');
    });

    it('スケジュール取得のHTML応答を維持する', async () => {
        const response = await axios.get(`${baseUrl}/html`, { proxy: false, responseType: 'text' });
        expect(response.data).toBe('<html>fixture</html>');
    });

    it('HTTP失敗は従来どおりrejectする', async () => {
        await expect(axios.get(`${baseUrl}/failure`, { proxy: false })).rejects.toMatchObject({ response: { status: 503 } });
    });

    it('タイムアウトはrejectする', async () => {
        await expect(axios.get(`${baseUrl}/slow`, { proxy: false, timeout: 50 })).rejects.toMatchObject({ code: 'ECONNABORTED' });
    });

    it('fetchアダプターもmaxRedirects=0で転送先へ到達しない', async () => {
        redirectedRequests = 0;
        await expect(axios.get(`${baseUrl}/redirect`, { adapter: 'fetch', maxRedirects: 0 })).rejects.toBeDefined();
        expect(redirectedRequests).toBe(0);
    });

    it('継承されたmethodを既定GETとして使用しない', async () => {
        const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'method');
        let pending;
        try {
            Object.defineProperty(Object.prototype, 'method', { value: 'DELETE', configurable: true });
            pending = axios.request({
                url: 'http://fixture.invalid/',
                adapter: config => Promise.resolve({ data: config.method, status: 200, statusText: 'OK', headers: {}, config }),
            });
        } finally {
            if (previous) Object.defineProperty(Object.prototype, 'method', previous);
            else delete Object.prototype.method;
        }
        expect((await pending).data).toBe('get');
    });
});
