// 国 → 通貨（記号＋円からの概算レート）。価格データは円なので、これで換算して表示する。
// レートは概算・参考用（2026年ごろの目安）。実売は送客先で確認してもらう前提。
const CURRENCIES = {
  jp: { symbol: '¥', rate: 1 },
  us: { symbol: '$', rate: 0.0067 },
  uk: { symbol: '£', rate: 0.0053 },
  de: { symbol: '€', rate: 0.0062 },
  kr: { symbol: '₩', rate: 9 },
  fr: { symbol: '€', rate: 0.0062 },
  it: { symbol: '€', rate: 0.0062 },
  es: { symbol: '€', rate: 0.0062 },
  au: { symbol: 'A$', rate: 0.0103 },
  ca: { symbol: 'C$', rate: 0.0091 },
  cn: { symbol: 'CN¥', rate: 0.048 },
  tw: { symbol: 'NT$', rate: 0.21 },
  sg: { symbol: 'S$', rate: 0.0086 },
}

// 地域ごとの数値ロケール（桁区切りを現地慣習に：独 1.000 / 仏 1 000 / 米 1,000）
const LOCALE = {
  jp: 'ja-JP', us: 'en-US', uk: 'en-GB', de: 'de-DE', fr: 'fr-FR', es: 'es-ES',
  it: 'it-IT', kr: 'ko-KR', cn: 'zh-CN', tw: 'zh-TW', au: 'en-AU', ca: 'en-CA', sg: 'en-SG',
}
// 記号を数値の後ろに置く通貨（ユーロ圏は「3 500 €」「2.000 €」が自然）
const SYMBOL_SUFFIX = new Set(['de', 'fr', 'es', 'it'])

// 現地通貨の数値を、記号位置・桁区切りまで現地慣習で整形する（formatPrice と予算ラベルで共有）
export function formatMoney(amount, region) {
  const c = CURRENCIES[region] || CURRENCIES.jp
  const n = Math.round(amount).toLocaleString(LOCALE[region] || 'en-US')
  return SYMBOL_SUFFIX.has(region) ? `${n} ${c.symbol}` : `${c.symbol}${n}`
}

// 円価格を、選んだ国の通貨の現地表記にする（例: 米 "$1,273" / 仏 "1 273 €" / 独 "1.273 €"）
export function formatPrice(yen, region) {
  const c = CURRENCIES[region] || CURRENCIES.jp
  return formatMoney(yen * c.rate, region)
}

// 円 → 現地通貨の数値（記号なし。入力欄の表示などに使う）
export function toLocal(yen, region) {
  const c = CURRENCIES[region] || CURRENCIES.jp
  return Math.round(yen * c.rate)
}

// 現地通貨の数値 → 円（入力された金額を内部の円に戻す）
export function toYen(localValue, region) {
  const c = CURRENCIES[region] || CURRENCIES.jp
  return Math.round(localValue / c.rate)
}

// その国の通貨記号だけ取り出す（ラベルなどに使う）
export function currencySymbol(region) {
  return (CURRENCIES[region] || CURRENCIES.jp).symbol
}

// 予算プリセットを「現地通貨のキリのいい数値」で持つ（円固定だと他通貨で端数だらけになるため）。
// 内部処理は円で行うので、表示は現地のキリ番、フィルタ用の値は円に換算して返す。
const BUDGET_PRESETS_LOCAL = {
  jp: [100000, 200000, 350000, 550000, 1000000],
  us: [500, 1000, 2000, 3500, 7000],
  uk: [500, 1000, 2000, 3500, 7000],
  de: [500, 1000, 2000, 3500, 7000],
  fr: [500, 1000, 2000, 3500, 7000],
  it: [500, 1000, 2000, 3500, 7000],
  es: [500, 1000, 2000, 3500, 7000],
  kr: [900000, 1500000, 3000000, 5000000, 10000000],
  cn: [5000, 10000, 20000, 35000, 70000],
  tw: [20000, 40000, 80000, 120000, 200000],
  au: [1000, 2000, 4000, 6000, 12000],
  ca: [1000, 2000, 4000, 6000, 12000],
  sg: [1000, 2000, 4000, 6000, 12000],
}

// 予算プリセットを返す（[{ valueYen, label }]）。末尾に「上限なし(Infinity)」を含める。
//   noLimitLabel … 「上限なし」の多言語ラベル
//   prefix       … 「〜 / Under 」など各言語の接頭辞
export function getBudgetPresets(region, noLimitLabel, prefix = '') {
  const c = CURRENCIES[region] || CURRENCIES.jp
  const locals = BUDGET_PRESETS_LOCAL[region] || BUDGET_PRESETS_LOCAL.jp
  const presets = locals.map((local) => ({
    valueYen: Math.round(local / c.rate),
    local, // 現地通貨の素の数値（プレースホルダ例などに使う。往復誤差なし）
    label: prefix + formatMoney(local, region), // 記号位置・桁区切りも現地慣習で
  }))
  presets.push({ valueYen: Infinity, local: Infinity, label: noLimitLabel })
  return presets
}
