// 製品名から「実際の製品写真(Wikimedia)」URLを集めて src/data/images.js を生成する。
//  ① 英語Wikipedia 記事の代表画像（正確・高品質）を優先
//  ② 無ければ Wikimedia Commons のファイル検索（記事の無いレンズ等もカバー。誤画像はブランド＋型番一致で弾く）
// 直リンク可・ライセンス明確。該当なしはアプリ側で📷プレースホルダにフォールバック。
// 実行: node build-images.mjs
import { CAMERAS } from './src/data/cameras.js'
import { LENSES } from './src/data/lenses.js'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UA = 'CameraFinderPracticeApp/1.0 (learning project)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const modelTokens = (name) => (name.toLowerCase().match(/[a-z]*\d[a-z0-9.-]*/g) || []).map((m) => m.replace(/[.-]/g, '')).filter((m) => m.length >= 2)
const brandOf = (name) => norm(name.trim().split(/\s+/)[0])

// enwiki: 記事タイトルとの一致スコア（2=型番一致, 1=ブランド一致, 0=無関係）
function articleScore(name, title) {
  const t = norm(title)
  if (modelTokens(name).some((m) => t.includes(m))) return 2
  const b = brandOf(name)
  return b.length >= 2 && t.includes(b) ? 1 : 0
}

async function getJSON(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  }
}

// ① enwiki 記事の代表画像
async function wikipediaThumb(name, kind) {
  let best = null
  let bestScore = 0
  for (const query of [name + ' ' + kind, name]) {
    const j = await getJSON(
      `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=6&prop=pageimages&piprop=thumbnail&pithumbsize=600&pilimit=6&format=json&redirects=1`
    )
    const pages = j && j.query && j.query.pages
    if (pages) {
      for (const pg of Object.values(pages).sort((a, b) => (a.index || 99) - (b.index || 99))) {
        const thumb = pg && pg.thumbnail && pg.thumbnail.source
        if (!thumb) continue
        const s = articleScore(name, pg.title)
        if (s > bestScore) {
          best = thumb
          bestScore = s
          if (s >= 2) return best
        }
      }
    }
    await sleep(70)
    if (bestScore >= 2) break
  }
  return bestScore >= 1 ? best : null
}

// ② Commons ファイル検索（ブランド＆型番の両方がファイル名にある画像のみ＝誤画像を弾く）
async function commonsThumb(name) {
  const b = brandOf(name)
  const models = modelTokens(name)
  if (b.length < 2 || models.length === 0) return null
  const j = await getJSON(
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime&iiurlwidth=600&format=json`
  )
  const pages = j && j.query && j.query.pages
  if (!pages) return null
  for (const pg of Object.values(pages).sort((a, b2) => (a.index || 99) - (b2.index || 99))) {
    const info = pg.imageinfo && pg.imageinfo[0]
    if (!info) continue
    if (!/^image\/(jpeg|png|webp)/.test(info.mime || '')) continue // svg/ロゴ/図表を除外
    const fname = norm((pg.title || '').replace(/^file:/i, ''))
    if (fname.includes(b) && models.some((m) => fname.includes(m))) {
      return info.thumburl || info.url
    }
  }
  return null
}

const all = [
  ...CAMERAS.map((c) => ({ name: c.name, kind: 'camera' })),
  ...LENSES.map((l) => ({ name: l.name, kind: 'lens' })),
]

const map = {}
let wiki = 0
let commons = 0
for (const it of all) {
  let url = await wikipediaThumb(it.name, it.kind)
  if (url) wiki++
  if (!url) {
    url = await commonsThumb(it.name)
    if (url) commons++
  }
  if (url) map[it.name] = url
}

const hit = wiki + commons
const body =
  '// 製品名 → Wikipedia/Wikimedia の製品画像URL（build-images.mjs が自動生成）。\n' +
  '// 直リンク可・ライセンス明確なWikimedia画像。該当なしはアプリ側で📷プレースホルダにフォールバック。\n' +
  'export const PRODUCT_IMAGES = ' +
  JSON.stringify(map, null, 2) +
  '\n'
await writeFile(join(__dirname, 'src/data/images.js'), body, 'utf8')
console.log(`images.js written: ${hit}/${all.length} matched (wiki ${wiki} + commons ${commons})`)
