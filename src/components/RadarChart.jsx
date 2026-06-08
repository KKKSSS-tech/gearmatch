// 性能パラメータ（1〜5）を多角形のレーダーチャートに描く小さなSVG部品。
//   data … [{ label, value }] の配列（value は 1〜5 想定）
//   max  … 満点（既定 5）
//   size … SVG の一辺(px)
function RadarChart({ data, max = 5, size = 176, label }) {
  const items = (data || []).filter((d) => d && typeof d.value === 'number')
  const n = items.length
  if (n < 3) return null // 3項目未満は形にならないので描かない

  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 42 // ラベルのぶん内側に余白（長い言語ラベルの見切れ対策で広め）
  const angleAt = (i) => (Math.PI * 2 * i) / n - Math.PI / 2 // 上(12時)から時計回り
  const pt = (i, radius) => [cx + radius * Math.cos(angleAt(i)), cy + radius * Math.sin(angleAt(i))]

  // 目盛りの輪（25/50/75/100%）
  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    items.map((_, i) => pt(i, r * f).join(',')).join(' ')
  )
  // データの面
  const area = items
    .map((d, i) => pt(i, r * (Math.max(0, Math.min(max, d.value)) / max)).join(','))
    .join(' ')

  return (
    <svg className="radar" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label || 'performance radar'}>
      {rings.map((pts, i) => (
        <polygon key={i} className="radar-ring" points={pts} />
      ))}
      {items.map((_, i) => {
        const [x, y] = pt(i, r)
        return <line key={i} className="radar-axis" x1={cx} y1={cy} x2={x} y2={y} />
      })}
      <polygon className="radar-area" points={area} />
      {items.map((d, i) => {
        const [x, y] = pt(i, r + 12)
        return (
          <text key={i} className="radar-label" x={x} y={y} textAnchor="middle" dominantBaseline="middle">
            {d.label}
          </text>
        )
      })}
    </svg>
  )
}

export default RadarChart
