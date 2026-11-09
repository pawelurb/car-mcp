import { createServer as createHttpServer } from 'node:http';

import { createMcpHandler } from '@modelcontextprotocol/server';
import {
  toNodeHandler,
  localhostHostValidation,
  localhostOriginValidation,
} from '@modelcontextprotocol/node';

import { createServer } from './mcp-server.js';

const handler = createMcpHandler(createServer);
const nodeHandler = toNodeHandler(handler);

const validateHost = localhostHostValidation();
const validateOrigin = localhostOriginValidation();

const httpServer = createHttpServer((req, res) => {
  if (!validateHost(req, res) || !validateOrigin(req, res)) {
    return;
  }

  const pathname = req.url?.split('?')[0];

  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
    });

    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (pathname !== '/mcp') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  if (req.method === undefined || req.url === undefined) {
    res.writeHead(400);
    res.end('Missing request method or URL');
    return;
  }

  const mcpRequest = {
    method: req.method,
    url: req.url,
    headers: req.headers,

    [Symbol.asyncIterator]() {
      return req[Symbol.asyncIterator]();
    },
  };

  void nodeHandler(mcpRequest, res);
});

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? '3000');

httpServer.listen(port, host, () => {
  console.error(`car-mcp: HTTP na http://${host}:${port}/mcp`);
});
