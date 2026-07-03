import { useState, useEffect, useRef, Fragment } from 'react'
import './App.css'
import ChipGroup from './components/ChipGroup'
import OptionChip from './components/OptionChip'
import ResultCard from './components/ResultCard'
import AdSlot from './components/AdSlot'
import ConsentBanner from './components/ConsentBanner'
import PrivacyPolicy from './components/PrivacyPolicy'
import Icon from './components/Icon'
import { CAMERAS } from './data/cameras'
import { LENSES } from './data/lenses'
import { STEP_IMAGES, INTRO_SLIDES } from './data/stepImages'
import { searchCameras, searchLenses, isPriorityForGear } from './lib/search'
import { track } from './lib/thirdParty'
import { formatPrice, toYen, currencySymbol, getBudgetPresets } from './lib/currency'
import { ja } from './i18n/ja'
import { en } from './i18n/en'
import { ko } from './i18n/ko'
import { zh } from './i18n/zh'
import { zhTW } from './i18n/zh-TW'
import { es } from './i18n/es'
import { fr } from './i18n/fr'
import { de } from './i18n/de'

const DICTS = { ja, en, ko, zh, 'zh-TW': zhTW, es, fr, de }

// 画面の順番。fewer "次へ" のため intro に「言語＋国」を、gear に「用途＋機材」をまとめた（6→4画面）。
const STEP_KEYS = ['intro', 'gear', 'budget', 'results']

// リサーチ中アニメの合計時間（ミリ秒）。結果をまとめる短い演出のみ。
const RESEARCH_MS = 7000

// カスタム予算の上限（現地通貨の素の数値）。指数表記や桁あふれで表示が壊れるのを防ぐガード。
const MAX_BUDGET_LOCAL = 100000000

// lead（共通のひと言）＋ audiences（響かせたい複数マーケット）。クリエイター層は維持しつつ拡張。
const LANG_INTROS = [
  {
    code: 'ja', label: '日本語',
    lead: '撮りたいものに、ちょうどいい機材を。',
    audiences: ['映像・写真クリエイター', '子供の写真をキレイに残したい人', '初めての一台', '旅行・趣味'],
  },
  {
    code: 'en', label: 'English',
    lead: 'The right gear for the way you shoot.',
    audiences: ['Aspiring creators', 'Great photos of your kids', 'Total beginners', 'Travel & hobby'],
  },
  {
    code: 'ko', label: '한국어',
    lead: '찍고 싶은 것에 딱 맞는 장비를.',
    audiences: ['영상·사진 크리에이터', '아이 사진을 예쁘게 남기고 싶은 분', '입문자', '여행·취미'],
  },
  {
    code: 'zh', label: '中文',
    lead: '为你想拍的一切，找到合适的器材。',
    audiences: ['影像·摄影创作者', '想给孩子拍好照片的父母', '零基础新手', '旅行·兴趣'],
  },
  {
    code: 'zh-TW', label: '繁體中文',
    lead: '為你想拍的一切，找到合適的器材。',
    audiences: ['影像・攝影創作者', '想幫孩子拍好照片的爸媽', '零基礎新手', '旅行・興趣'],
  },
  {
    code: 'es', label: 'Español',
    lead: 'El equipo justo para lo que quieres capturar.',
    audiences: ['Creadores en ciernes', 'Fotos preciosas de tus hijos', 'Principiantes', 'Viajes y afición'],
  },
  {
    code: 'fr', label: 'Français',
    lead: 'Le matériel idéal pour ce que tu veux filmer.',
    audiences: ['Créateurs en herbe', 'De belles photos de tes enfants', 'Débutants', 'Voyage & loisir'],
  },
  {
    code: 'de', label: 'Deutsch',
    lead: 'Die passende Ausrüstung für das, was du aufnimmst.',
    audiences: ['Angehende Creator', 'Schöne Fotos deiner Kinder', 'Einsteiger', 'Reise & Hobby'],
  },
]

function labelOf(options, value) {
  const o = (options || []).find((x) => x.value === value)
  return o ? o.label : value
}

// 結果以外のページ上部に置く「クリエイター感」の装飾写真（失敗時はグラデ帯にフォールバック）
function StepHero({ src }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <div className="step-hero step-hero-fallback" />
  return (
    <div className="step-hero">
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
    </div>
  )
}

// intro 用：複数枚をクロスフェードで切り替えるスライドショー
function IntroSlideshow({ slides }) {
  const valid = (slides || []).filter(Boolean)
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (valid.length < 2) return
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setIdx((p) => (p + 1) % valid.length), 4200)
    return () => clearInterval(id)
  }, [valid.length])
  if (valid.length === 0) return <div className="step-hero step-hero-fallback" />
  return (
    <div className="step-hero">
      {valid.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          loading={i === 0 ? 'eager' : 'lazy'}
          className={i === idx ? 'slide slide-on' : 'slide'}
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden'
          }}
        />
      ))}
    </div>
  )
}

function App() {
  const [step, setStep] = useState(0)
  const [researching, setResearching] = useState(false)
  const [researchStep, setResearchStep] = useState(0)
  const [introLangIdx, setIntroLangIdx] = useState(0) // intro でタイトル等を多言語に巡回表示
  const [budgetText, setBudgetText] = useState('') // カスタム予算の入力文字列（円への往復で桁が化けないよう生値を保持）
  const [privacyOpen, setPrivacyOpen] = useState(false) // プライバシーポリシーのモーダル開閉
  const headingRef = useRef(null) // ステップ見出し（フォーカス移動の受け皿。SR/キーボード向け）
  const researchSigRef = useRef(null) // 直近にリサーチ演出を出した選択のシグネチャ（往復で再生しない用）
  const researchTimersRef = useRef([]) // リサーチ演出のタイマー（スキップ時に確実に止めて、隠れた画面でのsetStateを防ぐ）
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const [choices, setChoices] = useState({
    language: null,
    region: null,
    purpose: null,
    gear: null,
    brand: null,
    mount: null,
    subject: null,
    budget: null,
    condition: null,
    grade: [], // 中古ランク：複数選択なので配列
    priorities: [], // こだわり（任意・複数）
    sortBy: null, // 結果の並び替え
  })

  const lang = choices.language || 'ja'
  const t = DICTS[lang] || ja

  const currentKey = STEP_KEYS[step]
  const isFirst = step === 0
  const isLast = step === STEP_KEYS.length - 1

  // intro で言語未選択のあいだ、タイトル・ようこそ・キャッチを多言語で巡回表示する
  const rotating = currentKey === 'intro' && !choices.language
  const displayCode = rotating ? LANG_INTROS[introLangIdx % LANG_INTROS.length].code : lang
  const tHead = DICTS[displayCode] || ja

  // <html lang> は「実際に選んだ言語」だけに同期する（未選択は ja）。
  // intro の言語巡回（displayCode）は見た目の演出だけに留め、読み上げ用の lang を 3.2秒ごとに
  // ja→en→ko… と振り回さない（スクリーンリーダー/グリフ整形が誤った言語を拾うのを防ぐ）。
  useEffect(() => {
    document.documentElement.lang = choices.language || 'ja'
  }, [choices.language])

  // intro・言語未選択のときだけ、表示言語をくるくる切り替える
  useEffect(() => {
    if (!rotating || reduceMotion) return
    const id = setInterval(() => setIntroLangIdx((i) => i + 1), 3200)
    return () => clearInterval(id)
  }, [rotating, reduceMotion])

  // 結果画面に入ったとき、結果に影響する選択が変わっていればリサーチ演出を見せる。
  // 戻る→進むの往復や並び替え変更だけでは 7秒の演出を繰り返さない（動き抑制設定の人は常にスキップ）。
  useEffect(() => {
    if (currentKey !== 'results') return
    // 結果に影響する選択のシグネチャ（sortBy は結果の並びだけで中身を変えないので除外）。
    // grade / priorities は「順序が違うだけ」で再生しないよう並べ替えてから比較する。
    // priorities は結果の“中身”（上位12件）を変えるので必ず含める（変えても演出が出ないと不整合に見える）。
    const sig = JSON.stringify({
      gear: choices.gear, brand: choices.brand, mount: choices.mount,
      subject: choices.subject, purpose: choices.purpose,
      budget: choices.budget, condition: choices.condition,
      grade: [...(choices.grade || [])].sort(),
      priorities: [...(choices.priorities || [])].sort(),
      region: choices.region,
    })
    const isNewSearch = researchSigRef.current !== sig
    // ファネル計測：新しい条件で検索した瞬間を1回だけ記録（動き抑制設定でも記録。送客クリック率の母数）
    if (isNewSearch) track('Search', { gear: choices.gear, region: choices.region, purpose: choices.purpose })
    if (reduceMotion || !isNewSearch) {
      researchSigRef.current = sig
      setResearching(false)
      return
    }
    researchSigRef.current = sig
    setResearching(true)
    setResearchStep(0)
    const iv = setInterval(() => setResearchStep((s) => s + 1), RESEARCH_MS / 4)
    const done = setTimeout(() => {
      setResearching(false)
    }, RESEARCH_MS)
    researchTimersRef.current = [iv, done]
    return () => {
      clearInterval(iv)
      clearTimeout(done)
    }
  }, [
    currentKey, reduceMotion,
    choices.gear, choices.brand, choices.mount, choices.subject, choices.purpose,
    choices.budget, choices.condition, choices.grade, choices.priorities, choices.region,
  ])

  // ステップ切り替え・リサーチ完了時に見出しへフォーカスを移す（SR/キーボードへ変化を伝える）
  useEffect(() => {
    if (currentKey === 'results' && researching) return // 演出中は移さない
    headingRef.current?.focus()
  }, [step, researching, currentKey])

  function canGoNext() {
    switch (currentKey) {
      case 'intro': // 言語＋国
        return !!(choices.language && choices.region)
      case 'gear': // 用途＋機材（＋メーカー or マウント＋被写体）
        if (!choices.purpose || !choices.gear) return false
        if (choices.gear === 'camera') return !!choices.brand
        return !!(choices.mount && choices.subject)
      case 'budget':
        return !!(
          choices.budget &&
          choices.condition &&
          (choices.condition !== 'used' || (choices.grade && choices.grade.length > 0))
        )
      default:
        return true
    }
  }

  const nextDisabled = isLast || !canGoNext()

  function goNext() {
    if (!nextDisabled) {
      setStep(step + 1)
      return
    }
    // 進めない状態でタップされたら、理由（次へ進む条件のヒント）を画面内に出して気づけるようにする
    document.getElementById('next-hint')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  function goBack() {
    if (!isFirst) setStep(step - 1)
  }
  // リサーチ演出をスキップ：タイマーを確実に止めてから閉じる（隠れた画面でのsetStateを防ぐ）
  function skipResearch() {
    researchTimersRef.current.forEach((id) => {
      clearInterval(id)
      clearTimeout(id)
    })
    researchTimersRef.current = []
    setResearching(false)
  }

  function select(key, value) {
    // 国（通貨）が変わったら、現地通貨で入力済みのカスタム予算は意味が変わるのでリセット
    if (key === 'region' && value !== choices.region) {
      setBudgetText('')
    }
    setChoices((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'region' && value !== prev.region) next.budget = null
      if (key === 'condition' && value !== 'used') next.grade = []
      if (key === 'gear' && value !== prev.gear) {
        // カメラ⇔レンズを「実際に切り替えたとき」だけ相手側の選択をリセット。
        // （すでに選択中の機材チップを押し直しただけのときは、並び替えやこだわりを消さない）
        if (value !== 'lens') {
          next.mount = null
          next.subject = null
        }
        if (value !== 'camera') next.brand = null
        next.sortBy = null // 並び替えの選択肢がカメラ/レンズで変わるのでリセット
        // ※ こだわり（priorities）は破壊しない。レンズでは表示とスコアから除外するだけにして、
        //   カメラへ戻すとボディ専用のこだわり（RAW動画収録など）が復活する（searchLenses 側で除外）。
      }
      return next
    })
  }

  // 中古ランクの複数選択トグル（'all' は全ランクの一括ON/OFF）
  function toggleGrade(value) {
    setChoices((prev) => {
      const allVals = t.gradeOptions.map((o) => o.value)
      const cur = prev.grade || []
      if (value === 'all') {
        const isAll = allVals.every((v) => cur.includes(v))
        return { ...prev, grade: isAll ? [] : allVals }
      }
      const nextGrade = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      return { ...prev, grade: nextGrade }
    })
  }
  const gradeAllActive =
    (choices.grade || []).length > 0 &&
    t.gradeOptions.every((o) => (choices.grade || []).includes(o.value))

  // こだわり（任意・複数）のトグル
  function togglePriority(value) {
    setChoices((prev) => {
      const cur = prev.priorities || []
      return {
        ...prev,
        priorities: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
      }
    })
  }

  const ad = (variant) => (
    <AdSlot label={t.adLabel} note={t.adNote} variant={variant} />
  )

  // 予算の選択肢を、選んだ国の通貨で「キリのいい現地金額」として動的に作る。
  // value は内部処理用の円換算値、label は整形済みの現地表記（formatPrice は再適用しない）。
  const budgetPresets = getBudgetPresets(choices.region, t.noLimitLabel, t.budgetPrefix)
  const budgetOptions = budgetPresets.map((p) => ({ value: p.valueYen, label: p.label }))
  // カスタム欄のプレースホルダ例。選んだ国の通貨で現実的な金額（最小プリセットの現地額）を出す
  const budgetPlaceholderNum = budgetPresets[0]?.local || 0
  const budgetPlaceholder = `${t.budgetCustomPlaceholderPrefix} ${budgetPlaceholderNum.toLocaleString()}`

  // サマリーに出すこだわり。今の機材で意味のある項目だけ（レンズ時はボディ専用を除外）。
  const visiblePriorities = (choices.priorities || []).filter((p) => isPriorityForGear(p, choices.gear))

  // 見直し用サマリー（選択済みのものだけ。クリックでそのステップへ戻る）
  const summaryItems = [
    choices.language && { step: 0, label: labelOf(t.languageOptions, choices.language) },
    choices.region && { step: 0, label: labelOf(t.regionOptions, choices.region) },
    choices.purpose && { step: 1, label: labelOf(t.purposeOptions, choices.purpose) },
    choices.gear && { step: 1, label: labelOf(t.gearOptions, choices.gear) },
    choices.brand && { step: 1, label: labelOf(t.brandOptions, choices.brand) },
    choices.mount && { step: 1, label: labelOf(t.mountOptions, choices.mount) },
    choices.subject && { step: 1, label: labelOf(t.subjectOptions, choices.subject) },
    choices.budget && {
      step: 2,
      label: choices.budget === Infinity ? t.noLimitLabel : formatPrice(choices.budget, choices.region),
    },
    choices.condition && { step: 2, label: labelOf(t.conditionOptions, choices.condition) },
    choices.grade && choices.grade.length > 0 && {
      step: 2,
      label: choices.grade.map((g) => labelOf(t.gradeOptions, g)).join(t.listSeparator),
    },
    visiblePriorities.length > 0 && {
      step: 2,
      label: visiblePriorities.map((p) => labelOf(t.priorityOptions, p)).join(t.listSeparator),
    },
  ].filter(Boolean)

  const pageTitle = currentKey === 'intro' ? tHead.titles.intro : t.titles[currentKey]

  function renderBody() {
    switch (currentKey) {
      case 'intro': {
        // 言語未選択なら巡回中の言語、選択後はその言語の lead＋audiences
        const heroEntry = rotating
          ? LANG_INTROS[introLangIdx % LANG_INTROS.length]
          : LANG_INTROS.find((l) => l.code === lang) || LANG_INTROS[0]
        return (
          <div className="intro">
            <div className="intro-hero" key={displayCode}>
              <p className="intro-lead">{heroEntry.lead}</p>
              <ul className="intro-audiences">
                {heroEntry.audiences.map((a) => (
                  <li key={a} className="audience-chip">{a}</li>
                ))}
              </ul>
            </div>
            <div className="intro-langs">
              <span className="intro-langs-label" id="intro-langs-label"><Icon name="globe" size={15} /> Language / 言語 / 언어</span>
              <div className="chips" role="group" aria-labelledby="intro-langs-label">
                {LANG_INTROS.map((l) => (
                  <OptionChip
                    key={l.code}
                    label={l.label}
                    active={choices.language === l.code}
                    onClick={() => select('language', l.code)}
                  />
                ))}
              </div>
            </div>
            {/* 言語を選んだら、同じ画面で国も選ぶ（ページ移動を減らす） */}
            {choices.language && (
              <ChipGroup label={t.q.region} options={t.regionOptions}
                value={choices.region} onSelect={(v) => select('region', v)} />
            )}
          </div>
        )
      }

      case 'gear':
        return (
          <>
            <ChipGroup label={t.q.purpose} options={t.purposeOptions}
              value={choices.purpose} onSelect={(v) => select('purpose', v)} />
            <ChipGroup label={t.q.gear} options={t.gearOptions}
              value={choices.gear} onSelect={(v) => select('gear', v)} />
            {/* カメラなら「メーカー」、レンズなら「マウント＋被写体」を聞く */}
            {choices.gear === 'camera' && (
              <ChipGroup label={t.q.brand} options={t.brandOptions}
                value={choices.brand} onSelect={(v) => select('brand', v)} />
            )}
            {choices.gear === 'lens' && (
              <>
                <ChipGroup label={t.q.mount} options={t.mountOptions}
                  value={choices.mount} onSelect={(v) => select('mount', v)} />
                {/* マウント＝レンズの接続規格。分からない人向けに「おまかせでOK」と一言添える */}
                <p className="field-help">{t.mountHelp}</p>
                <ChipGroup label={t.q.subject} options={t.subjectOptions}
                  value={choices.subject} onSelect={(v) => select('subject', v)} />
              </>
            )}
          </>
        )

      case 'budget':
        return (
          <>
            {/* カスタム入力中（budgetText あり）は、たまたま同額のプリセットを光らせない（二重選択に見せない） */}
            <ChipGroup label={t.q.budget} options={budgetOptions}
              value={budgetText ? null : choices.budget} onSelect={(v) => { setBudgetText(''); select('budget', v) }} />
            <div className="budget-custom">
              <label className="group-label" htmlFor="budget-input">
                {t.budgetCustomLabel.replace('{currency}', currencySymbol(choices.region))}
              </label>
              <input
                id="budget-input"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className="budget-input"
                placeholder={budgetPlaceholder}
                value={budgetText}
                onChange={(e) => {
                  const txt = e.target.value
                  setBudgetText(txt)
                  // 整数のみ有効。小数・指数表記(1e9)・記号・桁あふれは「未入力」(null)扱い＝Next は無効のまま。
                  const valid = /^\d{1,12}$/.test(txt) && Number(txt) >= 1 && Number(txt) <= MAX_BUDGET_LOCAL
                  const n = valid ? toYen(Number(txt), choices.region) : null
                  select('budget', typeof n === 'number' && isFinite(n) && n > 0 ? n : null)
                }}
              />
            </div>
            <ChipGroup label={t.q.condition} options={t.conditionOptions}
              value={choices.condition} onSelect={(v) => select('condition', v)} />
            {/* 中古を選んだら、状態ランクを複数選べる（「すべてのランク」で一括） */}
            {choices.condition === 'used' && (
              <ChipGroup
                label={t.q.grade}
                options={[{ value: 'all', label: t.gradeAllLabel }, ...t.gradeOptions]}
                multiple
                isActive={(v) => (v === 'all' ? gradeAllActive : (choices.grade || []).includes(v))}
                onToggle={toggleGrade}
              />
            )}
            {/* こだわり（任意・複数）：軽さ・新しさ・画質 などで結果を最適化。
                レンズ選択時はボディ専用（RAW動画収録など）を隠して、機材に関係ある項目だけ出す */}
            <ChipGroup
              label={t.prioritiesLabel}
              options={t.priorityOptions.filter((o) => isPriorityForGear(o.value, choices.gear))}
              multiple
              isActive={(v) => (choices.priorities || []).includes(v)}
              onToggle={togglePriority}
            />
          </>
        )

      case 'results': {
        // リサーチ中の演出（多段階メッセージ＋進捗バー）
        if (researching) {
          const steps = t.researchSteps || []
          const idx = Math.min(researchStep, steps.length - 1)
          const msg = steps[idx] || ''
          const pct = Math.min(100, ((idx + 1) / Math.max(steps.length, 1)) * 100)
          return (
            <div className="researching" role="status" aria-live="polite" aria-atomic="true">
              <div className="spinner" />
              <p>{msg}</p>
              <div
                className="research-bar"
                role="progressbar"
                aria-label={msg}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct)}
              >
                <span style={{ width: `${pct}%` }} />
              </div>
              <button type="button" className="research-skip" onClick={skipResearch}>
                {t.researchSkip}
              </button>
            </div>
          )
        }
        const isLens = choices.gear === 'lens'
        const results = isLens
          ? searchLenses(LENSES, choices)
          : searchCameras(CAMERAS, choices)
        if (results.length === 0) {
          return (
            <div className="empty-state">
              <Icon name={isLens ? 'lens' : 'camera'} size={40} className="empty-state-icon" />
              <p className="empty-state-text">{t.noResults}</p>
              <button type="button" className="empty-state-cta" onClick={() => setStep(2)}>
                {t.noResultsCta}
              </button>
            </div>
          )
        }
        const sortOpts = isLens ? t.sortLens : t.sortCamera
        return (
          <div className="results">
            {/* 並び替え欄（カメラ/レンズで選択肢が変わる） */}
            <div className="results-toolbar">
              <label className="sort-label" htmlFor="sortby">{t.sortLabel}</label>
              <select
                id="sortby"
                className="sort-select"
                value={choices.sortBy || 'recommended'}
                onChange={(e) => select('sortBy', e.target.value)}
              >
                {sortOpts.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {/* 「全マウント」だと、別システムの装着できないレンズも混ざる旨を注意（初心者の誤購入防止） */}
            {isLens && choices.mount === 'any' && (
              <p className="results-note" role="note">{t.mixedMountNote}</p>
            )}
            {/* 選んだこだわりに予算内で1件も合致しなかったときは、黙って無関係な結果を出さず正直に伝える */}
            {visiblePriorities.length > 0 && !results.some((r) => (r.reasons || []).includes('reasonPriorityMatch')) && (
              <p className="results-note" role="note">{t.priorityUnmetNote}</p>
            )}
            {results.map((item, i) => (
              <Fragment key={item.name}>
                <ResultCard item={item} rank={i + 1} region={choices.region} condition={choices.condition} grade={choices.grade} t={t} lang={lang} />
                {i % 3 === 2 && ad('inline')}
              </Fragment>
            ))}
            {ad('inline')}
          </div>
        )
      }

      default:
        return null
    }
  }

  return (
    <div className="page">
      {ad('banner')}

      <div className="layout">
        {ad('side')}

        <div className="app">
          <header className="app-header">
            <h1>
              <button type="button" className="logo-button" onClick={() => setStep(0)} aria-label={t.appTitle}>
                <Icon name="aperture" size={36} stroke={2.25} className="logo-icon" />
                <span className="logo-text" key={lang}>{t.appTitle}</span>
              </button>
            </h1>
            <p className="progress">{t.stepLabel} {step + 1} / {STEP_KEYS.length}</p>
            <div
              className="progress-bar"
              role="progressbar"
              aria-label={t.stepLabel}
              aria-valuemin={1}
              aria-valuemax={STEP_KEYS.length}
              aria-valuenow={step + 1}
            >
              <span style={{ width: `${(step / (STEP_KEYS.length - 1)) * 100}%` }} />
            </div>
            {!isFirst && summaryItems.length > 0 && (
              <div className="summary-bar">
                {summaryItems.map((s, idx) => (
                  <button
                    key={idx}
                    className="summary-pill"
                    onClick={() => setStep(s.step)}
                    title={t.changeHint}
                    aria-label={`${t.changeHint}: ${s.label}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </header>

          {ad('banner')}

          <main
            className="step-area"
            aria-busy={currentKey === 'results' && researching ? 'true' : undefined}
          >
            {currentKey === 'intro' && <IntroSlideshow slides={INTRO_SLIDES} />}
            {currentKey !== 'results' && currentKey !== 'intro' && (
              <StepHero src={STEP_IMAGES[currentKey]} />
            )}
            <h2 ref={headingRef} tabIndex={-1}>{pageTitle}</h2>
            {renderBody()}
            {!isLast && !canGoNext() && (
              <p className="hint" id="next-hint" role="status" aria-live="polite">{t.selectHint}</p>
            )}
            {ad('inline')}
          </main>

          <footer className="nav">
            {!isFirst && <button onClick={goBack}>{t.back}</button>}
            <button
              onClick={goNext}
              aria-disabled={nextDisabled}
              aria-describedby={!isLast && !canGoNext() ? 'next-hint' : undefined}
              className="primary"
            >
              {isFirst ? t.start : t.next}
            </button>
          </footer>

          {ad('banner')}

          {/* サイトフッター：読み物ページ・プライバシーポリシーの入口（広告審査の要件でもある）＋免責 */}
          <footer className="site-footer">
            <div className="footer-links">
              {/* 読み物ページは ja / en の2言語。日本語以外のUIでは英語版へ */}
              <a className="footer-link" href={choices.language && choices.language !== 'ja' ? '/en/guide.html' : '/guide.html'}>
                {t.guideLink}
              </a>
              <a className="footer-link" href={choices.language && choices.language !== 'ja' ? '/en/about.html' : '/about.html'}>
                {t.aboutLink}
              </a>
              <a className="footer-link" href={choices.language && choices.language !== 'ja' ? '/en/faq.html' : '/faq.html'}>
                {t.faqLink}
              </a>
              <button type="button" className="footer-link" onClick={() => setPrivacyOpen(true)}>
                {t.privacyPolicy}
              </button>
            </div>
            <p className="footer-note">{t.footerNote}</p>
          </footer>
        </div>

        {ad('side')}
      </div>

      {ad('banner')}

      {/* クッキー/広告の同意バー（広告が設定済みのときだけ表示） */}
      <ConsentBanner t={t} onPrivacy={() => setPrivacyOpen(true)} />
      {/* プライバシーポリシー モーダル */}
      {privacyOpen && <PrivacyPolicy lang={lang} t={t} onClose={() => setPrivacyOpen(false)} />}
    </div>
  )
}

export default App
