import { HIGHLIGHT_COLORS } from '../lib/colors.js'
import { actions, shiftInOrder } from '../state/store.js'
import { useActiveBoard } from '../state/storeContext.js'
import Menu from './Menu.jsx'

/** ⋯ menu in a bay header: colour, move, delete. */
export default function BayMenu({ bay, index, count, onDelete, onRename }) {
  const { board, dispatch } = useActiveBoard()

  const move = (delta) => dispatch(actions.reorderBays(board.id, shiftInOrder(board.bayOrder, bay.id, delta)))
  const setColor = (color) => dispatch(actions.setBayColor(board.id, bay.id, color))

  const items = [
    { label: 'Rename bay…', onSelect: onRename },
    'separator',
    {
      node: (
        <div className="swatches" role="radiogroup" aria-label="Bay colour">
          <button
            type="button"
            role="radio"
            aria-checked={!bay.color}
            className={`swatch swatch-none ${!bay.color ? 'is-selected' : ''}`}
            onClick={() => setColor('')}
            title="Default"
          >
            ✕
          </button>
          {HIGHLIGHT_COLORS.map(([hex, name]) => (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={bay.color === hex}
              className={`swatch ${bay.color === hex ? 'is-selected' : ''}`}
              style={{ '--swatch': hex }}
              onClick={() => setColor(hex)}
              title={name}
            />
          ))}
        </div>
      ),
    },
    'separator',
    { label: 'Move left', onSelect: () => move(-1), disabled: index === 0 },
    { label: 'Move right', onSelect: () => move(1), disabled: index === count - 1 },
    'separator',
    { label: 'Delete bay', onSelect: onDelete, danger: true },
  ]

  return <Menu label={`Bay menu: ${bay.name}`} items={items} align="right" />
}
