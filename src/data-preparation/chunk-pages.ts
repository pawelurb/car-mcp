import { readFile, writeFile } from 'node:fs/promises';
import type { ManualPage, ManualChunk } from '../core/types.js';

function countWords(text?: string): number {
  return text?.trim().split(/\s+/).filter(Boolean).length || 0;
}

function containsSafetyWarning(text: string): boolean {
  const warningKeywords = ['ZAGROŻENIE', 'NIEBEZPIECZEŃSTWO', 'OSTRZEŻENIE'];

  return warningKeywords.some((keyword) => text.includes(keyword));
}

function chunkPage(page: ManualPage, chunkSize = 120, overlap = 25): ManualChunk[] {
  if (chunkSize <= 0 || overlap < 0 || overlap >= chunkSize) {
    throw new Error('Nieprawidłowe parametry chunkingu');
  }

  const segmenter = new Intl.Segmenter('pl', {
    granularity: 'sentence',
  });

  const sentences = [...segmenter.segment(page.content)]
    .map((item) => item.segment.trim())
    .filter(Boolean);

  const chunks: ManualChunk[] = [];

  let start = 0;

  while (start < sentences.length) {
    let end = start;
    let wordCount = 0;

    // Zbieramy całe zdania do osiągnięcia limitu
    while (end < sentences.length) {
      const sentenceWords = countWords(sentences[end]);

      if (wordCount + sentenceWords > chunkSize && end > start) {
        break;
      }

      wordCount += sentenceWords;
      end++;

      if (wordCount >= chunkSize) {
        break;
      }
    }

    const chunkSentences = sentences.slice(start, end);
    const chunkContent = chunkSentences.join(' ');

    chunks.push({
      id: `page-${page.pdfPage}-chunk-${chunks.length + 1}`,
      pdfPage: page.pdfPage,
      printedPage: page.printedPage,
      content: chunkContent,
      containsSafetyWarning: containsSafetyWarning(chunkContent),
    });

    if (end >= sentences.length) {
      break;
    }

    // Wyznaczamy overlap na podstawie całych zdań
    let nextStart = end;
    let overlapWords = 0;

    while (nextStart > start + 1 && overlapWords < overlap) {
      nextStart--;
      overlapWords += countWords(sentences[nextStart]);
    }

    start = nextStart;
  }

  return chunks;
}

// 1. Wczytujemy wszystkie strony instrukcji
const file = await readFile('data/manual-pages.json', 'utf8');

const pages: ManualPage[] = JSON.parse(file);

// 2. Przygotowujemy tablicę na wszystkie chunki
const allChunks: ManualChunk[] = [];

let skippedPages = 0;

// 3. Przetwarzamy kolejne strony
for (const page of pages) {
  // Pomijamy strony zawierające wyłącznie numer
  if (/^\d+$/.test(page.content.trim())) {
    skippedPages++;
    continue;
  }

  // Dzielimy stronę na chunki
  const chunks = chunkPage(page, 120, 25);

  // Dodajemy chunki do wspólnej tablicy
  allChunks.push(...chunks);

  // Wyświetlamy postęp
  if (page.pdfPage % 50 === 0) {
    console.log(`Przetworzono stronę ${page.pdfPage}`);
  }
}

// 4. Zapisujemy chunki do pliku JSON
await writeFile('data/manual-chunks.json', JSON.stringify(allChunks, null, 2), 'utf8');

// 5. Wyświetlamy podsumowanie
console.log('\n--- PODSUMOWANIE ---');

console.log(`Wszystkich stron: ${pages.length}`);

console.log(`Pominiętych stron: ${skippedPages}`);

console.log(`Wygenerowanych chunków: ${allChunks.length}`);

const warningChunks = allChunks.filter((chunk) => chunk.containsSafetyWarning);

console.log(`Chunków z ostrzeżeniami: ${warningChunks.length}`);

const uniquePages = new Set(allChunks.map((chunk) => chunk.pdfPage));

console.log(`Stron reprezentowanych w chunkach: ${uniquePages.size}`);
