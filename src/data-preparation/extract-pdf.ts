import { readFile, writeFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { ManualPage } from '../core/types.js';

async function main() {
  const pdfBuffer = await readFile('data/manual.pdf');

  // Loads PDF document from the buffer
  const loadingTask = getDocument({
    data: new Uint8Array(pdfBuffer),
  });

  const pdf = await loadingTask.promise;

  const pages: ManualPage[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);

      const content = await page.getTextContent();

      const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');

      pages.push({
        pdfPage: pageNumber,
        printedPage: pageNumber - 1,
        content: text,
      });

      if (pageNumber % 50 === 0 || pageNumber === pdf.numPages) {
        console.log(`Przetworzono ${pageNumber}/${pdf.numPages} stron`);
      }
    }

    const emptyPages = pages.filter((page) => page.content.trim().length === 0);

    console.log(`Wszystkich stron: ${pages.length}`);
    console.log(`Pustych stron: ${emptyPages.length}`);

    const numberOnlyPages = pages.filter((page) => /^\d+$/.test(page.content.trim()));

    console.log(
      'Strony PDF zawierające tylko numer:',
      numberOnlyPages.map((page) => page.pdfPage),
    );

    await writeFile('data/manual-pages.json', JSON.stringify(pages, null, 2), 'utf8');
  } finally {
    await loadingTask.destroy();
  }
}

main().catch(console.error);
