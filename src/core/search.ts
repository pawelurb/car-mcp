import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import OpenAI from 'openai';

import type { ManualChunk, IndexedChunk } from './types.js';

const MODEL = 'text-embedding-3-small';
const client = new OpenAI();

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    throw new Error('Wektory muszą mieć ten sam, niezerowy wymiar.');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;

    dotProduct += x * y;
    normA += x * x;
    normB += y * y;
  }

  if (normA === 0 || normB === 0) {
    throw new Error('Nie można porównać wektora zerowego.');
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchManual(question: string) {
  const configuredManualUrl = process.env.MANUAL_URL?.trim();
  const manualUrl = configuredManualUrl ? new URL(configuredManualUrl) : undefined;

  if (manualUrl && manualUrl.protocol !== 'https:' && manualUrl.protocol !== 'http:') {
    throw new Error('MANUAL_URL musi być adresem HTTP lub HTTPS.');
  }

  const chunks: ManualChunk[] = JSON.parse(await readFile('data/manual-chunks.json', 'utf8'));

  const index: IndexedChunk[] = JSON.parse(await readFile('data/embeddings-index.json', 'utf8'));

  const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));

  // Sprawdzamy indeks przed wysłaniem pytania do API.
  for (const item of index) {
    if (item.model !== MODEL || item.embedding.length !== 1536) {
      throw new Error(`Niezgodny model lub wymiar: ${item.chunkId}`);
    }

    if (!chunksById.has(item.chunkId)) {
      throw new Error(`Brak treści dla chunka: ${item.chunkId}`);
    }
  }

  const response = await client.embeddings.create({
    model: MODEL,
    input: question,
    encoding_format: 'float',
  });

  const questionEmbedding = response.data[0]?.embedding;

  if (!questionEmbedding) {
    throw new Error('API nie zwróciło embeddingu pytania.');
  }

  const results = index
    .map((item) => ({
      chunk: chunksById.get(item.chunkId)!,
      score: cosineSimilarity(questionEmbedding, item.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((result) => {
      const pageUrl = manualUrl ? new URL(manualUrl.href) : undefined;

      if (pageUrl) {
        pageUrl.hash = `page=${result.chunk.pdfPage}`;
      }

      return {
        ...result,
        sourceUrl: pageUrl?.href ?? null,
      };
    });

  return {
    results,
    tokens: response.usage.total_tokens,
  };
}
