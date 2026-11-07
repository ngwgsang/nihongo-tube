// Rút gọn JMdict (tiếng Anh, bản đầy đủ) thành file tra cứu nhỏ cho app.
//
// Cách dùng:
//   1. Tải jmdict-eng-*.json từ https://github.com/scriptin/jmdict-simplified/releases
//      (bản đầy đủ; bản "common" chỉ có ~1/5 số từ cũng dùng được)
//   2. node scripts/build-dict.mjs path/to/jmdict-eng-x.y.z.json
//
// Đầu ra: data/jmdict.json.gz — gzip của { dictDate, entries: { [từ]: [cách đọc, nghĩa] } }
// JMdict © EDRDG, giấy phép CC BY-SA 4.0 (https://www.edrdg.org/edrdg/licence.html).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const MAX_SENSES = 2;
const MAX_GLOSSES_PER_SENSE = 3;

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/build-dict.mjs <jmdict-eng.json>");
  process.exit(1);
}

const { words, dictDate } = JSON.parse(readFileSync(input, "utf8"));
/** key → { r: cách đọc, m: nghĩa, rank } — giữ mục có rank cao nhất cho mỗi key */
const out = {};

for (const word of words) {
  const reading = (word.kana.find((k) => k.common) ?? word.kana[0])?.text ?? "";
  const meaning = word.sense
    .slice(0, MAX_SENSES)
    .map((s) => s.gloss.slice(0, MAX_GLOSSES_PER_SENSE).map((g) => g.text).join(", "))
    .join("; ");
  if (!meaning) continue;

  // "uk" = thường viết bằng kana → khi tra bằng kana thì ưu tiên mục này.
  const usuallyKana = word.kanji.length === 0 || word.sense.some((s) => s.misc.includes("uk"));
  const forms = [
    ...word.kanji.map((k) => ({ text: k.text, common: k.common, kana: false })),
    ...word.kana.map((k) => ({ text: k.text, common: k.common, kana: true })),
  ];
  for (const form of forms) {
    // Nhiều mục trùng một cách viết (vd かける): từ thông dụng trước, rồi mục "thường viết kana".
    const rank = (form.common ? 2 : 0) + (form.kana && usuallyKana ? 1 : 0);
    const prev = out[form.text];
    if (!prev || rank > prev.rank) out[form.text] = { r: reading, m: meaning, rank };
  }
}

const compact = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [v.r, v.m]]));
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "jmdict.json.gz");
mkdirSync(dirname(dest), { recursive: true });
// Nén gzip: ~38 MB → ~8 MB (repo và bản deploy gọn hơn); app giải nén khi nạp.
writeFileSync(dest, gzipSync(JSON.stringify({ dictDate, entries: compact }), { level: 9 }));
console.log(`Wrote ${Object.keys(compact).length} entries (JMdict ${dictDate}) → ${dest}`);
