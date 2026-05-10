import EventGraph from '../components/graph/EventGraph'
import PinTray from '../components/graph/PinTray'
import RevisitModal from '../components/revisit/RevisitModal'
import PinCompareModal from '../components/revisit/PinCompareModal'
import { useStore } from '../store/useStore'

export default function GraphPage() {
  const activeEventId = useStore((s) => s.activeEventId)
  const showPinCompare = useStore((s) => s.showPinCompare)

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ background: 'var(--canvas-bg)' }}>
      <EventGraph />
      <PinTray />
      {activeEventId && <RevisitModal />}
      {showPinCompare && <PinCompareModal />}
    </div>
  )
}
