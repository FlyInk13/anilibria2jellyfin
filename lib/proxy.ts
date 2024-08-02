import https from 'node:https';

export const proxy = (method: string, hostname: string, path: string, res: any) => {
    const proxyRequest = https.request({
        hostname: hostname,
        method: method,
        path: path,
        rejectUnauthorized: false
    });

    proxyRequest.on('response', (proxyResponse) => {
        res.status(proxyResponse.statusCode);

        Object.entries(proxyResponse.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
        });

        proxyResponse.on('data', (chunk) => {
            res.write(chunk);
        }).on('end', () => {
            res.end();
        }).on('error', () => {
            res.end();
        });
    });

    proxyRequest.end()
}