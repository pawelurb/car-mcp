import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createServer } from './mcp-server.js';

void serveStdio(createServer);
console.error('car-mcp: serwer uruchomiony przez stdio');
