import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

import { searchManual } from '../core/search.js';

export function createServer() {
  const server = new McpServer({
    name: 'car-mcp',
    version: '1.0.0',
  });

  server.registerTool(
    'search_manual',
    {
      description:
        'Wyszukuje pięć fragmentów instrukcji samochodu. ' +
        'Zwraca treść, numery stron, podobieństwo i metadane ostrzeżeń. ' +
        'Jeśli ustawiono MANUAL_URL, sourceUrl zawiera link do właściwej strony PDF. ' +
        'Przy cytowaniu źródła podawaj printedPage jako numer strony widoczny dla użytkownika. ' +
        'pdfPage oznacza pozycję strony w pliku PDF i może różnić się od numeru drukowanego. ' +
        'Używaj sourceUrl bez zmian, ponieważ link uwzględnia pozycję strony w pliku PDF.',
      inputSchema: z.object({
        question: z
          .string()
          .trim()
          .min(1)
          .max(2000)
          .describe('Pytanie dotyczące instrukcji samochodu'),
      }),
    },
    async ({ question }) => {
      try {
        const output = await searchManual(question);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(output, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        console.error('Błąd search_manual:', error instanceof Error ? error.message : error);

        return {
          isError: true,
          content: [
            {
              type: 'text',
              text:
                'Nie udało się przeszukać instrukcji. ' +
                'Sprawdź konfigurację serwera, pliki danych i dostęp do API embeddings.',
            },
          ],
        };
      }
    },
  );

  return server;
}
