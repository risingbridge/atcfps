import { useCallback, useMemo, useState } from 'react'
import './app.css'
import AttentionBar from './components/AttentionBar.jsx'
import FlowDndContext from './components/FlowDndContext.jsx'
import Lanes from './components/Lanes.jsx'
import NewTokenSheet from './components/NewTokenSheet.jsx'
import Ring from './components/Ring.jsx'
import RunwaySheet from './components/RunwaySheet.jsx'
import TokenCard from './components/TokenCard.jsx'
import { useAlarmTone } from './hooks/useAlarmTone.js'
import { useNow } from './hooks/useNow.js'
import { actions, activeTokens, alerts, departureSequence, landingSequence } from './model/store.js'
import { useRunway } from './state/storeContext.js'

export default function App() {
  const { runway, state, dispatch } = useRunway()
  const now = useNow(1000)
  const [openId, setOpenId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [runwayOpen, setRunwayOpen] = useState(false)
  const closeCard = useCallback(() => setOpenId(null), [])
  const closeNew = useCallback(() => setCreating(false), [])
  const closeRunway = useCallback(() => setRunwayOpen(false), [])

  const byPlace = useMemo(() => {
    const m = {}
    for (const t of activeTokens(state)) (m[t.placeId] ??= []).push(t)
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.order - b.order)
    return m
  }, [state])

  const seqById = useMemo(() => {
    const m = {}
    for (const { id, number } of landingSequence(state)) m[id] = number
    for (const { id, number } of departureSequence(state)) m[id] = `D${number}`
    return m
  }, [state])

  const alertList = useMemo(() => alerts(state, now), [state, now])
  const alarmIds = useMemo(() => new Set(alertList.filter((a) => a.level === 'alarm').flatMap((a) => a.tokenIds)), [alertList])
  useAlarmTone(alarmIds.size > 0, state.settings.sound)

  const onSwipe = useCallback((token, dir) => dispatch(dir > 0 ? actions.advance(token.id) : actions.back(token.id)), [dispatch])
  const onOpen = useCallback((token) => setOpenId(token.id), [])

  return (
    <div className="app">
      <AttentionBar
        now={now}
        runway={runway}
        profile={state.settings.profile}
        onProfile={(profile) => dispatch(actions.setSettings({ profile }))}
        runways={state.runwayOrder.map((id) => state.runways[id])}
        onRunway={(id) => dispatch(actions.setActiveRunway(id))}
        onNew={() => setCreating(true)}
        onRunwaySettings={() => setRunwayOpen(true)}
        alerts={alertList}
        sound={state.settings.sound}
        onSound={(sound) => dispatch(actions.setSettings({ sound }))}
        onFocus={(a) => a.tokenIds[0] && setOpenId(a.tokenIds[0])}
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
      {runwayOpen && <RunwaySheet onClose={closeRunway} />}
    </div>
  )
}
