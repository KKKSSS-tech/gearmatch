// 選択肢のボタン（チップ）。全部の画面で使い回す“部品”。
//   label    … ボタンに表示する文字
//   active   … 選択中かどうか（true なら青くハイライト＋読み上げにも伝わる）
//   onClick  … 押されたときにやること
//   multiple … 複数選択グループのチップか（true のとき、色だけでなく✓印で「選択中」を示す＝色覚に依存しない）
function OptionChip({ label, active, onClick, multiple }) {
  const cls = ['chip', multiple ? 'chip-multi' : '', active ? 'active' : ''].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      aria-pressed={active}
    >
      {/* 複数選択チップは選択中に✓を出す（色覚特性・低視力でも選択が分かるように） */}
      {multiple && <span className="chip-check" aria-hidden="true">{active ? '✓' : ''}</span>}
      {label}
    </button>
  )
}

export default OptionChip
