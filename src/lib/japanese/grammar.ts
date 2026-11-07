/*
 * Nhận diện mẫu ngữ pháp bằng luật trên chuỗi token của kuromoji (IPADIC).
 * Mỗi mẫu gồm một hoặc nhiều "chuỗi" token cần khớp liên tiếp.
 * Không phụ thuộc server-only để có thể chạy thử trực tiếp bằng node.
 */

import type { IpadicFeatures } from "kuromoji";

export type JlptLevel = "N5" | "N4" | "N3" | "N2";

/** Điều kiện cho một token. Mảng = khớp một trong các giá trị. */
type TokenMatcher = {
  /** surface_form */
  s?: string[];
  /** basic_form */
  b?: string[];
  /** basic_form KHÔNG được thuộc danh sách này */
  nb?: string[];
  /** pos (品詞) */
  p?: string;
  /** pos_detail_1 */
  p1?: string;
  /** conjugated_form, so khớp tiền tố (vd "仮定" khớp 仮定形, 仮定縮約１) */
  f?: string[];
  /** Token tuỳ chọn, có thể vắng mặt */
  opt?: true;
};

type GrammarRule = {
  id: string;
  pattern: string;
  meaning: string;
  level: JlptLevel;
  sequences: TokenMatcher[][];
};

const V: TokenMatcher = { p: "動詞" };
const TE: TokenMatcher = { s: ["て", "で"], p1: "接続助詞" };
const PAST: TokenMatcher = { b: ["た"], p: "助動詞" };
const GOOD: TokenMatcher = { b: ["いい", "よい", "良い"] };
const aux = (...b: string[]): TokenMatcher => ({ b, p1: "非自立" });

const RULES: GrammarRule[] = [
  // ── N5 ──
  {
    id: "te-iru",
    pattern: "〜ている",
    meaning: "Đang ~ / trạng thái kết quả của hành động",
    level: "N5",
    sequences: [
      [V, TE, { b: ["いる"], p: "動詞" }],
      [V, aux("てる", "でる")],
      // Văn nói rơi い: なってます, 見てた
      [V, TE, { b: ["ます", "た"], p: "助動詞" }],
    ],
  },
  {
    id: "te-kudasai",
    pattern: "〜てください",
    meaning: "Hãy ~ (yêu cầu lịch sự)",
    level: "N5",
    sequences: [[{ p: "動詞", p1: "自立" }, TE, { s: ["ください", "下さい"] }]],
  },
  {
    id: "naide-kudasai",
    pattern: "〜ないでください",
    meaning: "Xin đừng ~",
    level: "N5",
    sequences: [[{ b: ["ない"], f: ["連用デ接続"] }, { s: ["で"] }, { s: ["ください", "下さい"] }]],
  },
  { id: "tai", pattern: "〜たい", meaning: "Muốn ~", level: "N5", sequences: [[V, { b: ["たい"], p: "助動詞" }]] },
  {
    id: "mashou",
    pattern: "〜ましょう",
    meaning: "Cùng ~ nào / hãy ~ (rủ rê, đề nghị)",
    level: "N5",
    sequences: [[{ b: ["ます"], f: ["未然ウ接続"] }, { b: ["う"] }]],
  },
  {
    id: "masen-ka",
    pattern: "〜ませんか",
    meaning: "~ không? (lời mời)",
    level: "N5",
    sequences: [[{ b: ["ます"], f: ["未然形"] }, { s: ["ん"] }, { s: ["か"] }]],
  },
  {
    id: "deshou",
    pattern: "〜でしょう / 〜だろう",
    meaning: "Có lẽ ~ / ~ nhỉ (phỏng đoán, xác nhận)",
    level: "N5",
    sequences: [[{ b: ["です", "だ"], f: ["未然形"] }, { b: ["う"] }]],
  },
  {
    id: "ta-koto-ga-aru",
    pattern: "〜たことがある",
    meaning: "Đã từng ~",
    level: "N5",
    sequences: [[PAST, { s: ["こと"] }, { s: ["が", "は", "も"], opt: true }, { b: ["ある"] }]],
  },
  {
    id: "ta-koto-ga-nai",
    pattern: "〜たことがない",
    meaning: "Chưa từng ~",
    level: "N5",
    sequences: [[PAST, { s: ["こと"] }, { s: ["が", "は", "も"] }, { b: ["ない"] }]],
  },
  {
    id: "nagara",
    pattern: "〜ながら",
    meaning: "Vừa ~ vừa ~",
    level: "N5",
    sequences: [[V, { s: ["ながら"], p1: "接続助詞" }]],
  },
  {
    id: "tari",
    pattern: "〜たり〜たりする",
    meaning: "Lúc thì ~ lúc thì ~ (liệt kê hành động)",
    level: "N5",
    sequences: [[{ s: ["たり", "だり"], p1: "並立助詞" }]],
  },
  {
    id: "kara",
    pattern: "〜から",
    meaning: "Vì ~ (nêu lý do)",
    level: "N5",
    sequences: [[{ s: ["から"], p1: "接続助詞" }]],
  },
  {
    id: "kedo",
    pattern: "〜けど / 〜が",
    meaning: "Nhưng ~ / ~ thế nhưng",
    level: "N5",
    sequences: [[{ s: ["けど", "けれど", "けれども", "が"], p1: "接続助詞" }]],
  },
  {
    id: "mae-ni",
    pattern: "〜前に",
    meaning: "Trước khi ~",
    level: "N5",
    sequences: [[{ p: "動詞", f: ["基本形"] }, { s: ["前"] }, { s: ["に"] }]],
  },
  {
    id: "ta-ato-de",
    pattern: "〜た後で",
    meaning: "Sau khi ~",
    level: "N5",
    sequences: [[PAST, { s: ["後", "あと"] }, { s: ["で", "に"] }]],
  },
  {
    id: "te-kara",
    pattern: "〜てから",
    meaning: "Sau khi ~ rồi mới",
    level: "N5",
    sequences: [[V, TE, { s: ["から"] }]],
  },
  {
    id: "ni-iku",
    pattern: "〜に行く / 〜に来る",
    meaning: "Đi / đến để ~",
    level: "N5",
    sequences: [[{ p: "動詞", f: ["連用形"] }, { s: ["に"] }, { b: ["行く", "いく", "来る", "くる"] }]],
  },
  {
    id: "ga-hoshii",
    pattern: "〜が欲しい",
    meaning: "Muốn có ~",
    level: "N5",
    sequences: [[{ s: ["が"] }, { b: ["欲しい", "ほしい"], p1: "自立" }]],
  },
  { id: "dake", pattern: "〜だけ", meaning: "Chỉ ~", level: "N5", sequences: [[{ s: ["だけ"], p1: "副助詞" }]] },
  {
    id: "mashou-ka",
    pattern: "〜ましょうか",
    meaning: "~ nhé? (đề nghị giúp / rủ)",
    level: "N5",
    sequences: [[{ b: ["ます"], f: ["未然ウ接続"] }, { b: ["う"] }, { s: ["か"] }]],
  },
  { id: "toki", pattern: "〜とき", meaning: "Khi ~", level: "N5", sequences: [[{ s: ["とき", "時"], p1: "非自立" }]] },
  { id: "yori", pattern: "〜より", meaning: "Hơn ~ (so sánh)", level: "N5", sequences: [[{ s: ["より"], p1: "格助詞" }]] },
  { id: "ichiban", pattern: "〜一番", meaning: "~ nhất", level: "N5", sequences: [[{ s: ["一番", "いちばん"] }]] },
  {
    id: "naru",
    pattern: "〜くなる / 〜になる",
    meaning: "Trở nên ~",
    level: "N5",
    sequences: [
      [{ p: "形容詞", f: ["連用テ接続"] }, { b: ["なる"] }],
      [{ p1: "形容動詞語幹" }, { s: ["に"] }, { b: ["なる"] }],
      [{ p: "名詞", p1: "一般" }, { s: ["に"] }, { b: ["なる"] }],
      [{ p: "名詞", p1: "サ変接続" }, { s: ["に"] }, { b: ["なる"] }],
    ],
  },
  {
    id: "naide",
    pattern: "〜ないで",
    meaning: "Không ~ mà ~",
    level: "N5",
    sequences: [[{ b: ["ない"], f: ["連用デ接続"] }, { s: ["で"] }]],
  },

  // ── N4 ──
  {
    id: "te-mo-ii",
    pattern: "〜てもいい",
    meaning: "~ cũng được (cho phép)",
    level: "N4",
    sequences: [[TE, { s: ["も"] }, GOOD]],
  },
  {
    id: "nakute-mo-ii",
    pattern: "〜なくてもいい",
    meaning: "Không ~ cũng được",
    level: "N4",
    sequences: [[{ s: ["なく"] }, TE, { s: ["も"] }, GOOD]],
  },
  {
    id: "te-wa-ikenai",
    pattern: "〜てはいけない",
    meaning: "Không được ~ (cấm đoán)",
    level: "N4",
    sequences: [
      [TE, { s: ["は"] }, { b: ["いける", "なる"] }],
      [{ s: ["ちゃ", "じゃ"], p1: "接続助詞" }, { b: ["いける", "なる", "だめ", "ダメ"] }],
    ],
  },
  {
    id: "hou-ga-ii",
    pattern: "〜たほうがいい",
    meaning: "Nên ~ (khuyên)",
    level: "N4",
    sequences: [[{ s: ["ほう", "方"] }, { s: ["が"] }, GOOD]],
  },
  {
    id: "nakereba-naranai",
    pattern: "〜なければならない",
    meaning: "Phải ~",
    level: "N4",
    sequences: [
      [{ b: ["ない"], f: ["仮定形"] }, { s: ["ば"] }, { b: ["なる", "いける"] }],
      [{ s: ["なきゃ", "なくちゃ"] }],
      [{ b: ["ない"], f: ["仮定縮約"] }],
      [{ s: ["なく"] }, TE, { s: ["は"] }, { b: ["いける", "なる"] }],
      [{ b: ["ない"], f: ["基本形"] }, { s: ["と"] }, { b: ["いける", "だめ", "ダメ"] }],
    ],
  },
  {
    id: "te-shimau",
    pattern: "〜てしまう / 〜ちゃう",
    meaning: "~ mất rồi / lỡ ~ (hoàn tất, tiếc nuối)",
    level: "N4",
    sequences: [[TE, { b: ["しまう"] }], [aux("ちゃう", "じゃう")]],
  },
  {
    id: "te-oku",
    pattern: "〜ておく",
    meaning: "~ sẵn / ~ trước (chuẩn bị)",
    level: "N4",
    sequences: [[TE, aux("おく")], [aux("とく", "どく")]],
  },
  { id: "te-miru", pattern: "〜てみる", meaning: "Thử ~", level: "N4", sequences: [[TE, aux("みる")]] },
  {
    id: "te-iku",
    pattern: "〜ていく",
    meaning: "~ dần (từ nay về sau) / ~ rồi đi",
    level: "N4",
    sequences: [[TE, aux("いく", "行く")]],
  },
  {
    id: "te-kuru",
    pattern: "〜てくる",
    meaning: "~ dần (đến nay) / ~ rồi quay lại",
    level: "N4",
    sequences: [[TE, aux("くる", "来る")]],
  },
  {
    id: "te-ageru",
    pattern: "〜てあげる",
    meaning: "Làm ~ cho người khác",
    level: "N4",
    sequences: [[TE, aux("あげる", "やる", "差し上げる")]],
  },
  {
    id: "te-kureru",
    pattern: "〜てくれる",
    meaning: "(Ai đó) làm ~ cho mình",
    level: "N4",
    sequences: [[TE, aux("くれる", "くださる", "下さる")]],
  },
  {
    id: "te-morau",
    pattern: "〜てもらう",
    meaning: "Được (ai đó) làm ~ cho",
    level: "N4",
    sequences: [[TE, aux("もらう", "いただく", "頂く")]],
  },
  {
    id: "te-hoshii",
    pattern: "〜てほしい",
    meaning: "Muốn (ai đó) ~",
    level: "N4",
    sequences: [[TE, aux("ほしい", "欲しい")]],
  },
  { id: "te-mo", pattern: "〜ても", meaning: "Dù ~ cũng", level: "N4", sequences: [[TE, { s: ["も"] }]] },
  {
    id: "ba",
    pattern: "〜ば",
    meaning: "Nếu ~ (điều kiện)",
    level: "N4",
    sequences: [[{ f: ["仮定形"] }, { s: ["ば"], p1: "接続助詞" }]],
  },
  {
    id: "ba-yokatta",
    pattern: "〜ばよかった",
    meaning: "Giá mà ~ thì tốt (hối tiếc)",
    level: "N4",
    sequences: [[{ f: ["仮定形"] }, { s: ["ば"] }, { b: ["よい", "いい", "良い"], f: ["連用タ接続"] }]],
  },
  {
    id: "tara",
    pattern: "〜たら",
    meaning: "Nếu / khi ~",
    level: "N4",
    sequences: [[{ s: ["たら", "だら"], p: "助動詞" }]],
  },
  {
    id: "nara",
    pattern: "〜なら",
    meaning: "Nếu (là) ~ thì",
    level: "N4",
    sequences: [[{ s: ["なら"], p: "助動詞" }]],
  },
  {
    id: "to-joken",
    pattern: "〜と (điều kiện)",
    meaning: "Hễ ~ thì ~",
    level: "N4",
    sequences: [[{ f: ["基本形"] }, { s: ["と"], p1: "接続助詞" }]],
  },
  {
    id: "you-ni-naru",
    pattern: "〜ようになる",
    meaning: "Trở nên (có thể) ~ / bắt đầu ~",
    level: "N4",
    sequences: [[{ s: ["よう"] }, { s: ["に"] }, { b: ["なる"] }]],
  },
  {
    id: "you-ni-suru",
    pattern: "〜ようにする",
    meaning: "Cố gắng ~",
    level: "N4",
    sequences: [[{ s: ["よう"] }, { s: ["に"] }, { b: ["する"] }]],
  },
  {
    id: "you-ni",
    pattern: "〜ように",
    meaning: "Để ~ / sao cho ~",
    level: "N4",
    sequences: [[{ s: ["よう"], p1: "非自立" }, { s: ["に"] }]],
  },
  {
    id: "you-da",
    pattern: "〜ようだ",
    meaning: "Hình như ~ (phán đoán)",
    level: "N4",
    sequences: [[{ s: ["よう"], p1: "非自立" }, { b: ["だ", "です"] }]],
  },
  {
    id: "sou-yotai",
    pattern: "〜そう (dáng vẻ)",
    meaning: "Trông có vẻ ~ / sắp ~",
    level: "N4",
    sequences: [[{ s: ["そう"], p1: "接尾" }]],
  },
  {
    id: "sou-denbun",
    pattern: "〜そうだ (truyền đạt)",
    meaning: "Nghe nói ~",
    level: "N4",
    sequences: [[{ s: ["そう"], p1: "特殊" }, { b: ["だ", "です"] }]],
  },
  {
    id: "rashii",
    pattern: "〜らしい",
    meaning: "Nghe nói / có vẻ ~",
    level: "N4",
    sequences: [[{ b: ["らしい"], p: "助動詞" }]],
  },
  { id: "mitai", pattern: "〜みたい", meaning: "Hình như / giống như ~", level: "N4", sequences: [[{ s: ["みたい"] }]] },
  { id: "hazu", pattern: "〜はず", meaning: "Chắc chắn là ~ (theo lẽ)", level: "N4", sequences: [[{ s: ["はず", "筈"] }]] },
  {
    id: "kamoshirenai",
    pattern: "〜かもしれない",
    meaning: "Có lẽ ~",
    level: "N4",
    sequences: [[{ s: ["かも"] }, { b: ["しれる", "知れる"], opt: true }]],
  },
  {
    id: "ukemi",
    pattern: "Thể bị động 〜れる/られる",
    meaning: "Bị / được ~ (cũng có thể là thể khả năng, tôn kính)",
    level: "N4",
    sequences: [[{ p: "動詞", p1: "自立", f: ["未然"] }, { b: ["れる", "られる"], p1: "接尾" }]],
  },
  {
    id: "shieki",
    pattern: "Thể sai khiến 〜せる/させる",
    meaning: "Bắt / cho phép (ai đó) ~",
    level: "N4",
    sequences: [[{ b: ["せる", "させる"], p1: "接尾" }]],
  },
  {
    id: "you-to-omou",
    pattern: "〜(よ)うと思う",
    meaning: "Định ~",
    level: "N4",
    sequences: [[{ p: "動詞", f: ["未然"] }, { b: ["う", "よう"], p: "助動詞" }, { s: ["と"] }, { b: ["思う", "おもう"] }]],
  },
  {
    id: "you-to-suru",
    pattern: "〜(よ)うとする",
    meaning: "Định / sắp sửa ~",
    level: "N4",
    sequences: [[{ p: "動詞", f: ["未然"] }, { b: ["う", "よう"], p: "助動詞" }, { s: ["と"] }, { b: ["する"] }]],
  },
  { id: "tsumori", pattern: "〜つもり", meaning: "Định ~ / dự định", level: "N4", sequences: [[{ s: ["つもり"] }]] },
  { id: "sugiru", pattern: "〜すぎる", meaning: "Quá ~", level: "N4", sequences: [[aux("すぎる", "過ぎる")]] },
  {
    id: "yasui",
    pattern: "〜やすい",
    meaning: "Dễ ~",
    level: "N4",
    sequences: [[{ p: "動詞", f: ["連用形"] }, aux("やすい")]],
  },
  { id: "nikui", pattern: "〜にくい", meaning: "Khó ~", level: "N4", sequences: [[V, aux("にくい", "難い")]] },
  { id: "hajimeru", pattern: "〜始める", meaning: "Bắt đầu ~", level: "N4", sequences: [[aux("始める", "はじめる")]] },
  { id: "owaru", pattern: "〜終わる", meaning: "~ xong", level: "N4", sequences: [[aux("終わる", "おわる")]] },
  { id: "tsuzukeru", pattern: "〜続ける", meaning: "Tiếp tục ~", level: "N4", sequences: [[aux("続ける", "つづける")]] },
  { id: "node", pattern: "〜ので", meaning: "Vì ~ (lý do khách quan)", level: "N4", sequences: [[{ s: ["ので"] }]] },
  {
    id: "noni",
    pattern: "〜のに",
    meaning: "Mặc dù ~ vậy mà",
    level: "N4",
    sequences: [[{ s: ["のに"], p1: "接続助詞" }]],
  },
  {
    id: "tame-ni",
    pattern: "〜ために",
    meaning: "Để ~ / vì ~",
    level: "N4",
    sequences: [[{ s: ["ため", "為"] }, { s: ["に"] }]],
  },
  {
    id: "ta-bakari",
    pattern: "〜たばかり",
    meaning: "Vừa mới ~",
    level: "N4",
    sequences: [[PAST, { s: ["ばかり"] }]],
  },
  {
    id: "tokoro",
    pattern: "〜ところだ",
    meaning: "Đang / vừa / sắp ~ (thời điểm của hành động)",
    level: "N4",
    sequences: [[{ s: ["ところ", "所"], p1: "非自立" }, { b: ["だ", "です"] }]],
  },
  {
    id: "shi",
    pattern: "〜し",
    meaning: "Vừa ~ lại vừa ~ (liệt kê lý do)",
    level: "N4",
    sequences: [[{ s: ["し"], p1: "接続助詞" }]],
  },
  {
    id: "koto-ni-suru",
    pattern: "〜ことにする",
    meaning: "Quyết định ~",
    level: "N4",
    sequences: [[{ s: ["こと"] }, { s: ["に"] }, { b: ["する"] }]],
  },
  {
    id: "koto-ni-naru",
    pattern: "〜ことになる",
    meaning: "Được quyết định / thành ra ~",
    level: "N4",
    sequences: [[{ s: ["こと"] }, { s: ["に"] }, { b: ["なる"] }]],
  },
  {
    id: "koto-ga-dekiru",
    pattern: "〜ことができる",
    meaning: "Có thể ~",
    level: "N4",
    sequences: [[{ s: ["こと"] }, { s: ["が"] }, { b: ["できる", "出来る"] }]],
  },
  {
    id: "n-desu",
    pattern: "〜んです / 〜のだ",
    meaning: "Giải thích, nhấn mạnh lý do / hoàn cảnh",
    level: "N4",
    sequences: [[{ s: ["ん", "の"], p1: "非自立" }, { b: ["です", "だ"] }]],
  },
  {
    id: "shika-nai",
    pattern: "〜しか〜ない",
    meaning: "Chỉ ~ (nhấn mạnh ít, đi với phủ định)",
    level: "N4",
    sequences: [[{ s: ["しか"], p1: "係助詞" }]],
  },
  {
    id: "ku-suru",
    pattern: "〜くする / 〜にする",
    meaning: "Làm cho ~",
    level: "N4",
    sequences: [[{ p: "形容詞", f: ["連用テ接続"] }, { b: ["する"] }], [{ p1: "形容動詞語幹" }, { s: ["に"] }, { b: ["する"] }]],
  },
  {
    id: "te-aru",
    pattern: "〜てある",
    meaning: "Đã được ~ sẵn (trạng thái)",
    level: "N4",
    sequences: [[V, TE, { b: ["ある"], p: "動詞" }]],
  },
  {
    id: "te-yokatta",
    pattern: "〜てよかった",
    meaning: "May mà đã ~ / ~ thật tốt",
    level: "N4",
    sequences: [[TE, { b: ["よい", "いい", "良い"], f: ["連用タ接続"] }]],
  },
  {
    id: "te-mo-kamawanai",
    pattern: "〜ても構わない",
    meaning: "~ cũng không sao",
    level: "N4",
    sequences: [[TE, { s: ["も"] }, { b: ["構う", "かまう"] }]],
  },
  {
    id: "ba-ii",
    pattern: "〜ばいい / 〜たらいい",
    meaning: "Nên ~ / chỉ cần ~ là được",
    level: "N4",
    sequences: [
      [{ f: ["仮定形"] }, { s: ["ば"] }, { b: ["よい", "いい", "良い"], f: ["基本形"] }],
      [{ s: ["たら", "だら"] }, { b: ["よい", "いい", "良い"], f: ["基本形"] }],
    ],
  },
  {
    id: "nasai",
    pattern: "〜なさい",
    meaning: "Hãy ~ (mệnh lệnh nhẹ)",
    level: "N4",
    sequences: [[{ p: "動詞", f: ["連用形"] }, { b: ["なさる"], f: ["命令"] }]],
  },
  {
    id: "meirei",
    pattern: "Thể mệnh lệnh",
    meaning: "~ đi! (ra lệnh)",
    level: "N4",
    sequences: [[{ p: "動詞", p1: "自立", f: ["命令"], nb: ["くださる", "なさる", "いらっしゃる"] }]],
  },
  {
    id: "ikou",
    pattern: "Thể ý chí 〜(よ)う",
    meaning: "~ thôi / ~ nào",
    level: "N4",
    sequences: [[{ p: "動詞", f: ["未然"] }, { b: ["う", "よう"], p: "助動詞" }]],
  },
  {
    id: "koto-ga-aru",
    pattern: "〜ことがある",
    meaning: "Thỉnh thoảng ~ / có lúc ~",
    level: "N4",
    sequences: [[{ p: "動詞", f: ["基本形"] }, { s: ["こと"] }, { s: ["が", "も"], opt: true }, { b: ["ある"] }]],
  },
  {
    id: "kana",
    pattern: "〜かな",
    meaning: "~ nhỉ? (tự hỏi)",
    level: "N4",
    sequences: [[{ s: ["か"] }, { s: ["な", "なあ", "なぁ"], p1: "終助詞" }]],
  },
  {
    id: "ka-douka",
    pattern: "〜かどうか",
    meaning: "~ hay không",
    level: "N4",
    sequences: [[{ s: ["か"] }, { s: ["どう"] }, { s: ["か"] }]],
  },
  {
    id: "sasete-kudasai",
    pattern: "〜させてください",
    meaning: "Xin cho phép tôi ~",
    level: "N4",
    sequences: [[{ b: ["せる", "させる"], p1: "接尾" }, TE, { s: ["ください", "下さい"] }]],
  },
  {
    id: "bakari",
    pattern: "〜ばかり",
    meaning: "Toàn ~ / chỉ toàn ~",
    level: "N4",
    sequences: [[{ s: ["ばかり"], p1: "副助詞" }]],
  },
  { id: "zutsu", pattern: "〜ずつ", meaning: "Từng ~ một / mỗi ~", level: "N4", sequences: [[{ s: ["ずつ"] }]] },
  {
    id: "kurai",
    pattern: "〜くらい / 〜ぐらい",
    meaning: "Khoảng ~ / cỡ ~",
    level: "N4",
    sequences: [[{ s: ["くらい", "ぐらい"], p1: "副助詞" }]],
  },
  { id: "made-ni", pattern: "〜までに", meaning: "Trước (thời hạn) ~", level: "N4", sequences: [[{ s: ["まで"] }, { s: ["に"] }]] },
  {
    id: "aida",
    pattern: "〜間に",
    meaning: "Trong khi ~ / trong khoảng ~",
    level: "N4",
    sequences: [[{ s: ["間", "あいだ"] }, { s: ["に"] }]],
  },
  { id: "toka", pattern: "〜とか", meaning: "~ chẳng hạn (liệt kê)", level: "N4", sequences: [[{ s: ["とか"], p1: "並立助詞" }]] },
  {
    id: "nado",
    pattern: "〜など / 〜なんか",
    meaning: "~ v.v. / cỡ như ~",
    level: "N4",
    sequences: [[{ s: ["など", "なんか"], p1: "副助詞" }]],
  },
  {
    id: "sa",
    pattern: "〜さ (danh từ hoá)",
    meaning: "Độ ~ (cao → độ cao)",
    level: "N4",
    sequences: [[{ p: "形容詞", f: ["ガル接続"] }, { s: ["さ"], p1: "接尾" }]],
  },
  {
    id: "mama",
    pattern: "〜まま",
    meaning: "Để nguyên ~ / cứ thế ~",
    level: "N4",
    sequences: [[{ s: ["まま", "儘"], p1: "非自立" }]],
  },
  {
    id: "sonkeigo",
    pattern: "Tôn kính ngữ",
    meaning: "Cách nói kính trọng người khác",
    level: "N4",
    sequences: [[{ b: ["いらっしゃる", "おっしゃる", "召し上がる", "なさる", "ご覧", "ごらん"] }]],
  },
  {
    id: "kenjougo",
    pattern: "Khiêm nhường ngữ",
    meaning: "Cách nói khiêm tốn về mình",
    level: "N4",
    sequences: [
      [TE, { b: ["おる"] }],
      [{ b: ["参る", "申す", "申し上げる", "伺う", "存じる", "いたす", "致す", "拝見", "ござる"] }],
    ],
  },
  {
    id: "to-iu",
    pattern: "〜という",
    meaning: "Gọi là ~ / rằng ~",
    level: "N4",
    sequences: [[{ s: ["という", "といった"] }], [{ s: ["と"] }, { b: ["いう", "言う"] }]],
  },

  // ── N3 ──
  {
    id: "ni-yoru-to",
    pattern: "〜によると",
    meaning: "Theo ~ (nguồn thông tin)",
    level: "N3",
    sequences: [[{ s: ["に"] }, { b: ["よる"] }, { s: ["と"] }], [{ s: ["によると", "によれば"] }]],
  },
  { id: "ni-tsuite", pattern: "〜について", meaning: "Về ~", level: "N3", sequences: [[{ s: ["について", "につき"] }]] },
  { id: "to-shite", pattern: "〜として", meaning: "Với tư cách ~", level: "N3", sequences: [[{ s: ["として"] }]] },
  { id: "ni-totte", pattern: "〜にとって", meaning: "Đối với ~", level: "N3", sequences: [[{ s: ["にとって"] }]] },
  {
    id: "ni-yotte",
    pattern: "〜によって",
    meaning: "Tuỳ theo ~ / bởi ~",
    level: "N3",
    sequences: [[{ s: ["によって", "により", "による"] }]],
  },
  {
    id: "wake",
    pattern: "〜わけ",
    meaning: "Có nghĩa là / lý do là ~",
    level: "N3",
    sequences: [[{ s: ["わけ", "訳"], p1: "非自立" }]],
  },
  {
    id: "wake-dewa-nai",
    pattern: "〜わけではない",
    meaning: "Không hẳn là ~",
    level: "N3",
    sequences: [[{ s: ["わけ", "訳"] }, { s: ["で", "じゃ"] }, { s: ["は"], opt: true }, { b: ["ない"] }]],
  },
  {
    id: "uchi-ni",
    pattern: "〜うちに",
    meaning: "Trong lúc ~ / trước khi ~ (kẻo)",
    level: "N3",
    sequences: [[{ s: ["うち", "内"], p1: "非自立" }, { s: ["に"] }]],
  },
  {
    id: "tte",
    pattern: "〜って (văn nói)",
    meaning: "Nói là / nghe nói / cái gọi là ~",
    level: "N3",
    sequences: [[{ s: ["って", "っていう", "ってこと"], p: "助詞" }]],
  },
  {
    id: "janai",
    pattern: "〜じゃない(か) / 〜じゃん",
    meaning: "Chẳng phải ~ sao / không phải ~",
    level: "N3",
    sequences: [[{ s: ["じゃ"] }, { b: ["ない"] }], [{ s: ["じゃん"] }], [{ s: ["じゃ"] }, { s: ["ん"], p1: "終助詞" }]],
  },
  {
    id: "to-iu-koto",
    pattern: "〜ということ",
    meaning: "Nghĩa là ~ / chuyện ~",
    level: "N3",
    sequences: [[{ s: ["という"] }, { s: ["こと"] }]],
  },
  { id: "zu-ni", pattern: "〜ずに", meaning: "Mà không ~", level: "N3", sequences: [[{ s: ["ず"], b: ["ぬ"] }, { s: ["に"] }]] },
  { id: "okage-de", pattern: "〜おかげで", meaning: "Nhờ ~", level: "N3", sequences: [[{ s: ["おかげ", "お陰"] }, { s: ["で"] }]] },
  { id: "sei-de", pattern: "〜せいで", meaning: "Tại ~ (lý do xấu)", level: "N3", sequences: [[{ s: ["せい"] }, { s: ["で", "だ"] }]] },
  { id: "hodo", pattern: "〜ほど", meaning: "Đến mức ~ / không ~ bằng", level: "N3", sequences: [[{ s: ["ほど"], p1: "副助詞" }]] },
  {
    id: "sasete-itadaku",
    pattern: "〜させていただく",
    meaning: "Xin phép được ~ (khiêm nhường)",
    level: "N3",
    sequences: [[{ b: ["せる", "させる"], p1: "接尾" }, TE, { b: ["いただく", "頂く", "もらう"] }]],
  },
  {
    id: "shieki-ukemi",
    pattern: "Thể bị sai khiến 〜させられる",
    meaning: "Bị bắt phải ~",
    level: "N3",
    sequences: [[{ b: ["せる", "させる", "す"], p1: "接尾" }, { b: ["れる", "られる"], p1: "接尾" }]],
  },
  { id: "ppoi", pattern: "〜っぽい", meaning: "Có vẻ ~ / hơi giống ~", level: "N3", sequences: [[{ s: ["っぽい"] }]] },
  { id: "beki", pattern: "〜べき", meaning: "Nên ~ (đương nhiên phải)", level: "N3", sequences: [[{ b: ["べし"] }]] },
  {
    id: "hazu-ga-nai",
    pattern: "〜はずがない",
    meaning: "Không thể nào ~",
    level: "N3",
    sequences: [[{ s: ["はず", "筈"] }, { s: ["が", "は"] }, { b: ["ない"] }]],
  },
  {
    id: "wake-ga-nai",
    pattern: "〜わけがない",
    meaning: "Không có lý nào ~",
    level: "N3",
    sequences: [[{ s: ["わけ", "訳"] }, { s: ["が", "は"] }, { b: ["ない"] }]],
  },
  {
    id: "wake-ni-ikanai",
    pattern: "〜わけにはいかない",
    meaning: "Không thể ~ (vì lý do)",
    level: "N3",
    sequences: [[{ s: ["わけ", "訳"] }, { s: ["に"] }, { s: ["は", "も"] }, { b: ["いく", "行く"] }]],
  },
  {
    id: "koto-wa-nai",
    pattern: "〜ことはない",
    meaning: "Không cần phải ~",
    level: "N3",
    sequences: [[{ p: "動詞", f: ["基本形"] }, { s: ["こと"] }, { s: ["は"] }, { b: ["ない"] }]],
  },
  {
    id: "te-shouganai",
    pattern: "〜てしょうがない / 〜てたまらない",
    meaning: "~ không chịu nổi / ~ vô cùng",
    level: "N3",
    sequences: [
      [TE, { s: ["しょうが", "仕方", "しかた"] }, { s: ["が"], opt: true }, { b: ["ない"] }],
      [TE, { b: ["たまらない"] }],
    ],
  },
  { id: "tabi-ni", pattern: "〜たびに", meaning: "Mỗi lần ~", level: "N3", sequences: [[{ s: ["たび", "度"] }, { s: ["に"] }]] },
  { id: "tsuide-ni", pattern: "〜ついでに", meaning: "Nhân tiện ~", level: "N3", sequences: [[{ s: ["ついで"] }, { s: ["に"] }]] },
  { id: "kuse-ni", pattern: "〜くせに", meaning: "Dù ~ vậy mà (trách móc)", level: "N3", sequences: [[{ s: ["くせ", "癖"] }, { s: ["に"] }]] },
  {
    id: "ni-kurabete",
    pattern: "〜に比べて",
    meaning: "So với ~",
    level: "N3",
    sequences: [[{ s: ["に"] }, { b: ["比べる", "くらべる"] }]],
  },
  {
    id: "ni-taishite",
    pattern: "〜に対して",
    meaning: "Đối với ~ / trái với ~",
    level: "N3",
    sequences: [[{ s: ["に対して", "に対し", "に対する"] }]],
  },
  {
    id: "ni-kanshite",
    pattern: "〜に関して",
    meaning: "Liên quan đến ~",
    level: "N3",
    sequences: [[{ s: ["に関して", "に関し", "に関する"] }]],
  },
  {
    id: "to-shitara",
    pattern: "〜としたら / 〜とすれば",
    meaning: "Giả sử ~",
    level: "N3",
    sequences: [[{ s: ["と"] }, { b: ["する"] }, { s: ["たら", "ば"] }]],
  },
  {
    id: "ni-chigainai",
    pattern: "〜に違いない",
    meaning: "Chắc chắn là ~",
    level: "N3",
    sequences: [[{ s: ["に"] }, { s: ["違い", "ちがい"] }, { b: ["ない"] }]],
  },
  { id: "nante", pattern: "〜なんて", meaning: "Cái thứ như ~ / ~ thật là", level: "N3", sequences: [[{ s: ["なんて"] }]] },
  { id: "kke", pattern: "〜っけ", meaning: "~ nhỉ? (cố nhớ lại)", level: "N3", sequences: [[{ s: ["っけ"] }]] },
  { id: "garu", pattern: "〜がる", meaning: "(Người khác) tỏ ra ~", level: "N3", sequences: [[{ b: ["がる"], p1: "接尾" }]] },
  { id: "saichuu", pattern: "〜最中", meaning: "Đang giữa lúc ~", level: "N3", sequences: [[{ s: ["最中"] }]] },
  {
    id: "toori",
    pattern: "〜とおり",
    meaning: "Đúng như ~",
    level: "N3",
    sequences: [[{ s: ["とおり", "通り", "どおり"], p1: "非自立" }], [{ s: ["通り", "どおり"], p1: "接尾" }]],
  },
  { id: "wari-ni", pattern: "〜わりに", meaning: "So với ~ thì (khác mong đợi)", level: "N3", sequences: [[{ s: ["わり", "割"] }, { s: ["に"] }]] },
  {
    id: "kawari-ni",
    pattern: "〜かわりに",
    meaning: "Thay vì ~ / bù lại ~",
    level: "N3",
    sequences: [[{ s: ["代わり", "かわり", "代り"] }, { s: ["に"] }]],
  },
  {
    id: "dasu",
    pattern: "〜出す",
    meaning: "Bắt đầu ~ (đột ngột)",
    level: "N3",
    sequences: [[{ p: "動詞", f: ["連用形"] }, aux("出す", "だす")]],
  },
  {
    id: "kiru",
    pattern: "〜切る",
    meaning: "~ hết / hoàn toàn",
    level: "N3",
    sequences: [[{ p: "動詞", f: ["連用形"] }, { b: ["切る", "きる"] }]],
  },
  {
    id: "dake-de-naku",
    pattern: "〜だけでなく / 〜ばかりでなく",
    meaning: "Không chỉ ~ mà còn",
    level: "N3",
    sequences: [[{ s: ["だけ", "ばかり"] }, { s: ["で", "じゃ"] }, { s: ["なく", "なくて"] }]],
  },
  {
    id: "ba-hodo",
    pattern: "〜ば〜ほど",
    meaning: "Càng ~ càng ~",
    level: "N3",
    sequences: [[{ f: ["仮定形"] }, { s: ["ば"] }, { f: ["基本形"] }, { s: ["ほど"] }]],
  },
  {
    id: "you-ni-iu",
    pattern: "〜ように言う",
    meaning: "Bảo / nhờ (ai) ~",
    level: "N3",
    sequences: [[{ s: ["よう"] }, { s: ["に"] }, { b: ["言う", "いう", "頼む", "伝える"] }]],
  },
  {
    id: "nai-koto-wa-nai",
    pattern: "〜ないことはない",
    meaning: "Không phải là không ~",
    level: "N3",
    sequences: [[{ b: ["ない"], p: "助動詞" }, { s: ["こと"] }, { s: ["は", "も"] }, { b: ["ない"] }]],
  },
  { id: "koso", pattern: "〜こそ", meaning: "Chính ~", level: "N3", sequences: [[{ s: ["こそ"] }]] },
  {
    id: "kara-koso",
    pattern: "〜からこそ",
    meaning: "Chính vì ~",
    level: "N3",
    sequences: [[{ s: ["から"] }, { s: ["こそ"] }]],
  },
  {
    id: "kara-to-itte",
    pattern: "〜からといって",
    meaning: "Dù ~ nhưng không hẳn",
    level: "N3",
    sequences: [[{ s: ["から"] }, { s: ["と"] }, { b: ["いう", "言う"] }, TE]],
  },
  {
    id: "to-itte-mo",
    pattern: "〜といっても",
    meaning: "Nói là ~ nhưng",
    level: "N3",
    sequences: [[{ s: ["と"] }, { b: ["いう", "言う"] }, TE, { s: ["も"] }]],
  },
  {
    id: "to-iu-yori",
    pattern: "〜というより",
    meaning: "Nói đúng hơn là ~",
    level: "N3",
    sequences: [[{ s: ["と"] }, { b: ["いう", "言う"] }, { s: ["より"] }], [{ s: ["という"] }, { s: ["より"] }]],
  },
  {
    id: "to-iu-no-wa",
    pattern: "〜というのは",
    meaning: "Cái gọi là ~ / ~ nghĩa là",
    level: "N3",
    sequences: [[{ s: ["という"] }, { s: ["の"] }, { s: ["は"] }]],
  },
  { id: "to-tomo-ni", pattern: "〜とともに", meaning: "Cùng với ~", level: "N3", sequences: [[{ s: ["とともに", "と共に"] }]] },
  { id: "ni-tsurete", pattern: "〜につれて", meaning: "Càng ~ thì càng", level: "N3", sequences: [[{ s: ["につれて", "につれ"] }]] },
  {
    id: "ni-shitagatte",
    pattern: "〜に従って",
    meaning: "Theo ~ / càng ~ càng",
    level: "N3",
    sequences: [[{ s: ["に従って", "にしたがって", "に従い"] }]],
  },
  {
    id: "ni-oite",
    pattern: "〜において",
    meaning: "Tại / trong ~",
    level: "N3",
    sequences: [[{ s: ["において", "における", "に於いて"] }]],
  },
  { id: "ni-kakete", pattern: "〜にかけて", meaning: "Từ ~ đến ~ (khoảng)", level: "N3", sequences: [[{ s: ["にかけて"] }]] },
  {
    id: "wo-tooshite",
    pattern: "〜を通して",
    meaning: "Thông qua ~",
    level: "N3",
    sequences: [[{ s: ["を通して", "を通じて"] }]],
  },
  {
    id: "wo-hajime",
    pattern: "〜をはじめ",
    meaning: "Tiêu biểu là ~",
    level: "N3",
    sequences: [[{ s: ["を"] }, { s: ["はじめ", "始め"] }]],
  },
  {
    id: "wo-chuushin-ni",
    pattern: "〜を中心に",
    meaning: "Lấy ~ làm trung tâm",
    level: "N3",
    sequences: [[{ s: ["を"] }, { s: ["中心"] }, { s: ["に", "と"] }]],
  },
  {
    id: "wo-moto-ni",
    pattern: "〜をもとに",
    meaning: "Dựa trên ~",
    level: "N3",
    sequences: [[{ s: ["を"] }, { s: ["もと", "元", "基"] }, { s: ["に"] }]],
  },
  {
    id: "ni-kuwaete",
    pattern: "〜に加えて",
    meaning: "Thêm vào ~",
    level: "N3",
    sequences: [[{ s: ["に"] }, { b: ["加える"] }]],
  },
  {
    id: "ni-kawatte",
    pattern: "〜に代わって",
    meaning: "Thay cho ~",
    level: "N3",
    sequences: [[{ s: ["に"] }, { b: ["代わる", "替わる", "かわる"] }]],
  },
  { id: "to-shite-mo", pattern: "〜としても", meaning: "Cho dù ~", level: "N3", sequences: [[{ s: ["として"] }, { s: ["も"] }]] },
  {
    id: "ni-shite-wa",
    pattern: "〜にしては",
    meaning: "So với ~ thì (bất ngờ)",
    level: "N3",
    sequences: [[{ s: ["に"] }, { b: ["する"] }, TE, { s: ["は"] }]],
  },
  { id: "buri", pattern: "〜ぶり", meaning: "Sau ~ (lâu mới lại)", level: "N3", sequences: [[{ s: ["ぶり", "振り"], p1: "接尾" }]] },
  {
    id: "mono-da",
    pattern: "〜ものだ",
    meaning: "~ là lẽ thường / thường hay ~",
    level: "N3",
    sequences: [[{ s: ["もの", "もん"], p1: "非自立" }, { b: ["だ", "です"] }]],
  },
  {
    id: "koto-da",
    pattern: "〜ことだ",
    meaning: "Nên ~ (lời khuyên)",
    level: "N3",
    sequences: [[{ p: "動詞", f: ["基本形"] }, { s: ["こと"] }, { b: ["だ", "です"] }]],
  },
  { id: "ippou-de", pattern: "〜一方で", meaning: "Mặt khác ~", level: "N3", sequences: [[{ s: ["一方"] }, { s: ["で"] }]] },
  {
    id: "ue-ni",
    pattern: "〜うえに",
    meaning: "Hơn nữa ~ / không những ~",
    level: "N3",
    sequences: [[{ s: ["うえ", "上"], p1: "非自立" }, { s: ["に"] }]],
  },
  { id: "gachi", pattern: "〜がち", meaning: "Hay ~ / thường dễ ~", level: "N3", sequences: [[{ s: ["がち"] }]] },
  { id: "gimi", pattern: "〜気味", meaning: "Hơi ~ / có vẻ ~", level: "N3", sequences: [[{ s: ["気味", "ぎみ"], p1: "接尾" }]] },
  { id: "muke", pattern: "〜向け", meaning: "Dành cho ~", level: "N3", sequences: [[{ s: ["向け", "向き"], p1: "接尾" }]] },
  { id: "totan", pattern: "〜たとたん", meaning: "Vừa ~ thì ngay lập tức", level: "N3", sequences: [[{ s: ["とたん", "途端"] }]] },
  {
    id: "to-wa-kagiranai",
    pattern: "〜とは限らない",
    meaning: "Không hẳn là ~",
    level: "N3",
    sequences: [[{ s: ["と"] }, { s: ["は"] }, { b: ["限る", "かぎる"] }, { b: ["ない"] }]],
  },
  {
    id: "ni-kimatte-iru",
    pattern: "〜に決まっている",
    meaning: "Chắc chắn là ~",
    level: "N3",
    sequences: [[{ s: ["に"] }, { b: ["決まる"] }, TE, { b: ["いる"] }]],
  },
  {
    id: "wo-nozoite",
    pattern: "〜を除いて",
    meaning: "Ngoại trừ ~",
    level: "N3",
    sequences: [[{ s: ["を"] }, { b: ["除く"] }]],
  },
  {
    id: "wa-mochiron",
    pattern: "〜はもちろん",
    meaning: "~ thì đương nhiên rồi",
    level: "N3",
    sequences: [[{ s: ["は"] }, { s: ["もちろん", "勿論"] }]],
  },
  {
    id: "wo-komete",
    pattern: "〜をこめて",
    meaning: "Với cả ~ (tình cảm)",
    level: "N3",
    sequences: [[{ s: ["を"] }, { b: ["こめる", "込める"] }]],
  },
  {
    id: "ki-ga-suru",
    pattern: "〜気がする",
    meaning: "Có cảm giác ~",
    level: "N3",
    sequences: [[{ s: ["気"] }, { s: ["が"] }, { b: ["する"] }]],
  },
  { id: "sae", pattern: "〜さえ", meaning: "Ngay cả ~ / chỉ cần ~", level: "N3", sequences: [[{ s: ["さえ"] }]] },

  // ── N2 ──
  {
    id: "ni-oujite",
    pattern: "〜に応じて",
    meaning: "Tuỳ theo ~",
    level: "N2",
    sequences: [[{ s: ["に"] }, { b: ["応じる", "応ずる"] }]],
  },
  {
    id: "you-ga-nai",
    pattern: "〜ようがない",
    meaning: "Không có cách nào ~",
    level: "N2",
    sequences: [[{ s: ["しようが", "ようが"] }, { b: ["ない"] }]],
  },
  {
    id: "ka-no-you",
    pattern: "〜かのようだ",
    meaning: "Cứ như thể ~",
    level: "N2",
    sequences: [[{ s: ["か"] }, { s: ["の"] }, { s: ["よう"] }, { s: ["だ", "です", "な", "に"], opt: true }]],
  },
  { id: "monono", pattern: "〜ものの", meaning: "Tuy ~ nhưng", level: "N2", sequences: [[{ s: ["ものの"], p1: "接続助詞" }]] },
  {
    id: "ta-ue-de",
    pattern: "〜た上で",
    meaning: "Sau khi ~ rồi mới",
    level: "N2",
    sequences: [[PAST, { s: ["上", "うえ"] }, { s: ["で"] }]],
  },
  {
    id: "osore",
    pattern: "〜おそれがある",
    meaning: "E rằng ~ / có nguy cơ ~",
    level: "N2",
    sequences: [[{ s: ["お"] }, { s: ["それ"] }, { s: ["が"] }, { b: ["ある"] }], [{ s: ["恐れ", "おそれ"] }, { s: ["が"] }, { b: ["ある"] }]],
  },
  {
    id: "kanenai",
    pattern: "〜かねない",
    meaning: "Có thể ~ (điều xấu)",
    level: "N2",
    sequences: [[{ b: ["かねる"] }, { b: ["ない"] }]],
  },
  { id: "kaneru", pattern: "〜かねる", meaning: "Khó lòng ~", level: "N2", sequences: [[{ b: ["かねる"], p1: "非自立" }]] },
  {
    id: "shidai",
    pattern: "〜次第",
    meaning: "Ngay khi ~ / tuỳ vào ~",
    level: "N2",
    sequences: [[{ s: ["次第", "しだい"] }]],
  },
  { id: "sai", pattern: "〜際", meaning: "Khi ~ (trang trọng)", level: "N2", sequences: [[{ s: ["際"], p1: "非自立" }]] },
  {
    id: "ni-kagirazu",
    pattern: "〜に限らず",
    meaning: "Không chỉ ~",
    level: "N2",
    sequences: [[{ s: ["に"] }, { b: ["限る", "かぎる"], f: ["未然"] }, { s: ["ず"] }]],
  },
  {
    id: "ni-kagiru",
    pattern: "〜に限る / 〜に限って",
    meaning: "~ là nhất / riêng ~ thì",
    level: "N2",
    sequences: [[{ s: ["に"] }, { b: ["限る", "かぎる"], f: ["基本形", "連用"] }]],
  },
  {
    id: "ni-suginai",
    pattern: "〜に過ぎない",
    meaning: "Chỉ là ~ / chẳng qua là ~",
    level: "N2",
    sequences: [[{ s: ["に"] }, { b: ["過ぎる", "すぎる"] }, { b: ["ない"] }]],
  },
  {
    id: "ni-mo-kakawarazu",
    pattern: "〜にもかかわらず",
    meaning: "Mặc dù ~",
    level: "N2",
    sequences: [[{ s: ["に"] }, { s: ["も"] }, { b: ["かかわる", "関わる", "拘る"] }]],
  },
  { id: "ni-sotte", pattern: "〜に沿って", meaning: "Theo ~ / dọc theo ~", level: "N2", sequences: [[{ s: ["に"] }, { b: ["沿う"] }]] },
  {
    id: "ni-motozuite",
    pattern: "〜に基づいて",
    meaning: "Dựa trên ~",
    level: "N2",
    sequences: [[{ s: ["に"] }, { b: ["基づく", "もとづく"] }]],
  },
  {
    id: "wo-kikkake-ni",
    pattern: "〜をきっかけに",
    meaning: "Nhân dịp ~ / từ ~ mà",
    level: "N2",
    sequences: [[{ s: ["を"] }, { s: ["きっかけ", "契機"] }, { s: ["に", "と"] }]],
  },
  {
    id: "wo-towazu",
    pattern: "〜を問わず",
    meaning: "Bất kể ~",
    level: "N2",
    sequences: [[{ s: ["を"] }, { b: ["問う"] }, { s: ["ず"] }]],
  },
  {
    id: "wo-megutte",
    pattern: "〜をめぐって",
    meaning: "Xoay quanh ~",
    level: "N2",
    sequences: [[{ s: ["をめぐって", "をめぐる", "を巡って", "を巡る"] }]],
  },
  { id: "dokoroka", pattern: "〜どころか", meaning: "Đừng nói ~ mà ngay cả", level: "N2", sequences: [[{ s: ["どころか"] }]] },
  {
    id: "zu-ni-wa-irarenai",
    pattern: "〜ずにはいられない",
    meaning: "Không thể không ~",
    level: "N2",
    sequences: [[{ s: ["ず"] }, { s: ["に"] }, { s: ["は"] }, { b: ["いる"] }, { b: ["られる"] }]],
  },
  {
    id: "zaru-wo-enai",
    pattern: "〜ざるを得ない",
    meaning: "Buộc phải ~",
    level: "N2",
    sequences: [[{ s: ["ざる"] }, { s: ["を"] }, { b: ["得る", "える"] }]],
  },
  {
    id: "te-hajimete",
    pattern: "〜てはじめて",
    meaning: "Phải ~ rồi mới",
    level: "N2",
    sequences: [[TE, { b: ["はじめる", "始める"] }, TE], [TE, { s: ["初めて", "はじめて"] }]],
  },
  {
    id: "te-naranai",
    pattern: "〜てならない",
    meaning: "~ vô cùng / không chịu nổi",
    level: "N2",
    sequences: [[{ s: ["て", "で"] }, { b: ["なる"], f: ["未然"] }, { b: ["ない"] }]],
  },
  { id: "kara-ni-wa", pattern: "〜からには", meaning: "Một khi đã ~ thì", level: "N2", sequences: [[{ s: ["からには", "からは"] }]] },
  { id: "ageku", pattern: "〜あげく", meaning: "Rốt cuộc sau khi ~", level: "N2", sequences: [[{ s: ["あげく", "挙げ句", "挙句"] }]] },
  {
    id: "sue-ni",
    pattern: "〜末に",
    meaning: "Sau một hồi ~ (cuối cùng)",
    level: "N2",
    sequences: [[{ s: ["末"], p1: "非自立" }, { s: ["に"] }]],
  },
  {
    id: "hoka-nai",
    pattern: "〜ほかない",
    meaning: "Đành phải ~",
    level: "N2",
    sequences: [[{ s: ["ほか", "他", "外"] }, { s: ["しか"], opt: true }, { b: ["ない"] }]],
  },
  { id: "tsutsu", pattern: "〜つつ", meaning: "Vừa ~ / dù ~", level: "N2", sequences: [[{ s: ["つつ"], p1: "接続助詞" }]] },
  {
    id: "tsutsu-aru",
    pattern: "〜つつある",
    meaning: "Đang dần ~",
    level: "N2",
    sequences: [[{ s: ["つつ"] }, { b: ["ある"] }]],
  },
  {
    id: "eru",
    pattern: "〜得る",
    meaning: "Có thể ~",
    level: "N2",
    sequences: [[{ p: "動詞", f: ["連用形"] }, { b: ["得る", "える", "うる"], p1: "非自立" }]],
  },
  { id: "gatai", pattern: "〜がたい", meaning: "Khó mà ~", level: "N2", sequences: [[{ b: ["がたい", "難い"], p1: "非自立" }]] },
  {
    id: "koto-naku",
    pattern: "〜ことなく",
    meaning: "Mà không ~",
    level: "N2",
    sequences: [[{ p: "動詞", f: ["基本形"] }, { s: ["こと"] }, { s: ["なく"] }]],
  },
];

export type GrammarMatch = {
  id: string;
  pattern: string;
  meaning: string;
  level: JlptLevel;
  /** Vị trí ký tự trong câu [start, end) */
  start: number;
  end: number;
};

function anyOf(list: string[] | undefined, value: string): boolean {
  return !list || list.includes(value);
}

function matches(token: IpadicFeatures, m: TokenMatcher): boolean {
  return (
    anyOf(m.s, token.surface_form) &&
    anyOf(m.b, token.basic_form) &&
    !m.nb?.includes(token.basic_form) &&
    (!m.p || token.pos === m.p) &&
    (!m.p1 || token.pos_detail_1 === m.p1) &&
    (!m.f || m.f.some((f) => token.conjugated_form.startsWith(f)))
  );
}

/** Trả về chỉ số token kết thúc (không bao gồm) nếu khớp từ vị trí `start`, ngược lại -1. */
function matchSequence(tokens: IpadicFeatures[], start: number, seq: TokenMatcher[]): number {
  let j = start;
  for (const m of seq) {
    if (j < tokens.length && matches(tokens[j], m)) j++;
    else if (!m.opt) return -1;
  }
  return j;
}

/** Tìm các mẫu ngữ pháp trong câu đã tách token. Mỗi mẫu chỉ trả về lần xuất hiện đầu tiên. */
export function findGrammar(tokens: IpadicFeatures[]): GrammarMatch[] {
  // Vị trí ký tự của từng token (word_position của kuromoji tính từ 1).
  const offsets = tokens.map((t) => t.word_position - 1);
  const charEnd = (i: number) => offsets[i] + tokens[i].surface_form.length;

  const found: GrammarMatch[] = [];
  for (const rule of RULES) {
    search: for (let i = 0; i < tokens.length; i++) {
      for (const seq of rule.sequences) {
        const end = matchSequence(tokens, i, seq);
        if (end > i) {
          const { id, pattern, meaning, level } = rule;
          found.push({ id, pattern, meaning, level, start: offsets[i], end: charEnd(end - 1) });
          break search;
        }
      }
    }
  }

  // Bỏ mẫu nằm gọn trong một mẫu dài hơn (vd 〜ば trong 〜なければならない, 〜ても trong 〜てもいい).
  const kept = found.filter(
    (a) =>
      !found.some(
        (b) => b !== a && b.start <= a.start && b.end >= a.end && b.end - b.start > a.end - a.start,
      ),
  );
  return kept.sort((a, b) => a.start - b.start || b.end - a.end);
}
