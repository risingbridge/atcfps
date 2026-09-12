import { actions } from './state/store.js'
import { useActiveBoard, useStore } from './state/storeContext.js'

export default function App() {
  const { state } = useStore()
  const { board, dispatch } = useActiveBoard()
  return (
    <main style={{ padding: 'var(--s-5)' }}>
      <h1 style={{ fontWeight: 500, margin: 0 }}>ATC Strip Board</h1>
      <p>
        <button onClick={() => dispatch(actions.addBay(board.id, `Bay ${board.bayOrder.length + 1}`))}>
          Add bay
        </button>
      </p>
      <pre style={{ fontFamily: 'var(--font-data)', color: 'var(--paper)', fontSize: 12 }}>
        {JSON.stringify(state, null, 2)}
      </pre>
    </main>
  )
}
