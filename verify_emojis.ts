import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve('./apps/web/src/lib/emojiEmbeddings.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const badEntries = data.emojis.filter((e: string) => /[a-zA-Z]/.test(e));
console.log('Bad entries count:', badEntries.length);
console.log('Sample bad entries:', badEntries.slice(0, 10));

const goodEntries = data.emojis.filter((e: string) => !/[a-zA-Z]/.test(e));
console.log('Good entries count:', goodEntries.length);
console.log('Sample good entries:', goodEntries.slice(0, 5));
