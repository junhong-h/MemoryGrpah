import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  useNodesState,
  type Node,
  type OnNodeDrag,
  type OnNodesChange,
} from '@xyflow/react'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'

import type { EventCategory, GraphEdge, MemoryEvent } from '../types'
import {
  CATEGORY_LANES,
  GRAPH_EXTENT,
  NODE_HEIGHT,
  NODE_WIDTH,
  createSeedPositions,
  getNodeScale,
  getNodeSize,
  getTemporalBounds,
  getTimelineX,
} from '../utils/layout'

export type MemoryGraphNodeData = MemoryEvent & Record<string, unknown>

export type MemoryGraphNode = Node<MemoryGraphNodeData, 'event'>

interface ForceNode extends SimulationNodeDatum {
  id: string
  category: EventCategory
  photoCount: number
  fx: number | null
  fy: number | null
}

type ForceLink = Omit<GraphEdge, 'source' | 'target'> & SimulationLinkDatum<ForceNode>

const COLLISION_BASE = 120
const DRAG_ALPHA_TARGET = 0.3

export function useForceLayout(events: MemoryEvent[], graphEdges: GraphEdge[]) {
  const seedPositions = useMemo(() => createSeedPositions(events), [events])
  const temporalBounds = useMemo(() => getTemporalBounds(events), [events])

  const initialNodes = useMemo(
    () => createGraphNodes(events, seedPositions),
    [events, seedPositions],
  )

  const simulationRef = useRef<Simulation<ForceNode, ForceLink> | null>(null)
  const draggingNodeIdsRef = useRef<Set<string>>(new Set())
  const forceNodesRef = useRef<Map<string, ForceNode>>(new Map())
  const nodesRef = useRef<MemoryGraphNode[]>(initialNodes)

  const [nodes, setNodes, onNodesChangeBase] = useNodesState<MemoryGraphNode>(initialNodes)

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    setNodes((currentNodes) => {
      const currentMap = new Map(currentNodes.map((node) => [node.id, node]))
      return createGraphNodes(events, seedPositions, currentMap)
    })
  }, [events, seedPositions, setNodes])

  useEffect(() => {
    const currentNodeMap = new Map(nodesRef.current.map((node) => [node.id, node]))
    const previousForceNodes = forceNodesRef.current
    const targetXById = new Map(
      events.map((event) => [event.id, getTimelineX(event.dateStart, temporalBounds) - NODE_WIDTH / 2]),
    )

    const simulationNodes: ForceNode[] = events.map((event) => {
      const currentNode = currentNodeMap.get(event.id)
      const previousForceNode = previousForceNodes.get(event.id)
      const lane = CATEGORY_LANES[event.category]
      const seed = currentNode?.position ?? seedPositions[event.id] ?? {
        x: targetXById.get(event.id) ?? 0,
        y: lane.y - NODE_HEIGHT / 2,
      }

      return {
        id: event.id,
        category: event.category,
        photoCount: event.photos.length,
        x: previousForceNode?.x ?? seed.x,
        y: previousForceNode?.y ?? seed.y,
        vx: previousForceNode?.vx ?? 0,
        vy: previousForceNode?.vy ?? 0,
        fx: previousForceNode?.fx ?? null,
        fy: previousForceNode?.fy ?? null,
      }
    })

    forceNodesRef.current = new Map(simulationNodes.map((node) => [node.id, node]))

    const simulationLinks: ForceLink[] = graphEdges.map((edge) => ({ ...edge }))

    simulationRef.current?.stop()

    const simulation = forceSimulation(simulationNodes)
      .alpha(0.95)
      .alphaDecay(0.06)
      .velocityDecay(0.34)
      .force('charge', forceManyBody<ForceNode>().strength(-360))
      .force(
        'collision',
        forceCollide<ForceNode>()
          .radius((node) => COLLISION_BASE * getNodeScale(node.photoCount))
          .iterations(4),
      )
      .force(
        'link',
        forceLink<ForceNode, ForceLink>(simulationLinks)
          .id((node) => node.id)
          .distance((edge) => (edge.type === 'time' ? 220 : 280))
          .strength((edge) => {
            if (edge.type === 'time') return 0.07
            if (edge.type === 'people') return 0.22
            return 0.18
          }),
      )
      .force(
        'x',
        forceX<ForceNode>((node) => targetXById.get(node.id) ?? 0).strength(0.32),
      )
      .force(
        'y',
        forceY<ForceNode>((node) => CATEGORY_LANES[node.category].y - NODE_HEIGHT / 2).strength(0.20),
      )
      .on('tick', () => {
        const positions = new Map(
          simulationNodes.map((node) => [node.id, clampPosition(node.x ?? 0, node.y ?? 0)]),
        )

        setNodes((currentNodes) =>
          currentNodes.map((node) => {
            if (draggingNodeIdsRef.current.has(node.id)) {
              return node
            }

            const nextPosition = positions.get(node.id)

            if (!nextPosition || isNear(node.position, nextPosition)) {
              return node
            }

            return { ...node, position: nextPosition }
          }),
        )
      })

    simulationRef.current = simulation

    return () => {
      simulation.stop()
    }
  }, [events, graphEdges, seedPositions, setNodes, temporalBounds])

  const onNodesChange = useCallback<OnNodesChange<MemoryGraphNode>>(
    (changes) => {
      onNodesChangeBase(changes)
    },
    [onNodesChangeBase],
  )

  const onNodeDragStart = useCallback<OnNodeDrag<MemoryGraphNode>>((_, node) => {
    draggingNodeIdsRef.current.add(node.id)

    const forceNode = forceNodesRef.current.get(node.id)
    if (!forceNode) return

    forceNode.x = node.position.x
    forceNode.y = node.position.y
    forceNode.fx = node.position.x
    forceNode.fy = node.position.y

    const sim = simulationRef.current
    if (sim) {
      sim.alphaTarget(DRAG_ALPHA_TARGET).alpha(Math.max(sim.alpha(), 0.4)).restart()
    }
  }, [])

  const onNodeDrag = useCallback<OnNodeDrag<MemoryGraphNode>>((_, node) => {
    const forceNode = forceNodesRef.current.get(node.id)
    if (!forceNode) return

    forceNode.x = node.position.x
    forceNode.y = node.position.y
    forceNode.fx = node.position.x
    forceNode.fy = node.position.y

    const sim = simulationRef.current
    if (sim && sim.alphaTarget() < DRAG_ALPHA_TARGET) {
      sim.alphaTarget(DRAG_ALPHA_TARGET)
    }
  }, [])

  const onNodeDragStop = useCallback<OnNodeDrag<MemoryGraphNode>>((_, node) => {
    draggingNodeIdsRef.current.delete(node.id)

    const forceNode = forceNodesRef.current.get(node.id)
    if (!forceNode) return

    forceNode.x = node.position.x
    forceNode.y = node.position.y
    forceNode.fx = null
    forceNode.fy = null

    const sim = simulationRef.current
    if (sim) {
      sim.alphaTarget(0).alpha(Math.max(sim.alpha(), 0.18)).restart()
    }
  }, [])

  return {
    nodes,
    onNodesChange,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
  }
}

function createGraphNodes(
  events: MemoryEvent[],
  seedPositions: Record<string, { x: number; y: number }>,
  existingNodes?: Map<string, MemoryGraphNode>,
): MemoryGraphNode[] {
  return events.map((event) => {
    const existingNode = existingNodes?.get(event.id)
    const seedPosition = seedPositions[event.id] ?? {
      x: GRAPH_EXTENT.minX + 120,
      y: CATEGORY_LANES[event.category].y - NODE_HEIGHT / 2,
    }
    const size = getNodeSize(event.photos.length)

    if (existingNode && existingNode.data === event) {
      return existingNode
    }

    return {
      id: event.id,
      type: 'event',
      position: existingNode?.position ?? seedPosition,
      data: event as MemoryGraphNodeData,
      draggable: true,
      dragHandle: '.memory-photo-node__drag',
      selectable: false,
      focusable: false,
      style: {
        width: size.width,
        height: size.height,
      },
    }
  })
}

function clampPosition(x: number, y: number) {
  return {
    x: Math.min(GRAPH_EXTENT.maxX - NODE_WIDTH, Math.max(GRAPH_EXTENT.minX, x)),
    y: Math.min(GRAPH_EXTENT.maxY - NODE_HEIGHT, Math.max(GRAPH_EXTENT.minY, y)),
  }
}

function isNear(
  current: { x: number; y: number },
  next: { x: number; y: number },
) {
  return Math.abs(current.x - next.x) < 0.5 && Math.abs(current.y - next.y) < 0.5
}
