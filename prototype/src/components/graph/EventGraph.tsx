import { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Edge,
  type EdgeTypes,
  type OnInit,
  BaseEdge,
  getStraightPath,
  type EdgeProps,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import EventNode from './EventNode'
import { useStore } from '../../store/useStore'
import { useForceLayout, type MemoryGraphNode } from '../../hooks/useForceLayout'
import type { GraphEdge } from '../../types'
import rawData from '../../data/mock-data.json'

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

function SemanticEdge({ sourceX, sourceY, targetX, targetY, id, style }: EdgeProps) {
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY })

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke: 'var(--edge-semantic)',
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
  semantic: SemanticEdge,
}

const nodeTypes = {
  event: EventNode,
}

export default function EventGraph() {
  const { events, activeEventId, openEvent } = useStore()
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)

  const graphEdges = useMemo(() => rawData.graphEdges as GraphEdge[], [])
  const { nodes, onNodesChange, onNodeDragStart, onNodeDrag, onNodeDragStop } = useForceLayout(events, graphEdges, activeEventId)

  const focusedEventId = activeEventId ?? hoveredEventId

  const connectedEdgeIds = useMemo(
    () =>
      new Set(
        graphEdges
          .filter((edge) => !focusedEventId || edge.source === focusedEventId || edge.target === focusedEventId)
          .map((edge) => edge.id),
      ),
    [focusedEventId, graphEdges],
  )

  const edges: Edge[] = useMemo(
    () =>
      graphEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        style: getEdgeStyle(e, focusedEventId != null, connectedEdgeIds.has(e.id)),
      })),
    [connectedEdgeIds, focusedEventId, graphEdges],
  )

  const onNodeClick = useCallback<NodeMouseHandler<MemoryGraphNode>>(
    (_, node) => {
      if (node.type === 'event') openEvent(node.id)
    },
    [openEvent],
  )

  const onNodeMouseEnter = useCallback<NodeMouseHandler<MemoryGraphNode>>((_, node) => {
    if (node.type === 'event') {
      setHoveredEventId(node.id)
    }
  }, [])

  const onNodeMouseLeave = useCallback<NodeMouseHandler<MemoryGraphNode>>(() => {
    setHoveredEventId(null)
  }, [])

  const onInit = useCallback<OnInit<MemoryGraphNode, Edge>>((instance) => {
    requestAnimationFrame(() => {
      instance.fitView({ padding: 0.24, duration: 700 })
    })
  }, [])

  return (
    <div className="w-full h-full">
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
        minZoom={0.46}
        maxZoom={1.6}
        nodeExtent={[[-120, -120], [1480, 1120]]}
        translateExtent={[[-420, -360], [1820, 1440]]}
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
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.12}
          color="var(--canvas-grid)"
        />
      </ReactFlow>
    </div>
  )
}

function getEdgeStyle(edge: GraphEdge, hasFocus: boolean, isConnected: boolean) {
  if (!hasFocus) {
    return {
      opacity: edge.type === 'semantic' ? 0.14 : 0.1,
      strokeWidth: edge.type === 'semantic' ? 1.2 : 1.05,
    }
  }

  if (isConnected) {
    return {
      opacity: edge.type === 'semantic' ? 0.72 : 0.54,
      strokeWidth: edge.type === 'semantic' ? 2.05 : 1.6,
    }
  }

  return {
    opacity: 0.035,
    strokeWidth: 0.9,
  }
}
