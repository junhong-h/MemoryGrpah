import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  ViewportPortal,
  type Edge,
  type EdgeTypes,
  type OnInit,
  BaseEdge,
  getBezierPath,
  getStraightPath,
  type EdgeProps,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import EventNode from './EventNode'
import LayerToggle from './LayerToggle'
import { useStore } from '../../store/useStore'
import { useForceLayout, type MemoryGraphNode } from '../../hooks/useForceLayout'
import type { EventCategory, GraphEdge, MemoryEvent, RelationType } from '../../types'
import rawData from '../../data/mock-data.json'
import {
  CATEGORY_LANES,
  GRAPH_EXTENT,
  TIMELINE_FRAME,
  buildTimelineMarkers,
  createTemporalEdges,
} from '../../utils/layout'

function TimeEdge({ sourceX, sourceY, targetX, targetY, id, style }: EdgeProps) {
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke: 'var(--edge-time)',
        strokeWidth: 1.6,
        strokeDasharray: '6,7',
        strokeLinecap: 'round',
        opacity: 0.92,
        ...style,
      }}
    />
  )
}

function PeopleEdge({ sourceX, sourceY, targetX, targetY, id, style }: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, curvature: 0.18 })
  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke: 'var(--edge-people)',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        opacity: 0.86,
        ...style,
      }}
    />
  )
}

function ThemeEdge({ sourceX, sourceY, targetX, targetY, id, style }: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, curvature: 0.16 })
  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke: 'var(--edge-theme)',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        opacity: 0.88,
        ...style,
      }}
    />
  )
}

const edgeTypes: EdgeTypes = {
  time: TimeEdge,
  people: PeopleEdge,
  theme: ThemeEdge,
}

const nodeTypes = {
  event: EventNode,
}

export default function EventGraph() {
  const events = useStore((s) => s.events)
  const activeEventId = useStore((s) => s.activeEventId)
  const hoveredEventId = useStore((s) => s.hoveredEventId)
  const activeLayer = useStore((s) => s.activeLayer)
  const openEvent = useStore((s) => s.openEvent)
  const setHoveredEvent = useStore((s) => s.setHoveredEvent)

  const relationEdges = useMemo(() => rawData.graphEdges as GraphEdge[], [])

  const allEdges = useMemo(
    () => [...createTemporalEdges(events), ...relationEdges],
    [events, relationEdges],
  )

  const visibleEdges = useMemo(() => {
    if (activeLayer === 'all') return allEdges
    return allEdges.filter((edge) => edge.type === activeLayer)
  }, [activeLayer, allEdges])

  const { nodes, onNodesChange, onNodeDragStart, onNodeDrag, onNodeDragStop } = useForceLayout(
    events,
    visibleEdges,
  )

  const focusedEventId = activeEventId ?? hoveredEventId

  const connectedEdgeIds = useMemo(
    () =>
      new Set(
        visibleEdges
          .filter((edge) => !focusedEventId || edge.source === focusedEventId || edge.target === focusedEventId)
          .map((edge) => edge.id),
      ),
    [focusedEventId, visibleEdges],
  )

  const edges: Edge[] = useMemo(
    () =>
      visibleEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        style: getEdgeStyle(e.type, focusedEventId != null, connectedEdgeIds.has(e.id)),
      })),
    [connectedEdgeIds, focusedEventId, visibleEdges],
  )

  const onNodeClick = useCallback<NodeMouseHandler<MemoryGraphNode>>(
    (_, node) => {
      if (node.type === 'event') openEvent(node.id)
    },
    [openEvent],
  )

  const onNodeMouseEnter = useCallback<NodeMouseHandler<MemoryGraphNode>>(
    (_, node) => {
      if (node.type === 'event') setHoveredEvent(node.id)
    },
    [setHoveredEvent],
  )

  const onNodeMouseLeave = useCallback<NodeMouseHandler<MemoryGraphNode>>(() => {
    setHoveredEvent(null)
  }, [setHoveredEvent])

  const onInit = useCallback<OnInit<MemoryGraphNode, Edge>>((instance) => {
    requestAnimationFrame(() => {
      instance.fitView({ padding: 0.22, duration: 700 })
    })
  }, [])

  return (
    <div className="relative w-full h-full">
      <LayerToggle />

      <ReactFlow<MemoryGraphNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={onInit}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        minZoom={0.4}
        maxZoom={1.6}
        nodeExtent={[[GRAPH_EXTENT.minX, GRAPH_EXTENT.minY], [GRAPH_EXTENT.maxX, GRAPH_EXTENT.maxY]]}
        translateExtent={[[GRAPH_EXTENT.minX - 320, GRAPH_EXTENT.minY - 280], [GRAPH_EXTENT.maxX + 320, GRAPH_EXTENT.maxY + 320]]}
        nodesDraggable
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        selectionOnDrag={false}
        elementsSelectable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'var(--canvas-bg)' }}
      >
        <HybridBackdrop events={events} />
      </ReactFlow>

      <div className="memory-help-hint">
        Hover a node to see its links · Drag to reshape · Click to revisit
      </div>
    </div>
  )
}

function getEdgeStyle(type: RelationType, hasFocus: boolean, isConnected: boolean) {
  const accentByType = {
    time: { idle: 0.22, active: 0.66, dim: 0.045, idleW: 1.18, activeW: 1.72 },
    people: { idle: 0.16, active: 0.88, dim: 0.024, idleW: 1.1, activeW: 2.1 },
    theme: { idle: 0.18, active: 0.86, dim: 0.024, idleW: 1.1, activeW: 2.1 },
  }[type]

  if (!hasFocus) {
    return { opacity: accentByType.idle, strokeWidth: accentByType.idleW }
  }
  if (isConnected) {
    return { opacity: accentByType.active, strokeWidth: accentByType.activeW }
  }
  return { opacity: accentByType.dim, strokeWidth: 0.88 }
}

function HybridBackdrop({ events }: { events: MemoryEvent[] }) {
  const markers = useMemo(() => buildTimelineMarkers(events), [events])
  const activeCategories = useMemo(
    () => Array.from(new Set(events.map((event) => event.category))) as EventCategory[],
    [events],
  )

  return (
    <ViewportPortal>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ width: GRAPH_EXTENT.maxX + 120, height: GRAPH_EXTENT.maxY + 120 }}
      >
        {activeCategories.map((category) => {
          const lane = CATEGORY_LANES[category]
          return (
            <div key={category}>
              <div
                className="memory-semantic-band"
                style={{
                  left: TIMELINE_FRAME.startX - 72,
                  top: lane.y - 94,
                  width: TIMELINE_FRAME.endX - TIMELINE_FRAME.startX + 144,
                  background: `linear-gradient(90deg, transparent 0%, ${lane.tint} 16%, ${lane.tint} 84%, transparent 100%)`,
                }}
              />
            </div>
          )
        })}

        {markers.map((marker) => (
          <div key={marker.id}>
            <div
              className="memory-timeline-label"
              style={{
                left: clampLabelX(marker.x),
                top: TIMELINE_FRAME.topY - 38,
              }}
            >
              {marker.label}
            </div>
          </div>
        ))}
      </div>
    </ViewportPortal>
  )
}

function clampLabelX(x: number) {
  return Math.min(TIMELINE_FRAME.endX - 56, Math.max(TIMELINE_FRAME.startX + 56, x))
}
