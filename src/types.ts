export interface ManualPage {
  pdfPage: number;
  printedPage: number;
  content: string;
}

export interface ManualChunk {
  id: string;
  pdfPage: number;
  printedPage: number;
  content: string;
  containsSafetyWarning: boolean;
}

export interface EmbeddedChunk {
  chunkId: string;
  model: string;
  embedding: number[];
}

export interface IndexedChunk extends EmbeddedChunk {
  contentHash: string;
}
