// Rút gọn JMdict (bản "common", tiếng Anh) thành file tra cứu nhỏ cho app.
//
// Cách dùng:
//   1. Tải jmdict-eng-common-*.json từ https://github.com/scriptin/jmdict-simplified/releases
//   2. node scripts/build-dict.mjs path/to/jmdict-eng-common-x.y.z.json
//
// Đầu ra: data/jmdict-common.json — { [từ]: [cách đọc, nghĩa] }
// JMdict © EDRDG, giấy phép CC BY-SA 4.0 (https://www.edrdg.org/edrdg/licence.html).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_SENSES = 2;
const MAX_GLOSSES_PER_SENSE = 3;

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/build-dict.mjs <jmdict-eng-common.json>");
  process.exit(1);
}

const { words, dictDate } = JSON.parse(readFileSync(input, "utf8"));
const out = {};

for (const word of words) {
  const reading = (word.kana.find((k) => k.common) ?? word.kana[0])?.text ?? "";
  const meaning = word.sense
    .slice(0, MAX_SENSES)
    .map((s) => s.gloss.slice(0, MAX_GLOSSES_PER_SENSE).map((g) => g.text).join(", "))
    .join("; ");
  if (!meaning) continue;

  // "uk" = thường viết bằng kana → cho phép tra bằng kana đè lên mục khác cùng cách đọc.
  const usuallyKana = word.kanji.length === 0 || word.sense.some((s) => s.misc.includes("uk"));
  const keys = [
    ...word.kanji.filter((k) => k.common).map((k) => k.text),
    ...word.kana.filter((k) => k.common).map((k) => k.text),
  ];
  for (const key of keys) {
    const isKana = word.kana.some((k) => k.text === key);
    if (!out[key] || (isKana && usuallyKana && !out[key].uk)) {
      out[key] = { r: reading, m: meaning, uk: isKana && usuallyKana };
    }
  }
}

const compact = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [v.r, v.m]]));
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "jmdict-common.json");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify({ dictDate, entries: compact }));
console.log(`Wrote ${Object.keys(compact).length} entries (JMdict ${dictDate}) → ${dest}`);
