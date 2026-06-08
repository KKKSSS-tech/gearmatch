import { useId } from 'react'
import OptionChip from './OptionChip'

// 1つの質問のまとまり（質問ラベル＋選択肢チップの集まり）。
//   単一選択：value / onSelect を渡す
//   複数選択：multiple を true にして、isActive(value) と onToggle(value) を渡す
function ChipGroup({ label, options, value, onSelect, multiple, isActive, onToggle }) {
  // 質問ラベルと選択肢グループを aria で結びつける（SR が「質問→選択肢」を文脈として読む）
  const labelId = useId()
  return (
    <div className="group">
      <div className="group-label" id={labelId}>{label}</div>
      <div className="chips" role="group" aria-labelledby={labelId} aria-multiselectable={multiple ? true : undefined}>
        {(options || []).map((opt) => (
          <OptionChip
            key={opt.value}
            label={opt.label}
            multiple={multiple}
            active={multiple ? !!(isActive && isActive(opt.value)) : value === opt.value}
            onClick={() => (multiple ? onToggle(opt.value) : onSelect(opt.value))}
          />
        ))}
      </div>
    </div>
  )
}

export default ChipGroup
