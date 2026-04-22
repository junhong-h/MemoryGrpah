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
import { CATEGORY_ANCHORS, NODE_HEIGHT, NODE_WIDTH, createSeedPositions } from '../utils/layout'

export interface MemoryGraphNodeData extends Record<string, unknown>, MemoryEvent {
  isActive: boolean
}

export type MemoryGraphNode = Node<MemoryGraphNodeData, 'event'>

interface ForceNode extends SimulationNodeDatum {
  id: string
  category: EventCategory
  fx: number | null
  fy: number | null
}

type ForceLink = Omit<GraphEdge, 'source' | 'target'> & SimulationLinkDatum<ForceNode>

const COLLISION_RADIUS = 96

export function useForceLayout(
  events: MemoryEvent[],
  graphEdges: GraphEdge[],
  activeEventId: string | null,
) {
  const seedPositions = useMemo(() => createSeedPositions(events), [events])

  const initialNodes = useMemo(
    () => createGraphNodes(events, seedPositions, activeEventId),
    [events, seedPositions, activeEventId],
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

      return createGraphNodes(
        events,
        seedPositions,
        activeEventId,
        currentMap,
      )
    })
  }, [activeEventId, events, seedPositions, setNodes])

  useEffect(() => {
    const currentNodeMap = new Map(nodesRef.current.map((node) => [node.id, node]))
    const previousForceNodes = forceNodesRef.current

    const simulationNodes: ForceNode[] = events.map((event) => {
      const currentNode = currentNodeMap.get(event.id)
      const previousForceNode = previousForceNodes.get(event.id)
      const seed = currentNode?.position ?? seedPositions[event.id] ?? CATEGORY_ANCHORS[event.category]

      return {
        id: event.id,
        category: event.category,
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
      .alphaDecay(0.065)
      .velocityDecay(0.28)
      .force('charge', forceManyBody<ForceNode>().strength(-380))
      .force(
        'collision',
        forceCollide<ForceNode>().radius(COLLISION_RADIUS).iterations(3),
      )
      .force(
        'link',
        forceLink<ForceNode, ForceLink>(simulationLinks)
          .id((node) => node.id)
          .distance((edge) => (edge.type === 'semantic' ? 184 : 220))
          .strength((edge) => (edge.type === 'semantic' ? 0.28 : 0.14)),
      )
      .force(
        'x',
        forceX<ForceNode>((node) => CATEGORY_ANCHORS[node.category].x).strength(0.15),
      )
      .force(
        'y',
        forceY<ForceNode>((node) => CATEGORY_ANCHORS[node.category].y).strength(0.13),
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
  }, [events, graphEdges, seedPositions, setNodes])

  const nudgeSimulation = useCallback((alphaTarget: number, alpha: number) => {
    const simulation = simulationRef.current

    if (!simulation) return

    simulation.alphaTarget(alphaTarget).alpha(alpha).restart()
  }, [])

  const onNodesChange = useCallback<OnNodesChange<MemoryGraphNode>>(
    (changes) => {
      onNodesChangeBase(changes)
    },
    [onNodesChangeBase],
  )

  const onNodeDragStart = useCallback<OnNodeDrag<MemoryGraphNode>>(
    (_, node) => {
      draggingNodeIdsRef.current.add(node.id)

      const forceNode = forceNodesRef.current.get(node.id)

      if (!forceNode) return

      forceNode.x = node.position.x
      forceNode.y = node.position.y
      forceNode.fx = node.position.x
      forceNode.fy = node.position.y

      nudgeSimulation(0.18, 0.26)
    },
    [nudgeSimulation],
  )

  const onNodeDrag = useCallback<OnNodeDrag<MemoryGraphNode>>((_, node) => {
    const forceNode = forceNodesRef.current.get(node.id)

    if (!forceNode) return

    forceNode.x = node.position.x
    forceNode.y = node.position.y
    forceNode.fx = node.position.x
    forceNode.fy = node.position.y
  }, [])

  const onNodeDragStop = useCallback<OnNodeDrag<MemoryGraphNode>>(
    (_, node) => {
      draggingNodeIdsRef.current.delete(node.id)

      const forceNode = forceNodesRef.current.get(node.id)

      if (!forceNode) return

      forceNode.x = node.position.x
      forceNode.y = node.position.y
      forceNode.fx = null
      forceNode.fy = null

      nudgeSimulation(0, 0.18)
    },
    [nudgeSimulation],
  )

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
  activeEventId: string | null,
  existingNodes?: Map<string, MemoryGraphNode>,
): MemoryGraphNode[] {
  return events.map((event) => {
    const existingNode = existingNodes?.get(event.id)
    const seedPosition = seedPositions[event.id] ?? CATEGORY_ANCHORS[event.category]

    return {
      id: event.id,
      type: 'event',
      position: existingNode?.position ?? seedPosition,
      data: {
        ...event,
        isActive: activeEventId === event.id,
      },
      draggable: true,
      dragHandle: '.memory-photo-node__drag',
      selectable: false,
      focusable: false,
      style: {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
    }
  })
}

function clampPosition(x: number, y: number) {
  return {
    x: Math.min(1380, Math.max(-40, x)),
    y: Math.min(980, Math.max(-60, y)),
  }
}

function isNear(
  current: { x: number; y: number },
  next: { x: number; y: number },
) {
  return Math.abs(current.x - next.x) < 0.5 && Math.abs(current.y - next.y) < 0.5
}
