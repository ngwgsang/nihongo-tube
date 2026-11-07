// Module nội bộ của kuromoji (không có type chính thức) — dùng trong src/lib/japanese/analyze.ts.

declare module "kuromoji/src/loader/NodeDictionaryLoader" {
  type Callback<T> = (err: unknown, value?: T) => void;
  export default class NodeDictionaryLoader {
    constructor(dicPath: string);
    loadArrayBuffer(file: string, callback: Callback<ArrayBuffer>): void;
    load(callback: (err: unknown, dic: unknown) => void): void;
  }
}

declare module "kuromoji/src/Tokenizer" {
  export default class Tokenizer {
    constructor(dic: unknown);
  }
}
