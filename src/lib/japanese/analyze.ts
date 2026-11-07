import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { IpadicFeatures, Tokenizer } from "kuromoji";
import NodeDictionaryLoader from "kuromoji/src/loader/NodeDictionaryLoader";
import KuromojiTokenizer from "kuromoji/src/Tokenizer";
import { findGrammar, type GrammarMatch } from "./grammar";

export type VocabItem = {
  /** Dạng từ điển (vd 食べる) */
  word: string;
  /** Cách đọc hiragana, chỉ có khi từ chứa kanji */
  reading?: string;
  /** Nghĩa tiếng Anh từ JMdict */
  meaning?: string;
};

/** Vị trí [start, end) của một từ vựng trong câu (mỗi lần xuất hiện một mục). */
export type VocabSpan = { start: number; end: number; word: string };

export type SentenceAnalysis = {
  vocab: VocabItem[];
  vocabSpans: VocabSpan[];
  grammar: GrammarMatch[];
  /** Vị trí ký tự bắt đầu mỗi từ (trừ từ đầu câu), để hiển thị tách từ */
  breaks: number[];
};

/**
 * Token gắn vào từ phía trước thay vì đứng riêng: đuôi chia (助動詞), hậu tố, て/で sau
 * động từ/tính từ (và ば), dấu câu. Nhờ vậy 食べ|て|い|ます thành 食べています.
 */
function attachesToPrevious(t: IpadicFeatures, prev: IpadicFeatures): boolean {
  if (t.pos === "助動詞" || t.pos === "記号") return true;
  if (t.pos_detail_1 === "接尾") return true;
  if (t.pos === "助詞" && t.pos_detail_1 === "接続助詞" && ["て", "で", "ば"].includes(t.surface_form)) {
    return prev.pos === "動詞" || prev.pos === "形容詞" || prev.pos === "助動詞";
  }
  // いる/しまう… sau て (động từ phụ) cũng là một phần của cụm động từ.
  if (t.pos === "動詞" && t.pos_detail_1 === "非自立") return true;
  return false;
}

function wordBreaks(tokens: IpadicFeatures[]): number[] {
  const breaks: number[] = [];
  for (let i = 1; i < tokens.length; i++) {
    if (!attachesToPrevious(tokens[i], tokens[i - 1])) breaks.push(tokens[i].word_position - 1);
  }
  return breaks;
}

/*
 * Dựng tokenizer bằng cách đọc từ điển ĐỒNG BỘ. kuromoji.builder() đọc file bất đồng bộ
 * và khi chạy bên trong "use cache" của Next thì từ điển bị nạp hỏng
 * ("ConnectionCosts buffer overflow"); đọc đồng bộ tránh được vấn đề này.
 */
let tokenizer: Tokenizer<IpadicFeatures> | null = null;
function getTokenizer(): Tokenizer<IpadicFeatures> {
  if (tokenizer) return tokenizer;
  const loader = new NodeDictionaryLoader(join(process.cwd(), "node_modules", "kuromoji", "dict"));
  loader.loadArrayBuffer = (file, callback) => {
    try {
      callback(null, new Uint8Array(gunzipSync(readFileSync(file))).buffer);
    } catch (e) {
      callback(e);
    }
  };
  // Mọi callback chạy đồng bộ nên load() hoàn tất ngay trong lời gọi này.
  loader.load((err, dic) => {
    if (err) throw err;
    tokenizer = new KuromojiTokenizer(dic) as Tokenizer<IpadicFeatures>;
  });
  if (!tokenizer) throw new Error("kuromoji dictionary failed to load");
  return tokenizer;
}

/** JMdict rút gọn: { [từ]: [cách đọc, nghĩa] } — tạo bằng scripts/build-dict.mjs */
let dictionary: Record<string, [string, string]> | null = null;
function lookup(word: string): [string, string] | undefined {
  dictionary ??= JSON.parse(readFileSync(join(process.cwd(), "data", "jmdict-common.json"), "utf8")).entries;
  return dictionary![word];
}

const KANJI_RE = /[一-鿿㐀-䶿々]/;
const JAPANESE_RE = /[぀-ヿ一-鿿々]/;

/** Từ quá cơ bản hoặc chỉ mang chức năng ngữ pháp — không đưa vào danh sách từ vựng. */
const STOP_WORDS = new Set([
  "する", "いる", "ある", "なる", "できる", "くる", "来る", "いく", "行く", "おる", "やる",
  "こと", "もの", "よう", "そう", "ところ", "とき", "ため", "の", "ん",
  "これ", "それ", "あれ", "どれ", "ここ", "そこ", "あそこ", "この", "その", "あの", "どの",
]);

function toHiragana(katakana: string): string {
  return katakana.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** Token có phải từ nội dung đáng học không (danh từ, động từ, tính từ, phó từ…). */
function isContentWord(t: IpadicFeatures): boolean {
  switch (t.pos) {
    case "名詞":
      return !["非自立", "数", "代名詞", "接尾", "特殊"].includes(t.pos_detail_1);
    case "動詞":
    case "形容詞":
      return t.pos_detail_1 === "自立";
    case "副詞":
    case "連体詞":
    case "接続詞":
    case "感動詞":
      return true;
    default:
      return false;
  }
}

function toVocab(t: IpadicFeatures): VocabItem | null {
  const word = t.basic_form !== "*" ? t.basic_form : t.surface_form;
  if (STOP_WORDS.has(word) || !JAPANESE_RE.test(word) || word.length < 2 && !KANJI_RE.test(word)) return null;

  const entry = lookup(word) ?? lookup(t.surface_form);
  // Từ ngoài từ điển kuromoji và JMdict: thường là tên riêng hoặc phụ đề tự động nghe sai
  // (vd ロッテ → ロテ) — không có nghĩa để học nên bỏ qua.
  if (t.basic_form === "*" && !entry) return null;
  let reading: string | undefined;
  if (KANJI_RE.test(word)) {
    reading = entry?.[0] ?? (word === t.surface_form && t.reading && t.reading !== "*" ? toHiragana(t.reading) : undefined);
  }
  return { word, reading, meaning: entry?.[1] };
}

const EMPTY: SentenceAnalysis = { vocab: [], vocabSpans: [], grammar: [], breaks: [] };

/**
 * Phân tích từng câu. Câu nào tách từ lỗi thì trả về rỗng cho câu đó và tạo lại
 * tokenizer cho lần sau; `failed` cho biết có câu lỗi để bên gọi không cache lâu.
 */
export async function analyzeSentences(
  sentences: string[],
): Promise<{ results: SentenceAnalysis[]; failed: boolean }> {
  const tk = getTokenizer();
  let failed = false;
  const results = sentences.map((text) => {
    let tokens: IpadicFeatures[];
    try {
      tokens = tk.tokenize(text);
    } catch (e) {
      console.error("kuromoji tokenize failed", JSON.stringify(text), e);
      failed = true;
      return EMPTY;
    }
    const seen = new Set<string>();
    const vocab: VocabItem[] = [];
    const vocabSpans: VocabSpan[] = [];
    for (const t of tokens) {
      if (!isContentWord(t)) continue;
      const item = toVocab(t);
      if (!item) continue;
      const start = t.word_position - 1;
      vocabSpans.push({ start, end: start + t.surface_form.length, word: item.word });
      if (!seen.has(item.word)) {
        seen.add(item.word);
        vocab.push(item);
      }
    }
    return { vocab, vocabSpans, grammar: findGrammar(tokens), breaks: wordBreaks(tokens) };
  });
  if (failed) tokenizer = null;
  return { results, failed };
}
