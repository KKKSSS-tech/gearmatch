// ステップ装飾画像を Wikimedia Commons から取得。
//  - intro: スライドショー用に複数枚(INTRO_SLIDES)
//  - gear / budget: 各1枚(STEP_IMAGES)
// ライセンス明確・直リンク可。横長・大きめ・写真(jpeg)のみ採用。
// 実行: node build-step-images.mjs
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UA = 'CameraFinderPracticeApp/1.0 (learning project)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 取得失敗・0件でも“絶対に空にしない”ための検証済みフォールバック（全URL HTTP 200 確認済み）。
// intro スライドは美しいクリエイター系のみを厳選。
const DEFAULT_SLIDES = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Leica_CL_with_Elmarit-TL_18mm_F2.8_Asph._in_box_%28L1000035%29.jpg/1920px-Leica_CL_with_Elmarit-TL_18mm_F2.8_Asph._in_box_%28L1000035%29.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/5/51/Leica_T_%28701%29_01.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Bokeh_of_camera_lens.jpg/1920px-Bokeh_of_camera_lens.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Mountain_lake_in_camera_lens_%28Unsplash%29.jpg/1920px-Mountain_lake_in_camera_lens_%28Unsplash%29.jpg',
]
const DEFAULT_GEAR =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Lens_camera_Industar_26_m.jpg/1920px-Lens_camera_Industar_26_m.jpg'
const DEFAULT_BUDGET =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Vintage_Yashica_35mm_SLR_Film_Camera%2C_Model_FX-2%2C_Made_In_Japan_%2816873299796%29.jpg/1920px-Vintage_Yashica_35mm_SLR_Film_Camera%2C_Model_FX-2%2C_Made_In_Japan_%2816873299796%29.jpg'

async function getJSON(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  }
}

// 検索ワードから「横長・大きめ・写真」の候補URLを最大n枚返す（usedで重複除外）
async function photos(search, used, n) {
  const j = await getJSON(
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(search)}&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1400&format=json`
  )
  const pages = j && j.query && j.query.pages
  if (!pages) return []
  const out = []
  for (const pg of Object.values(pages).sort((a, b) => (a.index || 99) - (b.index || 99))) {
    const info = pg.imageinfo && pg.imageinfo[0]
    if (!info) continue
    if (!/^image\/jpeg/.test(info.mime || '')) continue
    if ((info.width || 0) < (info.height || 0)) continue // 横長のみ
    if ((info.width || 0) < 1100) continue
    const title = (pg.title || '').toLowerCase()
    if (/logo|diagram|chart|\bmap\b|graph|icon|svg|scheme|sensor size|nuvola/.test(title)) continue
    // intro の世界観に合わない実用系カメラ（監視/野生動物/防犯/国境/医療 等）を除外
    if (/remote camera|trail camera|surveillance|cctv|security cam|webcam|dashcam|body[\s-]?cam|speed limit|border|biologist|wildlife|microscope|telescope|endoscop|x-ray|satellite|police|weapon/.test(title)) continue
    const url = info.thumburl || info.url
    if (url && !used.has(url)) {
      used.add(url)
      out.push(url)
      if (out.length >= n) break
    }
  }
  return out
}

const used = new Set()

// intro 用スライド（複数クエリから集めて最大6枚）
const introQueries = [
  'mirrorless camera photography',
  'photographer with camera',
  'camera lens bokeh',
  'professional camera equipment',
  'vintage film camera',
  'camera studio lighting',
]
const introSlides = []
for (const q of introQueries) {
  if (introSlides.length >= 6) break
  const got = await photos(q, used, 2)
  introSlides.push(...got)
  await sleep(80)
}
// 取得が4枚未満なら、検証済み既定スライドで穴埋め（重複は除外）。空にしない保険。
for (const u of DEFAULT_SLIDES) {
  if (introSlides.length >= 4) break
  if (!used.has(u)) {
    used.add(u)
    introSlides.push(u)
  }
}

// gear / budget は各1枚
async function one(queries) {
  for (const q of queries) {
    const got = await photos(q, used, 1)
    if (got[0]) return got[0]
    await sleep(80)
  }
  return null
}
const gear = (await one(['camera lens collection', 'mirrorless camera lens', 'dslr lens'])) || DEFAULT_GEAR
const budget = (await one(['vintage film camera', 'camera on tripod', 'photography studio camera'])) || DEFAULT_BUDGET

const stepImages = { gear, budget }

// 念のための最終ガード：何らかの理由でスライドが空なら既定で必ず埋める（空ファイルを書かない）
const finalSlides = (introSlides.length ? introSlides : DEFAULT_SLIDES).slice(0, 6)

const body =
  '// ステップ装飾用のクリエイター系写真(Wikimedia Commons・ライセンス明確)。build-step-images.mjs が生成。\n' +
  '// 読み込み失敗時はアプリ側でグラデーション背景にフォールバック。\n' +
  'export const STEP_IMAGES = ' +
  JSON.stringify(stepImages, null, 2) +
  '\n\n' +
  '// intro のスライドショー用（複数枚を順番にフェード表示）\n' +
  'export const INTRO_SLIDES = ' +
  JSON.stringify(finalSlides, null, 2) +
  '\n'
await writeFile(join(__dirname, 'src/data/stepImages.js'), body, 'utf8')
console.log(`stepImages.js written: intro slides ${finalSlides.length}, gear ${gear ? 1 : 0}, budget ${budget ? 1 : 0}`)
