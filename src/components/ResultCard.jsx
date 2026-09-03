import { useState } from 'react'
import { getStoreLinks } from '../lib/storeLinks'
import { formatPrice } from '../lib/currency'
import { usedFactorFor } from '../lib/search'
import { track } from '../lib/thirdParty'
import RadarChart from './RadarChart'
import Icon from './Icon'
import { PRODUCT_IMAGES } from '../data/images'
import { PRODUCT_YEARS } from '../data/years'
import { STRENGTHS, SENSORS } from '../i18n/strengths'

// レーダーに出す6項目（順番固定）。ラベルは辞書から。
function radarData(item, t) {
  const p = item.params || {}
  return [
    { label: t.paramImageQuality, value: p.imageQuality },
    { label: t.paramPortability, value: p.portability },
    { label: t.paramLowLight, value: p.lowLight },
    { label: t.paramVideo, value: p.video },
    { label: t.paramStabilization, value: p.stabilization },
    { label: t.paramValue, value: p.value },
  ].filter((d) => typeof d.value === 'number')
}

// 一体型（レンズ固定）カメラ。マウント名はレンズ交換の意味を持たないので非表示にする。
const FIXED_LENS_CAMERAS = new Set([
  'Sony ZV-1 II',
  'Fujifilm X100VI',
  'Leica Q3',
])

// 検索結果1件分の見た目（カード）。カメラ・レンズ どちらでも使える。
//   item / rank / region / condition / grade（中古ランク配列）/ t（辞書）/ lang（言語コード）
function ResultCard({ item, rank, region, condition, grade = [], t, lang }) {
  const [imgFailed, setImgFailed] = useState(false)
  const isLens = !!item.focalType
  const radar = radarData(item, t)
  const img = PRODUCT_IMAGES[item.name]
  const showImg = img && !imgFailed
  const year = PRODUCT_YEARS[item.name]
  // レンズ固定機はマウントを出さない（交換レンズ用マウントと紛らわしいため）
  const showMount = !!item.mount && !FIXED_LENS_CAMERAS.has(item.name)

  // 強みタグの多言語表示（日本語以外は辞書引き、無ければ日本語のまま）
  const trStrength = (s) =>
    lang === 'ja' ? s : (STRENGTHS[s] && STRENGTHS[s][lang]) || s
  // センサー表記の多言語表示（同じフォールバック方式。日本語はそのまま）
  const trSensor = (s) =>
    lang === 'ja' ? s : (SENSORS[s] && SENSORS[s][lang]) || s

  // Retailer links are search destinations, not observed offers. Never fabricate store prices.
  const stores = getStoreLinks(region, item.name, condition)
  const headlinePrice = Math.round(item.price * usedFactorFor(condition, grade) / 100) * 100

  const yearText = year ? `${year}${lang === 'ja' ? '年' : ''}` : ''
  // サブライン（メーカー ・ センサー ・ マウント ・ 年）。空の要素は混ぜず ・ で連結（区切りの重複防止）
  const subline = [
    item.brand,
    item.sensor ? trSensor(item.sensor) : '',
    showMount ? item.mount : '',
    yearText,
  ]
    .filter(Boolean)
    .join(' ・ ')

  return (
    <div className={rank === 1 ? 'card top' : 'card'}>
      <div className="card-main">
        {/* 製品写真：Wikimediaの実画像。読み込み失敗 or 該当なしは📷プレースホルダ */}
        <div className="card-photo">
          {showImg ? (
            <img
              className="card-photo-img"
              src={img}
              alt={item.name}
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <>
              <Icon name={isLens ? 'lens' : 'camera'} size={34} className="card-photo-icon" />
              <span className="card-photo-brand">{item.brand}</span>
            </>
          )}
        </div>

        <div className="card-info">
          <div className="card-head">
            <div>
              <h3>
                <span className="rank-badge">#{rank}</span>
                {item.name}
              </h3>
              <div className="brand">{subline}</div>
            </div>
            <div className="price">
              {formatPrice(headlinePrice, region)}
              <small>{t.priceApprox}</small>
            </div>
          </div>

          <div className="tags">
            {(item.strengths || []).map((s) => (
              <span key={s} className="tag">{trStrength(s)}</span>
            ))}
          </div>

          {item.reasons && item.reasons.length > 0 && (
            <div className="why">
              {t.recommendReason}
              {item.reasons.map((key) => t[key] ?? key).join(' / ')}
            </div>
          )}
        </div>

        {/* レーダーチャート（性能バランス）＋数値リスト（拡大鏡ユーザーにも値が読めるよう併記） */}
        {radar.length >= 3 && (
          <div className="card-radar">
            <div className="card-radar-title">{t.radarTitle}</div>
            <RadarChart
              data={radar}
              label={`${t.radarTitle}: ${radar.map((d) => `${d.label} ${d.value}/5`).join(', ')}`}
            />
            <ul className="radar-values">
              {radar.map((d) => (
                <li key={d.label}>
                  <span>{d.label}</span>
                  <span>{d.value}/5</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Current prices and availability must be checked at each retailer. */}
      <details className="price-table">
        <summary className="price-summary">
          <span className="price-summary-title">{t.priceCompareTitle}</span>
          <Icon name="chevron" size={16} className="price-summary-chevron" />
        </summary>
        <ul className="price-rows">
          {stores.map((s) => (
            <li key={s.name} className="price-row">
              <span className="price-store">{s.name}</span>
              <a
                className="price-go"
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${item.name} — ${s.name}（${t.goToStore}）`}
                onClick={() => track('StoreClick', { product: item.name, store: s.name, region })}
              >
                {t.goToStore} ↗
              </a>
            </li>
          ))}
        </ul>
        <p className="price-disclaimer">{t.priceDisclaimer}</p>
      </details>
    </div>
  )
}

export default ResultCard
