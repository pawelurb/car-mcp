import 'dotenv/config';

import { createHash } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import OpenAI from 'openai';

import type { ManualChunk, IndexedChunk } from '../core/types.js';

const MODEL = 'text-embedding-3-small';

const BATCH_SIZE = 20;

const INDEX_PATH = 'data/embeddings-index.json';

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function loadIndex(): Promise<IndexedChunk[]> {
  try {
    const file = await readFile(INDEX_PATH, 'utf8');

    return JSON.parse(file) as IndexedChunk[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

const file = await readFile('data/manual-chunks.json', 'utf8');

const chunks: ManualChunk[] = JSON.parse(file);

const selectedChunks = chunks;

const existingIndex = await loadIndex();

const indexed = new Map<string, IndexedChunk>(
  existingIndex.filter((item) => item.model === MODEL).map((item) => [item.chunkId, item]),
);

// Wybieramy tylko nowe lub zmienione chunki
const pendingChunks = selectedChunks.filter((chunk) => {
  const existing = indexed.get(chunk.id);

  return (
    !existing ||
    existing.contentHash !== hashContent(chunk.content) ||
    existing.embedding.length !== 1536
  );
});

console.log(`Chunków do sprawdzenia: ${selectedChunks.length}`);
console.log(`Chunków do wygenerowania: ${pendingChunks.length}`);

const client = new OpenAI();

let totalTokens = 0;

for (let i = 0; i < pendingChunks.length; i += BATCH_SIZE) {
  const batch = pendingChunks.slice(i, i + BATCH_SIZE);

  console.log(`\nPrzetwarzam partię ${Math.floor(i / BATCH_SIZE) + 1}`);

  const response = await client.embeddings.create({
    model: MODEL,
    input: batch.map((chunk) => chunk.content),
    encoding_format: 'float',
  });

  if (response.data.length !== batch.length) {
    throw new Error('Nie otrzymano wszystkich embeddings');
  }

  for (const item of response.data) {
    const chunk = batch[item.index];

    if (!chunk || item.embedding.length !== 1536) {
      throw new Error('Nieprawidłowa odpowiedź API');
    }

    indexed.set(chunk.id, {
      chunkId: chunk.id,
      model: MODEL,
      contentHash: hashContent(chunk.content),
      embedding: item.embedding,
    });
  }

  totalTokens += response.usage.total_tokens;

  // Zapisujemy checkpoint po każdej partii
  const temporaryPath = `${INDEX_PATH}.tmp`;

  await writeFile(temporaryPath, JSON.stringify([...indexed.values()]), 'utf8');

  await rename(temporaryPath, INDEX_PATH);

  console.log(`Zapisano embeddings: ${indexed.size}`);
}

console.log('\n--- PODSUMOWANIE ---');

console.log(`Embeddings w indeksie: ${indexed.size}`);
console.log(`Nowo wygenerowane: ${pendingChunks.length}`);
console.log(`Tokeny w tym uruchomieniu: ${totalTokens}`);
