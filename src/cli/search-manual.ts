import { searchManual } from '../core/search.js';

async function main() {
  const question = process.argv.slice(2).join(' ').trim();

  if (!question) {
    throw new Error('Podaj pytanie jako argument programu.');
  }

  const { results, tokens } = await searchManual(question);

  console.log(`Pytanie: ${question}`);
  console.log(`Tokeny embeddingu pytania: ${tokens}`);

  for (const [position, result] of results.entries()) {
    const { chunk, score } = result;

    console.log(`\nWynik ${position + 1}, podobieństwo: ${score.toFixed(4)}`);
    console.log(`ID: ${chunk.id}`);
    console.log(`Strona PDF: ${chunk.pdfPage}, drukowana: ${chunk.printedPage ?? 'brak'}`);
    if (result.sourceUrl) {
      console.log(`Źródło: ${result.sourceUrl}`);
    }
    console.log(`Ostrzeżenie w metadanych: ${chunk.containsSafetyWarning}`);
    console.log(chunk.content);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
