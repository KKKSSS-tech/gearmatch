// 検索ロジック：絞り込み → 加点 → おすすめ順で上位を抽出 → ユーザー指定で並び替え。
// 予算で厳格に絞る（予算オーバーは出さない＝本人方針）。予算内に該当が無ければ結果は空（呼び出し側が noResults を表示）。
import { PRODUCT_YEARS } from '../data/years'

// 今年（これより発売年が先の製品＝発売前は結果に出さない）
const NOW_YEAR = new Date().getFullYear()

// 中古の概算係数（ランク未選択時のフォールバック）。ResultCard の表示価格と揃える。
export const USED_FACTOR = 0.72

// 中古ランク別の概算係数（美品ほど高い）。フィルタ・表示・スコアで同じ係数を使い、ズレを無くす。
export const GRADE_FACTOR = { A: 0.80, AB: 0.74, B: 0.66, C: 0.55 }

// 選んだ中古ランクから使う係数を決める。
// 複数選ぶときは「最も安いランク（=最大割引）」を採用し、見出しは『最低価格〜』として整合させる。
// これにより「予算内なのに表示されない／予算オーバーなのに出る」不整合を防ぐ（フィルタ＝表示＝スコアで同一係数）。
export function usedFactorFor(condition, grade) {
  if (condition !== 'used') return 1
  const sel = (grade || []).map((g) => GRADE_FACTOR[g]).filter((n) => typeof n === 'number')
  return sel.length ? Math.min(...sel) : USED_FACTOR
}

// 被写体 → 相性のいいレンズの画角タイプ（除外ではなく「加点」に使う）
const SUBJECT_TO_FOCAL = { landscape: 'wide', animal: 'tele', various: 'allround', portrait: 'prime' }

// 用途の要求（both は「写真も映像も」の両取り）
const NEEDS = { photo: ['photo'], video: ['video'], both: ['photo', 'video'] }

// こだわり（キーワード型）。製品の strengths＋name に含まれていれば加点。
// ※ portability/value/imageQuality/lowLight/stabilization/video は params で、recent は発売年で加点（下記）
const PRIORITY_KW = {
  rawVideo: ['RAW', 'ProRes', 'BRAW'],
  logGamma: ['Log', 'S-Log', 'V-Log', 'C-Log', 'N-Log', 'HLG'],
  video8k: ['8K'],
  vlog: ['Vlog', '自撮り', 'バリアングル'],
  streaming: ['配信', 'ライブ', 'UVC', 'Webカメラ'],
  // ※ 裸の 'AF' は『高速AF/位相差AF』等ほぼ全機にヒットして差別化にならないので入れない（瞳AF・被写体認識に限定）
  eyeAF: ['瞳AF', '被写体認識', 'AI追尾', 'トラッキング', '人物認識'],
  // ※ 裸の '高速' は『高速AF』に誤マッチするので入れない（連写を表す具体語のみ）
  burst: ['高速連写', '連写', 'スポーツ', '動体', '報道'],
  weatherproof: ['防塵防滴', '防滴', 'タフ', '耐候', '堅牢', 'アウトドア', '防水'],
  highRes: ['高画素', '高解像'],
  bokeh: ['大三元', 'F1.2', 'F1.4', 'F1.8', '明るい', 'ボケ', '単焦点'],
  macro: ['マクロ', '接写', '等倍'],
  // ※ '望遠' は『中望遠単焦点』等に部分一致してしまうので入れない。実際は下の focalMax で構造的に判定する
  superTele: ['超望遠', '超々望遠', '野鳥'],
  ultraWide: ['超広角', '広角', '風景'],
  nightSky: ['星', '天体', '低照度', '暗所'],
  pro: ['プロ現場', 'デュアル', '信頼性', 'プロ'],
}

// こだわりのうち「カメラ本体だけの性能」＝レンズには無関係な項目。
// レンズ選択時はUIに出さず、スコアにも使わない（例：RAW動画収録はボディの収録コーデック）。
//   rawVideo … 収録コーデック（RAW/ProRes/BRAW）はボディ機能
//   vlog     … バリアングル・自撮りはボディ機能
//   burst    … 連写速度・バッファはボディ機能
//   eyeAF    … 瞳AF・被写体認識はボディのAFシステム
// ※ video（動画適性）/ stabilization（手ブレ補正）/ weatherproof（防塵防滴）/ lowLight などは
//   レンズにも該当するので隠さない（lens データにも params.video 等が存在）。
export const CAMERA_ONLY_PRIORITIES = ['rawVideo', 'vlog', 'burst', 'eyeAF']

// こだわりのうち「レンズ側の性能」＝カメラ本体には無関係な項目。
// カメラ選択時はUIに出さず、スコアにも使わない（ボディ単体では scoreItem の加点が必ず 0 になる項目）。
//   macro     … 接写・等倍はレンズの性能（マクロ判定は name/strengths のキーワード＝ボディは持たない）
//   bokeh     … 大きなボケは明るさ（F値）＝レンズ依存（bokehScore は製品名のF値を読む＝ボディ名に無い）
//   superTele … 超望遠は焦点距離＝レンズの画角（item.focalMax で判定＝ボディは focalMax を持たない）
export const LENS_ONLY_PRIORITIES = ['macro', 'bokeh', 'superTele']

// 選んだ機材で、そのこだわり項目を表示／適用してよいか判定する。
// レンズならボディ専用を、カメラならレンズ専用を隠す。機材が未選択のときはすべて出す。
export function isPriorityForGear(value, gear) {
  if (gear === 'lens') return !CAMERA_ONLY_PRIORITIES.includes(value)
  if (gear === 'camera') return !LENS_ONLY_PRIORITIES.includes(value)
  return true
}

// 被写体への相性スコア（レンズのみ）。focalType タグだけに頼らず「焦点距離の数値」で判定する。
// （データ上 85/135mm の中望遠単焦点が 'tele' と誤タグされていても、ポートレートで拾い・野鳥では拾わない）
function subjectScore(item, subject) {
  const wantFocal = SUBJECT_TO_FOCAL[subject]
  if (!wantFocal || !item.focalType) return 0 // カメラ本体は focalType を持たないので対象外
  const ft = item.focalType
  const fmin = item.focalMin || 0
  const fmax = item.focalMax || 0
  const isPrime = fmin > 0 && fmin === fmax // 単焦点（焦点距離が1点）
  if (subject === 'portrait') {
    // ポートレートは中〜中望遠の単焦点（50〜）が理想。タグが tele でも単焦点なら拾う。超広角単焦点は対象外。
    if (!isPrime && ft !== 'prime') return 0
    return fmin >= 50 ? 5 : fmin >= 35 ? 2 : 0
  }
  if (subject === 'landscape') {
    // 風景は広角ズームが定番。広角単焦点(≦35mm)も好適で、明るい単焦点は星景に最適なので満点。
    if (ft === 'wide') return 5
    if ((ft === 'prime' || isPrime) && fmax <= 35) return (item.params && item.params.lowLight >= 4) ? 5 : 3
    return 0
  }
  if (subject === 'animal') {
    // 動物・スポーツは“到達距離”が要る。望遠ズーム/超望遠のみ。短い中望遠単焦点(75〜135mm)は対象外。
    return fmax >= 300 ? 5 : fmax >= 150 ? 3 : 0
  }
  // various → allround
  return ft === wantFocal ? 5 : 0
}

// 「大きなボケ」こだわりの段階点（名前のF値から推定。明るいほど高得点）。
// クロップ機（Fuji X / M4/3）は同じF値でも実際のボケが小さいので1段下げ、フルサイズの明るい単焦点が上に来るようにする。
function bokehScore(item) {
  const name = typeof item === 'string' ? item : (item.name || '')
  const mount = typeof item === 'object' ? item.mount : ''
  const n = name.toUpperCase()
  let s = 0
  if (n.includes('F0.95') || n.includes('F1.0') || n.includes('F1.2')) s = 4
  else if (n.includes('F1.4')) s = 3
  else if (n.includes('F1.8')) s = 2
  else if (n.includes('F2.8') || name.includes('大三元') || name.includes('単焦点') || name.includes('ボケ')) s = 1
  if (s > 0 && (mount === 'X' || mount === 'M4/3')) s = Math.max(1, s - 1) // クロップ機は1段控えめ
  return s
}

// 1製品に点数と「おすすめ理由」を付ける
function scoreItem(item, choices) {
  let score = 0
  const reasons = []

  const wantUses = NEEDS[choices.purpose] || []
  // データの use:['both'] は「写真も映像も」のオールラウンドなので、選んだ用途すべてに合致扱い
  const itemUse = item.use || []
  const useHits = itemUse.includes('both')
    ? wantUses.length
    : wantUses.filter((u) => itemUse.includes(u)).length
  if (useHits > 0) {
    score += useHits * 2
    reasons.push('reasonGoodForUse')
  }
  // 用途をはっきり指定（写真のみ/動画のみ）したら、その用途を明示的に持つ機種を一段優遇する。
  // （use:['video','both'] の動画寄りボディが「写真メイン」で写真専用機と同点に並ぶのを防ぐ）
  if (choices.purpose && choices.purpose !== 'both' && itemUse.includes(choices.purpose)) {
    score += 1
  }

  // 被写体との相性（焦点距離まで考慮）
  const subj = subjectScore(item, choices.subject)
  if (subj > 0) {
    score += subj
    reasons.push('reasonForSubject')
  }

  // 中古を選んだら実効価格（選択ランクの係数込み）でコスパ判定する（予算フィルタ・表示と一貫させる）
  const priceFactor = usedFactorFor(choices.condition, choices.grade)
  const budget = choices.budget || Infinity
  if (budget !== Infinity && item.price * priceFactor <= budget * 0.7) {
    // 「安いだけの旧型・低性能機」を上位に出さないため、コスパ加点は
    // 比較的新しく、かつ画質が一定以上のボディに限る（レンズは focalType を持つので常に対象）。
    const recent = (PRODUCT_YEARS[item.name] || 0) >= 2019
    const decent = item.focalType || ((item.params && item.params.imageQuality) || 0) >= 3
    if (recent && decent) {
      score += 1
      reasons.push('reasonGoodValue')
    }
  }
  // こだわり（任意・複数）：選んだ観点が強い製品を加点して上位に出す
  const prio = choices.priorities || []
  if (prio.length) {
    const p = item.params || {}
    const hay = ((item.strengths || []).join(' ') + ' ' + item.name).toLowerCase()
    let priorityHit = false
    for (const k of prio) {
      let gained = 0
      if (k === 'recent') {
        const y = PRODUCT_YEARS[item.name] || 0
        gained = y >= 2023 ? 4 : y >= 2021 ? 2 : y >= 2019 ? 1 : 0
      } else if (k === 'superTele') {
        // 焦点距離で構造的に判定（マーケ文言に依存しない）。データに無ければキーワードで補完。
        const fx = item.focalMax || 0
        gained = fx >= 300 ? 4 : fx >= 200 ? 2 : (PRIORITY_KW.superTele.some((w) => hay.includes(w.toLowerCase())) ? 3 : 0)
      } else if (k === 'macro') {
        // 明示的にマクロを選んだら、本物のマクロを被写体ボーナス(+5)より上に押し上げる
        gained = PRIORITY_KW.macro.some((w) => hay.includes(w.toLowerCase())) ? 8 : 0
      } else if (k === 'bokeh') {
        gained = bokehScore(item)
      } else if (k === 'nightSky') {
        // 星・天体は「明るさ（低照度耐性）」が本質。params.lowLight で構造判定し、暗いズームを上位にしない。
        const ll = p.lowLight || 0
        const kw = PRIORITY_KW.nightSky.some((w) => hay.includes(w.toLowerCase()))
        gained = ll >= 4 ? 3 : ll >= 3 ? 1 : (kw ? 3 : 0)
      } else if (k === 'vlog') {
        // Vlog はキーワード（自撮り/バリアングル等）に加え、動画が強く携帯性の高いボディも本物のVlog機として拾う。
        const kw = PRIORITY_KW.vlog.some((w) => hay.includes(w.toLowerCase()))
        gained = kw ? 3 : ((p.video || 0) >= 5 && (p.portability || 0) >= 3 ? 2 : 0)
      } else if (typeof p[k] === 'number') {
        gained = p[k] >= 4 ? 3 : p[k] >= 3 ? 1 : 0
      } else if (PRIORITY_KW[k]) {
        gained = PRIORITY_KW[k].some((w) => hay.includes(w.toLowerCase())) ? 3 : 0
      }
      if (gained > 0) {
        score += gained
        priorityHit = true
      }
    }
    // こだわりが効いたことをカードでも示す（「選んだこだわりに合っている」）
    if (priorityHit) reasons.push('reasonPriorityMatch')
  }

  return { ...item, score, reasons }
}

// 用途を強く指定したときの足切り（both は緩い）。
//   video … 動画用途/オールラウンド、または動画性能が十分(≧3)なら許容。それ以外（写真専用）は出さない。
//   photo … 写真用途/オールラウンドのみ。動画専用機（シネマ機など）は写真用途では出さない。
function purposeOk(item, purpose) {
  if (!purpose || purpose === 'both') return true
  const use = item.use || []
  if (use.includes(purpose) || use.includes('both')) return true
  if (purpose === 'video') return ((item.params && item.params.video) || 0) >= 3
  return false
}

// おすすめで選んだ上位を、ユーザー指定の条件で並べ替える（表示順だけ変える）
function applySort(items, sortBy) {
  const arr = [...items]
  switch (sortBy) {
    case 'priceAsc':
      return arr.sort((a, b) => a.price - b.price)
    case 'priceDesc':
      return arr.sort((a, b) => b.price - a.price)
    case 'sensorDesc': // カメラ用：センサーが大きい順
      return arr.sort((a, b) => (b.sensorRank || 0) - (a.sensorRank || 0) || b.score - a.score)
    case 'focalAsc': // レンズ用：焦点距離が短い順
      return arr.sort((a, b) => (a.focalMin || 0) - (b.focalMin || 0) || a.price - b.price)
    case 'newest': // 発売が新しい順
      return arr.sort((a, b) => (PRODUCT_YEARS[b.name] || 0) - (PRODUCT_YEARS[a.name] || 0) || b.score - a.score)
    case 'lightest': // コンパクト順（携帯性スコアが高い順）。同点は score → 価格で決定的に並べる
      return arr.sort(
        (a, b) =>
          ((b.params && b.params.portability) || 0) - ((a.params && a.params.portability) || 0) ||
          b.score - a.score ||
          a.price - b.price
      )
    default:
      return arr // 'recommended'：おすすめ（点数）順のまま
  }
}

function run(items, choices, limit) {
  // 発売前（発売年が今年より先）の製品は結果に出さない
  const released = items.filter((item) => !(PRODUCT_YEARS[item.name] > NOW_YEAR))
  const budget = choices.budget || Infinity
  // 中古は選択ランクの係数込みの実効価格で絞る（表示の中古価格と完全に一致させる＝予算厳守）
  const priceFactor = usedFactorFor(choices.condition, choices.grade)
  // 予算で厳格に絞る（予算オーバーは出さない＝本人方針）。さらに用途の足切りも適用。
  const within = released.filter(
    (item) => item.price * priceFactor <= budget && purposeOk(item, choices.purpose)
  )

  const scored = within.map((item) => scoreItem(item, choices))
  const sortBy = choices.sortBy || 'recommended'

  // 「おすすめ順」は点数順で上位を抽出。同点は「（動物なら望遠が長い順）→新しい順→画質→安い順」で
  // 決定的に並べ、『安いだけの旧型』が最上位に居座らないようにする。
  // それ以外は“母集団全体”をその条件で並べてから上位を取る
  // （こうすると「価格が高い順」でシネマ機などの高級機もちゃんと結果に出てくる）
  if (sortBy === 'recommended') {
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        (choices.subject === 'animal' ? (b.focalMax || 0) - (a.focalMax || 0) : 0) ||
        (PRODUCT_YEARS[b.name] || 0) - (PRODUCT_YEARS[a.name] || 0) ||
        ((b.params && b.params.imageQuality) || 0) - ((a.params && a.params.imageQuality) || 0) ||
        a.price - b.price
    )
    return scored.slice(0, limit)
  }
  return applySort(scored, sortBy).slice(0, limit)
}

export function searchCameras(cameras, choices) {
  const filtered =
    choices.brand && choices.brand !== 'any'
      ? cameras.filter((c) => c.brand === choices.brand)
      : cameras
  // カメラに無関係なレンズ専用こだわり（マクロ・ボケ・超望遠）はスコアに使わない。
  // choices 自体は書き換えず、ここでだけ除外する＝レンズに戻せば選択は復活（非破壊）。searchLenses と対称。
  const cameraChoices = {
    ...choices,
    priorities: (choices.priorities || []).filter((p) => isPriorityForGear(p, 'camera')),
  }
  return run(filtered, cameraChoices, 12)
}

export function searchLenses(lenses, choices) {
  const filtered =
    choices.mount && choices.mount !== 'any'
      ? lenses.filter((l) => l.mount === choices.mount)
      : lenses
  // レンズに無関係なボディ専用こだわり（RAW動画収録など）はスコアに使わない。
  // ただし choices 自体は書き換えず、ここでだけ除外する＝カメラに戻せば選択は復活（非破壊）。
  const lensChoices = {
    ...choices,
    priorities: (choices.priorities || []).filter((p) => isPriorityForGear(p, 'lens')),
  }
  return run(filtered, lensChoices, 12)
}
