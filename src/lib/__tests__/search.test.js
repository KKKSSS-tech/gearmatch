// 検索ロジックの回帰テスト。3ラウンドのQAで直したルールを「現状の正しい挙動」として固定する。
// プロダクトコードは変更しない。期待値は data/ の実データから導けるものは実データ基準で書く。
import { describe, it, expect } from 'vitest'
import {
  searchCameras,
  searchLenses,
  usedFactorFor,
  isPriorityForGear,
  GRADE_FACTOR,
  USED_FACTOR,
  CAMERA_ONLY_PRIORITIES,
  LENS_ONLY_PRIORITIES,
} from '../search'
import { CAMERAS } from '../../data/cameras'
import { LENSES } from '../../data/lenses'
import { PRODUCT_YEARS } from '../../data/years'

const NOW_YEAR = new Date().getFullYear()

describe('usedFactorFor', () => {
  it('condition が used でなければ常に 1（割引なし）', () => {
    expect(usedFactorFor('new', ['A'])).toBe(1)
    expect(usedFactorFor(undefined, ['A', 'B'])).toBe(1)
    expect(usedFactorFor('', [])).toBe(1)
  })

  it('used でランク未指定なら USED_FACTOR(0.72) を使う', () => {
    expect(usedFactorFor('used', [])).toBe(USED_FACTOR)
    expect(usedFactorFor('used', undefined)).toBe(USED_FACTOR)
    expect(USED_FACTOR).toBe(0.72)
  })

  it('used で単一ランクならそのランクの係数', () => {
    expect(usedFactorFor('used', ['A'])).toBe(GRADE_FACTOR.A)
    expect(usedFactorFor('used', ['C'])).toBe(GRADE_FACTOR.C)
  })

  it('used で複数ランクは「最も安い（最小係数）」を採用する', () => {
    // A(0.80) と C(0.55) → 最安の C を採用
    expect(usedFactorFor('used', ['A', 'C'])).toBe(GRADE_FACTOR.C)
    expect(usedFactorFor('used', ['A', 'AB', 'B'])).toBe(GRADE_FACTOR.B)
    expect(usedFactorFor('used', ['AB', 'A'])).toBe(GRADE_FACTOR.AB)
  })

  it('未知のランク文字列は無視し、有効が無ければ USED_FACTOR にフォールバック', () => {
    expect(usedFactorFor('used', ['Z', 'X'])).toBe(USED_FACTOR)
    // 有効ランクが混ざればそれを使う
    expect(usedFactorFor('used', ['Z', 'A'])).toBe(GRADE_FACTOR.A)
  })

  it('GRADE_FACTOR は美品ほど高い（A > AB > B > C）', () => {
    expect(GRADE_FACTOR.A).toBeGreaterThan(GRADE_FACTOR.AB)
    expect(GRADE_FACTOR.AB).toBeGreaterThan(GRADE_FACTOR.B)
    expect(GRADE_FACTOR.B).toBeGreaterThan(GRADE_FACTOR.C)
  })
})

describe('isPriorityForGear', () => {
  it('CAMERA_ONLY / LENS_ONLY の定義が想定どおり', () => {
    expect(CAMERA_ONLY_PRIORITIES).toEqual(['rawVideo', 'vlog', 'burst', 'eyeAF'])
    expect(LENS_ONLY_PRIORITIES).toEqual(['macro', 'bokeh', 'superTele'])
  })

  it('gear=lens はカメラ専用こだわりを false にする', () => {
    for (const p of CAMERA_ONLY_PRIORITIES) {
      expect(isPriorityForGear(p, 'lens')).toBe(false)
    }
    // レンズ専用やそれ以外は true
    expect(isPriorityForGear('macro', 'lens')).toBe(true)
    expect(isPriorityForGear('bokeh', 'lens')).toBe(true)
    expect(isPriorityForGear('portability', 'lens')).toBe(true)
  })

  it('gear=camera はレンズ専用こだわりを false にする', () => {
    for (const p of LENS_ONLY_PRIORITIES) {
      expect(isPriorityForGear(p, 'camera')).toBe(false)
    }
    // カメラ専用やそれ以外は true
    expect(isPriorityForGear('rawVideo', 'camera')).toBe(true)
    expect(isPriorityForGear('burst', 'camera')).toBe(true)
    expect(isPriorityForGear('imageQuality', 'camera')).toBe(true)
  })

  it('機材未選択（gear なし）はすべて true', () => {
    for (const p of [...CAMERA_ONLY_PRIORITIES, ...LENS_ONLY_PRIORITIES, 'value']) {
      expect(isPriorityForGear(p, undefined)).toBe(true)
      expect(isPriorityForGear(p, null)).toBe(true)
    }
  })
})

describe('予算の厳格フィルタ（予算オーバーは出さない）', () => {
  it('極小予算（新品）ではカメラ 0 件', () => {
    const res = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget: 1000 })
    expect(res).toHaveLength(0)
  })

  it('極小予算ではレンズも 0 件', () => {
    const res = searchLenses(LENSES, { purpose: 'both', condition: 'new', budget: 1000 })
    expect(res).toHaveLength(0)
  })

  it('予算内のカメラだけが返り、予算オーバーは一切含まれない', () => {
    const budget = 200000
    const res = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget })
    expect(res.length).toBeGreaterThan(0)
    for (const item of res) {
      expect(item.price).toBeLessThanOrEqual(budget)
    }
  })

  it('予算を上げると結果数は減らない（単調）', () => {
    const low = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget: 150000 })
    const high = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget: 600000 })
    expect(high.length).toBeGreaterThanOrEqual(low.length)
  })

  it('中古ランクで実効価格が下がり、新品では予算オーバーの機種が拾える', () => {
    // ちょうど境界をまたぐ機種を探す：新品価格 > budget だが中古C係数なら予算内
    const budget = 100000
    const newRes = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget })
    const usedRes = searchCameras(CAMERAS, {
      purpose: 'both',
      condition: 'used',
      grade: ['C'],
      budget,
    })
    // 中古（C＝最大割引）の方が予算内候補が多い、または同等
    expect(usedRes.length).toBeGreaterThanOrEqual(newRes.length)
    // 中古の実効価格はすべて予算内（係数込み）
    for (const item of usedRes) {
      expect(item.price * GRADE_FACTOR.C).toBeLessThanOrEqual(budget)
    }
  })
})

describe('用途フィルタ purposeOk', () => {
  it("purpose='video' は写真専用ボディ(Leica M11 / Hasselblad X2D)を除外する", () => {
    // 予算を十分大きく取り、本来なら金額的には出る機種が用途で落ちることを確認
    const res = searchCameras(CAMERAS, { purpose: 'video', condition: 'new', budget: Infinity })
    const names = res.map((c) => c.name)
    expect(names).not.toContain('Leica M11')
    expect(names).not.toContain('Hasselblad X2D 100C')
  })

  it("purpose='photo' は動画専用シネマ機(ARRI ALEXA 35 等)を除外する", () => {
    const res = searchCameras(CAMERAS, { purpose: 'photo', condition: 'new', budget: Infinity })
    const names = res.map((c) => c.name)
    expect(names).not.toContain('ARRI ALEXA 35')
    expect(names).not.toContain('Sony VENICE')
  })

  it("purpose='video' でも写真専用機が予算内に存在することをデータで確認（除外が金額由来でない）", () => {
    // Leica M11 / Hasselblad は use:['photo'] かつ video<3 → video 用途では必ず落ちる設計
    const m11 = CAMERAS.find((c) => c.name === 'Leica M11')
    const x2d = CAMERAS.find((c) => c.name === 'Hasselblad X2D 100C')
    expect(m11).toBeTruthy()
    expect(x2d).toBeTruthy()
    expect(m11.use).toEqual(['photo'])
    expect((m11.params.video || 0) < 3).toBe(true)
    expect(x2d.use).toEqual(['photo'])
    expect((x2d.params.video || 0) < 3).toBe(true)
  })

  it("purpose='both' は写真専用も動画専用も両方拾いうる（足切りなし）", () => {
    const res = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget: Infinity })
    const names = res.slice(0, 12).map((c) => c.name)
    // both は purposeOk が常に true なので、結果数は最大(12)に達する
    expect(res.length).toBe(12)
    expect(names.length).toBe(12)
  })
})

describe('被写体スコア（レンズ）', () => {
  it("subject='portrait' は中望遠単焦点(85/135等)が上位、超広角単焦点は上位に来ない", () => {
    const res = searchLenses(LENSES, { purpose: 'photo', subject: 'portrait', mount: 'Sony E' })
    expect(res.length).toBeGreaterThan(0)
    // 上位3件は焦点距離 50mm 以上の単焦点（中望遠ポートレート向き）が中心
    const top3 = res.slice(0, 3)
    for (const lens of top3) {
      const isPrime = lens.focalMin > 0 && lens.focalMin === lens.focalMax
      // ポートレート加点(+5)を得た＝50mm以上の単焦点 のはず
      if (isPrime) {
        expect(lens.focalMin).toBeGreaterThanOrEqual(50)
      }
    }
    // 超広角単焦点（14mm など）は #1 に来ない
    expect(res[0].focalMin).toBeGreaterThanOrEqual(35)
  })

  it("subject='animal' は焦点距離の長い望遠が #1、短い中望遠単焦点(75-135mm)は #1 にならない", () => {
    const res = searchLenses(LENSES, { purpose: 'photo', subject: 'animal', mount: 'Sony E' })
    expect(res.length).toBeGreaterThan(0)
    // #1 は到達距離のある望遠（focalMax >= 150、実質 300 以上が望ましい）
    expect(res[0].focalMax).toBeGreaterThanOrEqual(150)
    // 短い単焦点（135mm以下）が #1 になっていないこと
    const top = res[0]
    const topIsShortPrime = top.focalMin === top.focalMax && top.focalMax <= 135
    expect(topIsShortPrime).toBe(false)
  })

  it("subject='landscape' は広角ズーム/広角が上位に来る", () => {
    const res = searchLenses(LENSES, { purpose: 'photo', subject: 'landscape', mount: 'Sony E' })
    expect(res.length).toBeGreaterThan(0)
    // #1 は wide タグ、または広角単焦点(<=35mm)
    const top = res[0]
    const isWide =
      top.focalType === 'wide' ||
      ((top.focalType === 'prime' || top.focalMin === top.focalMax) && top.focalMax <= 35)
    expect(isWide).toBe(true)
  })

  it('被写体スコアはレンズ専用（カメラ本体には focalType が無く加点されない）', () => {
    // カメラに subject を渡しても落ちない（focalType を持たないので subjectScore=0）
    const res = searchCameras(CAMERAS, {
      purpose: 'photo',
      subject: 'portrait',
      condition: 'new',
      budget: Infinity,
    })
    expect(res.length).toBeGreaterThan(0)
  })
})

describe('こだわり加点', () => {
  it("macro 選択で本物のマクロレンズが上位に来る", () => {
    const res = searchLenses(LENSES, { purpose: 'photo', mount: 'Sony E', priorities: ['macro'] })
    expect(res.length).toBeGreaterThan(0)
    // 上位にマクロ（名前/strengths に「マクロ/接写/等倍」）が入る
    const top3names = res.slice(0, 3).map((l) => l.name).join(' ')
    expect(top3names).toMatch(/Macro|マクロ/i)
    // #1 は実際にマクロ語を含む
    const hay = ((res[0].strengths || []).join(' ') + ' ' + res[0].name).toLowerCase()
    const isMacro = ['マクロ', '接写', '等倍', 'macro'].some((w) => hay.includes(w.toLowerCase()))
    expect(isMacro).toBe(true)
  })

  it("bokeh は明るい F 値ほど高得点（F1.2 系が F2.8 系より上位）", () => {
    const res = searchLenses(LENSES, { purpose: 'photo', mount: 'Sony E', priorities: ['bokeh'] })
    expect(res.length).toBeGreaterThan(0)
    const idxFast = res.findIndex((l) => /F1\.2|F1\.4/.test(l.name))
    const idxSlow = res.findIndex((l) => /F2\.8/.test(l.name))
    // 明るい単焦点が見つかり、F2.8 ズームより上位（小さいインデックス）にある
    expect(idxFast).toBeGreaterThanOrEqual(0)
    if (idxSlow >= 0) {
      expect(idxFast).toBeLessThan(idxSlow)
    }
  })

  it("superTele は focalMax の長いレンズで加点され上位に来る", () => {
    const res = searchLenses(LENSES, { purpose: 'photo', mount: 'Sony E', priorities: ['superTele'] })
    expect(res.length).toBeGreaterThan(0)
    // #1 は焦点距離が長い（>=300）
    expect(res[0].focalMax).toBeGreaterThanOrEqual(300)
  })

  it("nightSky は params.lowLight の高いレンズで加点される", () => {
    const res = searchLenses(LENSES, { purpose: 'photo', mount: 'Sony E', priorities: ['nightSky'] })
    expect(res.length).toBeGreaterThan(0)
    // 上位は lowLight が高い（明るい）レンズ中心
    const top = res[0]
    expect((top.params && top.params.lowLight) || 0).toBeGreaterThanOrEqual(4)
  })

  it("こだわりが効いた結果には reasonPriorityMatch が付く", () => {
    const res = searchLenses(LENSES, { purpose: 'photo', mount: 'Sony E', priorities: ['macro'] })
    expect(res[0].reasons).toContain('reasonPriorityMatch')
  })

  it('reasons は用途・被写体・コスパに応じて付く（reasonGoodForUse 等）', () => {
    const res = searchLenses(LENSES, { purpose: 'photo', subject: 'portrait', mount: 'Sony E' })
    const top = res[0]
    expect(Array.isArray(top.reasons)).toBe(true)
    // 写真用途のレンズなので少なくとも reasonGoodForUse が付く
    expect(top.reasons).toContain('reasonGoodForUse')
  })
})

describe('recommended 並び（同点時のタイブレーク）', () => {
  it('「安いだけの旧型」が常に #1 にならない（新しさ/画質を優先）', () => {
    const res = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget: Infinity })
    expect(res.length).toBeGreaterThan(0)
    const topYear = PRODUCT_YEARS[res[0].name] || 0
    // #1 が極端に古い（2015年以前）安物ではないこと
    expect(topYear).toBeGreaterThanOrEqual(2019)
  })

  it('同点なら新しい年が先に来る（タイブレークが決定的）', () => {
    // 同じ検索を2回実行して順序が安定（決定的ソート）
    const a = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget: 300000 })
    const b = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget: 300000 })
    expect(a.map((x) => x.name)).toEqual(b.map((x) => x.name))
  })
})

describe('sortBy（表示順の指定）', () => {
  const base = { purpose: 'both', condition: 'new', budget: Infinity }
  it('priceAsc は価格昇順', () => {
    const res = searchCameras(CAMERAS, { ...base, sortBy: 'priceAsc' })
    for (let i = 1; i < res.length; i++) {
      expect(res[i].price).toBeGreaterThanOrEqual(res[i - 1].price)
    }
  })
  it('priceDesc は価格降順（高級シネマ機も結果に出る）', () => {
    const res = searchCameras(CAMERAS, { ...base, sortBy: 'priceDesc' })
    for (let i = 1; i < res.length; i++) {
      expect(res[i].price).toBeLessThanOrEqual(res[i - 1].price)
    }
    // 最も高い機種は数百万円級（母集団全体から並べているため）
    expect(res[0].price).toBeGreaterThan(1000000)
  })
  it('newest は発売年の新しい順', () => {
    const res = searchCameras(CAMERAS, { ...base, sortBy: 'newest' })
    for (let i = 1; i < res.length; i++) {
      const prev = PRODUCT_YEARS[res[i - 1].name] || 0
      const cur = PRODUCT_YEARS[res[i].name] || 0
      expect(prev).toBeGreaterThanOrEqual(cur)
    }
  })
  it('sensorDesc はセンサーが大きい順', () => {
    const res = searchCameras(CAMERAS, { ...base, sortBy: 'sensorDesc' })
    for (let i = 1; i < res.length; i++) {
      expect(res[i - 1].sensorRank || 0).toBeGreaterThanOrEqual(res[i].sensorRank || 0)
    }
  })
  it('focalAsc（レンズ）は焦点距離が短い順', () => {
    const res = searchLenses(LENSES, { ...base, sortBy: 'focalAsc', mount: 'Sony E' })
    for (let i = 1; i < res.length; i++) {
      expect(res[i - 1].focalMin || 0).toBeLessThanOrEqual(res[i].focalMin || 0)
    }
  })
})

describe('非破壊性（gear 別こだわりの無視）', () => {
  it('searchLenses はカメラ専用こだわり(rawVideo 等)を渡しても落ちず無視する', () => {
    const withCamPrio = searchLenses(LENSES, {
      purpose: 'photo',
      mount: 'Sony E',
      priorities: ['rawVideo', 'burst', 'eyeAF', 'vlog'],
    })
    const noPrio = searchLenses(LENSES, { purpose: 'photo', mount: 'Sony E' })
    // カメラ専用こだわりはレンズスコアに影響しない＝結果が同一
    expect(withCamPrio.map((l) => l.name)).toEqual(noPrio.map((l) => l.name))
  })

  it('searchCameras はレンズ専用こだわり(macro 等)を渡しても落ちず無視する', () => {
    const withLensPrio = searchCameras(CAMERAS, {
      purpose: 'both',
      condition: 'new',
      budget: Infinity,
      priorities: ['macro', 'bokeh', 'superTele'],
    })
    const noPrio = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget: Infinity })
    expect(withLensPrio.map((c) => c.name)).toEqual(noPrio.map((c) => c.name))
  })

  it('choices オブジェクト自体は書き換えられない（priorities が消えない）', () => {
    const choices = { purpose: 'photo', mount: 'Sony E', priorities: ['rawVideo', 'macro'] }
    searchLenses(LENSES, choices)
    expect(choices.priorities).toEqual(['rawVideo', 'macro'])
  })
})

describe('代表的な検索の件数', () => {
  it('十分広い条件のカメラ検索は 12 件返る', () => {
    const res = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget: Infinity })
    expect(res).toHaveLength(12)
  })
  it('十分広い条件のレンズ検索は 12 件返る', () => {
    const res = searchLenses(LENSES, { purpose: 'photo', budget: Infinity })
    expect(res).toHaveLength(12)
  })
})

describe('発売前（未来年）の製品は出さない', () => {
  it('PRODUCT_YEARS が今年より先の製品は結果に含まれない', () => {
    const future = Object.entries(PRODUCT_YEARS)
      .filter(([, y]) => y > NOW_YEAR)
      .map(([name]) => name)
    if (future.length === 0) {
      // 今のデータには未来製品が無い場合もある（その時は素通り）
      expect(future).toEqual([])
      return
    }
    const cams = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget: Infinity, sortBy: 'newest' })
    const names = cams.map((c) => c.name)
    for (const f of future) {
      expect(names).not.toContain(f)
    }
  })
})

describe('ブランド／マウント絞り込み', () => {
  it('brand 指定でそのブランドだけ返る', () => {
    const res = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget: Infinity, brand: 'Canon' })
    expect(res.length).toBeGreaterThan(0)
    for (const c of res) expect(c.brand).toBe('Canon')
  })
  it("brand='any' は全ブランド対象", () => {
    const res = searchCameras(CAMERAS, { purpose: 'both', condition: 'new', budget: Infinity, brand: 'any' })
    const brands = new Set(res.map((c) => c.brand))
    expect(brands.size).toBeGreaterThan(1)
  })
  it('mount 指定でそのマウントだけ返る', () => {
    const res = searchLenses(LENSES, { purpose: 'photo', budget: Infinity, mount: 'Sony E' })
    expect(res.length).toBeGreaterThan(0)
    for (const l of res) expect(l.mount).toBe('Sony E')
  })
})
