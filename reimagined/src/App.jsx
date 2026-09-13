import { useCallback, useMemo, useState } from 'react'
import './app.css'
import AttentionBar from './components/AttentionBar.jsx'
import FlowDndContext from './components/FlowDndContext.jsx'
import Lanes from './components/Lanes.jsx'
import NewTokenSheet from './components/NewTokenSheet.jsx'
import Ring from './components/Ring.jsx'
import TokenCard from './components/TokenCard.jsx'
import { useNow } from './hooks/useNow.js'
import { actions, alerts, departureSequence, landingSequence } from './model/store.js'
import { useRunway } from './state/storeContext.js'

export default function App() {
  const { runway, state, dispatch } = useRunway()
  const now = useNow(1000)
  const [openId, setOpenId] = useState(null)
  const [creating, setCreating] = useState(false)
  const closeCard = useCallback(() => setOpenId(null), [])
  const closeNew = useCallback(() => setCreating(false), [])

  const byPlace = useMemo(() => {
    const m = {}
    for (const t of Object.values(state.tokens)) (m[t.placeId] ??= []).push(t)
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.order - b.order)
    return m
  }, [state.tokens])

  const seqById = useMemo(() => {
    const m = {}
    for (const { id, number } of landingSequence(state)) m[id] = number
    for (const { id, number } of departureSequence(state)) m[id] = `D${number}`
    return m
  }, [state])

  const alarmIds = useMemo(() => new Set(alerts(state, now).filter((a) => a.level === 'alarm').flatMap((a) => a.tokenIds)), [state, now])

  const onSwipe = useCallback((token, dir) => dispatch(dir > 0 ? actions.advance(token.id) : actions.back(token.id)), [dispatch])
  const onOpen = useCallback((token) => setOpenId(token.id), [])

  return (
    <div className="app">
      <AttentionBar
        now={now}
        runway={runway}
        profile={state.settings.profile}
        onProfile={(profile) => dispatch(actions.setSettings({ profile }))}
        onNew={() => setCreating(true)}
        onFlip={() => dispatch(actions.flipRunway(runway.id))}
      />
      <FlowDndContext>
        <main className="stage">
          <Ring runway={runway} byPlace={byPlace} seqById={seqById} now={now} onOpen={onOpen} onSwipe={onSwipe} alarmIds={alarmIds} />
          <Lanes
            runway={runway}
            byPlace={byPlace}
            seqById={seqById}
            now={now}
            onOpen={onOpen}
            onSwipe={onSwipe}
            alarmIds={alarmIds}
            show={state.settings.profile === 'tower' ? ['inbound', 'park', 'vehicles'] : null}
            onSortByEta={() => dispatch(actions.sortInboundByEta())}
          />
        </main>
      </FlowDndContext>
      {openId && state.tokens[openId] && <TokenCard token={state.tokens[openId]} onClose={closeCard} />}
      {creating && <NewTokenSheet onClose={closeNew} />}
    </div>
  )
}
