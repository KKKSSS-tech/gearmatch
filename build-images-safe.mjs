// 画像が「まだ無い」製品にだけ、高信頼の製品写真URLを"追記"する安全スクリプト。
//   - 既存 build-images.mjs は触らず・実行せず（過去QAで手動削除した誤画像を復活させないため）。
//   - 既存 src/data/images.js（PRODUCT_IMAGES）の既存エントリは絶対に上書き・削除しない。新規キーのみ追記。
//   - 取得は無料・ライセンス明確な Wikipedia / Wikimedia のみ。誤画像ゼロを最優先（量より正確さ）。
//
// build-images.mjs より厳格にした点（誤画像が混ざらない設計）:
//   ① あいまい検索を使わず、英語Wikipedia の「完全一致タイトル」で記事を解決する（titles= ＋ redirects=1）。
//      （旧スクリプトは generator=search のあいまい検索で別製品を拾う余地があった）
//   ② 解決後の正式タイトルにブランド＋型番が含まれることを確認（リダイレクトの暴走＝別世代の記事を弾く）。
//   ③ 記事本文(extract)が camera/lens 系の語を含むことを確認（同名の別物＝音楽・車種等を弾く）。
//   ④ リード画像の「ファイル名」にもブランド＋型番が含まれることを確認（旧 enwiki 経路はこの検証が無かった）。
//   ⑤ logo/diagram/sensor 図などのファイル名・SVG/GIF を除外（例: Nikon Z9 のリード画像はロゴ→不採用）。
//   ⑥ 最終URLは HTTP 200 かつ Content-Type: image/* を実際に検証してから採用。
//
// 取得方式: MediaWiki Action API を最大20件ずつ一括取得（REST summary は別タイトル連続でレート制限429になるため）。
//
// 使い方:
//   node build-images-safe.mjs            … ドライラン（採用候補の一覧を表示するだけ。ファイルは書き換えない）
//   node build-images-safe.mjs --commons  … 上記で埋まらない分のみ Commons の厳格ファイル検索も試す（任意・既定OFF）
//   node build-images-safe.mjs --write    … 検証を通った候補を images.js に"追記"する（既存エントリは不変）
//   （--write は --commons と併用可。--limit=N で対象件数を制限してお試しも可能）
//
// 将来の有料/商用APIでさらに網羅率を上げる候補（本スクリプトでは扱わない＝確証が持てない画像は入れない）:
//   - 楽天商品検索API（要アプリID。日本の現行カメラ/レンズに強い。商品画像URLが取れる）
//   - Yahoo!ショッピング 商品検索API（同上。日本向け在庫が厚い）
//   - 各メーカーのプレスキット/ニュースルーム（公式の製品写真。利用規約の確認が必要）
//   - Bing/Google 画像API 等（要課金・ライセンス確認）

import { CAMERAS } from './src/data/cameras.js'
import { LENSES } from './src/data/lenses.js'
import { PRODUCT_IMAGES } from './src/data/images.js'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const IMAGES_PATH = join(__dirname, 'src/data/images.js')
// 注意: upload.wikimedia.org は UA に "example.com" 等のプレースホルダを含むと 403 で弾く。
// 既存 build-images.mjs と同じクリーンな UA を使う（画像CDN・API両方で 200）。
const UA = 'CameraFinderPracticeApp/1.0 (learning project; safe image backfill)'
const BATCH = 20 // Action API の extracts は exlimit 最大20
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const argv = new Set(process.argv.slice(2))
const WRITE = argv.has('--write')
const USE_COMMONS = argv.has('--commons')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity

// 文字正規化：英数字以外を落として比較しやすくする。Sony の「α」は a 扱い（型番一致を効かせる）。
const norm = (s) => (s || '').toLowerCase().replace(/α/g, 'a').replace(/[^a-z0-9]/g, '')
// 型番トークン（数字を含む2文字以上の塊）。α7→a7 のように α を a に直してから抽出する。
const modelTokens = (name) =>
  ((name || '').toLowerCase().replace(/α/g, 'a').match(/[a-z]*\d[a-z0-9.-]*/g) || [])
    .map((m) => m.replace(/[.-]/g, ''))
    .filter((m) => m.length >= 2)
const brandOf = (name) => norm((name || '').trim().split(/\s+/)[0])

// 記事本文がカメラ/レンズの話だと判断できる語（同名の別物＝音楽・車種・地名などを弾く）
const SUBJECT_RE = /camera|mirrorless|\bdslr\b|\bslr\b|camcorder|cinema|lens|lenses|teleconverter|レンズ|カメラ/i
// 製品写真ではないファイル名（ロゴ・図表・地図・チャート等）を弾く簡易ブロックリスト
const BAD_FILE_RE = /logo|icon|diagram|chart|graph|\bmap\b|roadmap|mtf|sensor[-_ ]?size|comparison|timeline|family|lineup|svg/i
// 採用してよい画像拡張子（SVG/GIF/図表系は除外）
const GOOD_EXT_RE = /\.(jpe?g|png|webp)$/i

// JSON取得（429/5xx は指数バックオフでリトライ。Action API は緩いがお守り）。
async function getJSON(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (res.status === 429 || res.status >= 500) {
        await sleep(600 * (i + 1))
        continue
      }
      if (!res.ok) return null
      return await res.json()
    } catch {
      await sleep(400 * (i + 1))
    }
  }
  return null
}

// URLが実在し、画像として配信されるか実検証（HEAD→ダメなら1バイトGETでヘッダ確認）。
// 429/5xx は一時的なスロットルなのでバックオフして数回リトライ（良品の取りこぼしを防ぐ）。
async function isLiveImage(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    let throttled = false
    for (const init of [
      { method: 'HEAD' },
      { method: 'GET', headers: { Range: 'bytes=0-0' } },
    ]) {
      try {
        const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init.headers || {}) } })
        if (res.status === 429 || res.status >= 500) {
          throttled = true
          continue
        }
        if (!res.ok && res.status !== 206) continue
        const ct = res.headers.get('content-type') || ''
        if (/^image\//i.test(ct)) return true
      } catch {
        throttled = true
      }
    }
    if (!throttled) return false // 200でも画像でない等＝本物の不可。リトライ不要。
    await sleep(800 * (attempt + 1)) // スロットルされたので待って再試行
  }
  return false
}

// 画像ファイル名から、採用可否（ブランド＆型番＆拡張子＆ブロックリスト）を判定。
function fileLooksRight(name, fileNameOrUrl) {
  if (!fileNameOrUrl) return false
  const decoded = decodeURIComponent(fileNameOrUrl)
  const fname = decoded.split('/').pop() || ''
  if (!GOOD_EXT_RE.test(fname)) return false
  if (BAD_FILE_RE.test(fname)) return false
  const nf = norm(fname)
  const b = brandOf(name)
  const models = modelTokens(name)
  if (b.length >= 2 && !nf.includes(b)) return false // ブランド名がファイル名に無い → 別被写体の恐れ
  if (models.length > 0 && !models.some((m) => nf.includes(m))) return false // 型番もファイル名で確認
  return true
}

// ① 英語Wikipedia：完全一致タイトルを Action API で最大20件ずつ一括解決し、リード画像を取り出す。
//    返り値: Map<productName, thumbUrl|null>
async function wikipediaBatch(names) {
  const out = new Map(names.map((n) => [n, null]))
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1' +
    '&prop=pageimages|extracts&piprop=thumbnail|name&pithumbsize=960&pilimit=20' +
    '&exintro=1&explaintext=1&exlimit=20&titles=' +
    encodeURIComponent(names.join('|'))
  const j = await getJSON(url)
  const q = j && j.query
  if (!q) return out

  // 入力タイトル → 正規化 → リダイレクト先（正式タイトル）への対応表を作る
  const normMap = {}
  for (const n of q.normalized || []) normMap[n.from] = n.to
  const redirMap = {}
  for (const r of q.redirects || []) redirMap[r.from] = r.to
  const byTitle = {}
  for (const pid of Object.keys(q.pages || {})) {
    const p = q.pages[pid]
    byTitle[p.title] = p
  }
  const resolveTitle = (name) => {
    let t = normMap[name] || name
    for (let i = 0; i < 5 && redirMap[t]; i++) t = redirMap[t]
    return t
  }

  for (const name of names) {
    const p = byTitle[resolveTitle(name)]
    if (!p || 'missing' in p) continue
    // 解決後の正式タイトルが、このブランド＋型番の記事であることを確認
    const ct = norm(p.title)
    const cn = norm(name)
    const b = brandOf(name)
    const models = modelTokens(name)
    if (b.length >= 2 && !ct.includes(b)) continue
    if (models.length > 0 && !models.some((m) => ct.includes(m))) continue
    // 兄弟機種へのリダイレクトを弾く：名前と正式タイトルが「片方が片方の接頭辞」かつ不一致なら別世代/別派生。
    //   例: Fujifilm X-H2 → X-H2S（接尾辞S）、Canon EOS Ra → Canon EOS R（接尾辞a）。誤画像になるので不採用。
    if (cn !== ct && (ct.startsWith(cn) || cn.startsWith(ct))) continue
    // 本文がカメラ/レンズの話であることを確認
    if (!SUBJECT_RE.test(p.extract || '')) continue
    // リード画像（pageimages）を取り出し、ファイル名でも検証
    const thumb = p.thumbnail && p.thumbnail.source
    if (!thumb || !fileLooksRight(name, p.pageimage || thumb)) continue
    out.set(name, thumb)
  }
  return out
}

// ② Commons 厳格ファイル検索（--commons の時だけ）。ファイル名にブランド＋型番(3文字以上)を必須にして誤画像を弾く。
async function commonsStrict(name) {
  const b = brandOf(name)
  const models = modelTokens(name).filter((m) => m.length >= 3) // 弱い型番(a7等)は誤マッチしやすいので使わない
  if (b.length < 2 || models.length === 0) return null
  const j = await getJSON(
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      name
    )}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime&iiurlwidth=960&format=json`
  )
  await sleep(60)
  const pages = j && j.query && j.query.pages
  if (!pages) return null
  for (const pg of Object.values(pages).sort((a, b2) => (a.index || 99) - (b2.index || 99))) {
    const info = pg.imageinfo && pg.imageinfo[0]
    if (!info) continue
    if (!/^image\/(jpeg|png|webp)/.test(info.mime || '')) continue
    const url = info.thumburl || info.url
    if (fileLooksRight(name, pg.title || url)) return url
  }
  return null
}

// ---- 対象：画像がまだ無い製品だけ ----
const existingKeys = Object.keys(PRODUCT_IMAGES)
const have = new Set(existingKeys)
const targets = [
  ...CAMERAS.map((c) => c.name),
  ...LENSES.map((l) => l.name),
].filter((name) => !have.has(name))

const work = targets.slice(0, LIMIT)
console.log(
  `対象（画像なし）: ${targets.length}件 / 全${CAMERAS.length + LENSES.length}製品（既存画像 ${existingKeys.length}件は不変）`
)
if (work.length < targets.length) console.log(`--limit により ${work.length}件のみ処理`)

const additions = {}
let viaWiki = 0
let viaCommons = 0

// 20件ずつ Wikipedia 一括解決 →（任意で）Commons → 実URL検証 → 採用
for (let start = 0; start < work.length; start += BATCH) {
  const batch = work.slice(start, start + BATCH)
  const wiki = await wikipediaBatch(batch)
  for (const name of batch) {
    let url = wiki.get(name)
    let via = 'wiki'
    if (!url && USE_COMMONS) {
      url = await commonsStrict(name)
      via = 'commons'
    }
    if (url && (await isLiveImage(url))) {
      additions[name] = url
      if (via === 'wiki') viaWiki++
      else viaCommons++
      console.log(`  ✓ [${via}] ${name}\n      ${url}`)
    }
  }
  console.log(`  …${Math.min(start + BATCH, work.length)}/${work.length} 走査`)
  await sleep(200)
}

const addCount = Object.keys(additions).length
console.log(
  `\n採用候補: ${addCount}件（wiki ${viaWiki} + commons ${viaCommons}）／走査 ${work.length}件`
)

if (!WRITE) {
  console.log('\n[ドライラン] 上の候補を確認してください。問題なければ --write を付けて再実行で images.js に追記します。')
  console.log('  例: node build-images-safe.mjs --write' + (USE_COMMONS ? ' --commons' : ''))
} else if (addCount === 0) {
  console.log('\n追記なし（採用候補が0件）。images.js は変更しません。')
} else {
  // 既存エントリを一字一句保持するため、現ファイルを .bak に退避してから追記する。
  const original = await readFile(IMAGES_PATH, 'utf8')
  await writeFile(IMAGES_PATH + '.bak', original, 'utf8')

  // 既存を先頭順のまま保持し、新規キーだけ後ろに足す（既存値は絶対に変更しない）。
  const merged = { ...PRODUCT_IMAGES, ...additions }

  // 不変条件チェック：既存キーの値が1つでも変わる/消える設計なら中止（安全装置）。
  for (const k of existingKeys) {
    if (merged[k] !== PRODUCT_IMAGES[k]) {
      console.error(`中止: 既存エントリ "${k}" が変化します。追記を行いません。`)
      process.exit(1)
    }
  }
  const mergedKeys = Object.keys(merged)
  for (let k = 0; k < existingKeys.length; k++) {
    if (mergedKeys[k] !== existingKeys[k]) {
      console.error('中止: 既存キーの順序が崩れます。追記を行いません。')
      process.exit(1)
    }
  }

  const body =
    '// 製品名 → Wikipedia/Wikimedia の製品画像URL（build-images.mjs が自動生成）。\n' +
    '// 直リンク可・ライセンス明確なWikimedia画像。該当なしはアプリ側で📷プレースホルダにフォールバック。\n' +
    '// ※画像が無かった製品への"追記"は build-images-safe.mjs が高信頼一致のみ追加（既存エントリは不変）。\n' +
    'export const PRODUCT_IMAGES = ' +
    JSON.stringify(merged, null, 2) +
    '\n'
  await writeFile(IMAGES_PATH, body, 'utf8')
  console.log(`\nimages.js に ${addCount}件 追記しました（合計 ${mergedKeys.length}件）。退避: src/data/images.js.bak`)
}
