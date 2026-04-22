import EventGraph from '../components/graph/EventGraph'
import RevisitModal from '../components/revisit/RevisitModal'
import { useStore } from '../store/useStore'

export default function GraphPage() {
  const { activeEventId } = useStore()

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ background: 'var(--canvas-bg)' }}>
      <EventGraph />
      {activeEventId && <RevisitModal />}
    </div>
  )
}
