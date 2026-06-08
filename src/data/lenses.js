// レンズ＝マウント別セグメント(segments/)を結合。重複名は先勝ちで除去。
import { SEG as SONY_E } from './segments/lens_sony_e.js'
import { SEG as CANON_RF } from './segments/lens_canon_rf.js'
import { SEG as NIKON_Z } from './segments/lens_nikon_z.js'
import { SEG as LMOUNT } from './segments/lens_l.js'
import { SEG as M43 } from './segments/lens_m43.js'
import { SEG as FUJI_X } from './segments/lens_x.js'
import { SEG as DSLR } from './segments/lens_dslr.js'

const ALL = [...SONY_E, ...CANON_RF, ...NIKON_Z, ...LMOUNT, ...M43, ...FUJI_X, ...DSLR]

const seen = new Set()
export const LENSES = ALL.filter((l) => {
  if (!l || !l.name || seen.has(l.name)) return false
  seen.add(l.name)
  return true
})
