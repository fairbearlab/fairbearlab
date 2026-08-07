import { readFile, writeFile } from 'node:fs/promises';

const readmePath = new URL('../README.md', import.meta.url);
const fallbackReadingPath = new URL('../data/reading.json', import.meta.url);
const sourceUrl = process.env.READING_SOURCE_URL;

function asReadingItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.reading)) {
    return payload.reading;
  }

  throw new Error('Reading source must be an array or an object with a reading array.');
}

async function loadReading() {
  if (sourceUrl) {
    const response = await fetch(sourceUrl, {
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${sourceUrl}: ${response.status} ${response.statusText}`);
    }

    return asReadingItems(await response.json());
  }

  return asReadingItems(JSON.parse(await readFile(fallbackReadingPath, 'utf8')));
}

function renderItem(item) {
  if (!item?.title) {
    throw new Error(`Reading item is missing a title: ${JSON.stringify(item)}`);
  }

  const title = item.url ? `[${item.title}](${item.url})` : item.title;
  return item.author ? `- ${title} - ${item.author}` : `- ${title}`;
}

function replaceMarkedSection(readme, renderedReading) {
  const start = '<!-- READING_START -->';
  const end = '<!-- READING_END -->';
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);

  if (!pattern.test(readme)) {
    throw new Error(`README is missing ${start} and ${end} markers.`);
  }

  return readme.replace(pattern, `${start}\n${renderedReading}\n${end}`);
}

const reading = await loadReading();
const renderedReading = reading.map(renderItem).join('\n');
const readme = await readFile(readmePath, 'utf8');
const nextReadme = replaceMarkedSection(readme, renderedReading);

if (nextReadme !== readme) {
  await writeFile(readmePath, nextReadme);
}
