// カメラ＝ブランド別セグメント(segments/)を結合。重複名は先勝ちで除去。
// 各セグメントは build時にサブエージェントが網羅生成（最新の Nikon ZR 等を含む）。
import { SEG as SONY } from './segments/cam_sony.js'
import { SEG as CANON } from './segments/cam_canon.js'
import { SEG as NIKON } from './segments/cam_nikon.js'
import { SEG as FUJI } from './segments/cam_fuji.js'
import { SEG as LM43 } from './segments/cam_lm43.js'
import { SEG as CINE } from './segments/cam_cine.js'

const ALL = [...SONY, ...CANON, ...NIKON, ...FUJI, ...LM43, ...CINE]

const seen = new Set()
export const CAMERAS = ALL.filter((c) => {
  if (!c || !c.name || seen.has(c.name)) return false
  seen.add(c.name)
  return true
})
