/**
 * Agent 拓扑图（极简降噪版）
 *
 * 设计原则：
 * - 节点白底 + 细边框，状态用描边色区分
 * - 连线细灰线，完成段变绿色
 * - 去掉发光、渐变、呼吸动画
 */
import { useEffect, useRef, useState } from 'react';
import { AGENT_META, AGENT_ORDER } from '@/api/multi-agent';

export type NodeStatus = 'pending' | 'running' | 'done';

interface AgentTopologyProps {
  statuses: Record<string, NodeStatus>;
  retryCount?: number;
  rejectTarget?: string | null;
}

const NODE_WIDTH = 150;
const NODE_HEIGHT = 64;
const MIN_GAP = 24;
const DEFAULT_GAP = 36;
const SVG_HEIGHT = 120;
const TOP_Y = 24;

const C = {
  border: '#e8eaed',
  text1: '#202124',
  text2: '#5f6368',
  text3: '#9aa0a6',
  running: '#1a73e8',
  done: '#188038',
  error: '#d93025',
};

export default function AgentTopology({ statuses, retryCount = 0, rejectTarget = null }: AgentTopologyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nodeCount = AGENT_ORDER.length;
  // 节点等距分布：leftPad = gap = rightPad，整体在容器中水平居中
  // 容器宽度 = nodeCount*NODE_WIDTH + (nodeCount+1)*gap
  const gap = containerWidth > 0
    ? Math.max(MIN_GAP, (containerWidth - nodeCount * NODE_WIDTH) / (nodeCount + 1))
    : DEFAULT_GAP;
  const leftPad = gap;

  const nodeX: Record<string, number> = {};
  AGENT_ORDER.forEach((key, idx) => {
    nodeX[key] = leftPad + idx * (NODE_WIDTH + gap);
  });

  return (
    <div ref={containerRef} className="w-full" style={{ padding: '4px 0' }}>
      <svg width="100%" height={SVG_HEIGHT}>
        <defs>
          <marker id="arrow-gray" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={C.text3} />
          </marker>
          <marker id="arrow-green" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={C.done} />
          </marker>
          <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={C.error} />
          </marker>
        </defs>

        {/* 连线 */}
        {AGENT_ORDER.slice(0, -1).map((key, idx) => {
          const nextKey = AGENT_ORDER[idx + 1];
          const x1 = nodeX[key] + NODE_WIDTH;
          const x2 = nodeX[nextKey];
          const y = TOP_Y + NODE_HEIGHT / 2;
          const bothDone = statuses[key] === 'done' && statuses[nextKey] === 'done';
          return (
            <g key={`line-${key}`}>
              <line
                x1={x1}
                y1={y}
                x2={x2 - 4}
                y2={y}
                stroke={bothDone ? C.done : C.border}
                strokeWidth={bothDone ? 2 : 1.5}
                markerEnd={bothDone ? 'url(#arrow-green)' : 'url(#arrow-gray)'}
              />
            </g>
          );
        })}

        {/* 质检打回回路 */}
        {rejectTarget && nodeX['qa'] !== undefined && nodeX[rejectTarget] !== undefined && (
          <g>
            <path
              d={`M ${nodeX['qa'] + NODE_WIDTH / 2} ${TOP_Y + NODE_HEIGHT}
                  C ${nodeX['qa'] + NODE_WIDTH / 2} ${SVG_HEIGHT - 12},
                    ${nodeX[rejectTarget] + NODE_WIDTH / 2} ${SVG_HEIGHT - 12},
                    ${nodeX[rejectTarget] + NODE_WIDTH / 2} ${TOP_Y + NODE_HEIGHT}`}
              fill="none"
              stroke={C.error}
              strokeWidth={2}
              strokeDasharray="6,4"
              markerEnd="url(#arrow-red)"
            />
            <g>
              <rect
                x={(nodeX['qa'] + nodeX[rejectTarget]) / 2 + NODE_WIDTH / 2 - 60}
                y={SVG_HEIGHT - 18}
                width={120}
                height={20}
                rx={10}
                fill="#fce8e6"
                stroke={C.error}
                strokeWidth={1}
              />
              <text
                x={(nodeX['qa'] + nodeX[rejectTarget]) / 2 + NODE_WIDTH / 2}
                y={SVG_HEIGHT - 4}
                textAnchor="middle"
                fill={C.error}
                fontSize={10}
                fontWeight="bold"
              >
                打回重做 (第{retryCount}次)
              </text>
            </g>
          </g>
        )}

        {/* 节点 */}
        {AGENT_ORDER.map((key) => {
          const meta = AGENT_META[key];
          const status = statuses[key] || 'pending';
          const x = nodeX[key];
          const y = TOP_Y;

          const isDone = status === 'done';
          const isRunning = status === 'running';

          let stroke = C.border;
          let fill = '#ffffff';
          if (isDone) stroke = C.done;
          else if (isRunning) stroke = C.running;

          return (
            <g key={key}>
              <rect
                x={x}
                y={y}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={10}
                ry={10}
                fill={fill}
                stroke={stroke}
                strokeWidth={isRunning ? 2 : 1.5}
              />

              {/* 名称 */}
              <foreignObject x={x + 14} y={y + 8} width={NODE_WIDTH - 28} height={18}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.text1,
                    lineHeight: '18px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {meta.name}
                </div>
              </foreignObject>

              {/* 描述 */}
              <foreignObject x={x + 14} y={y + 28} width={NODE_WIDTH - 28} height={32}>
                <div
                  style={{
                    fontSize: 10,
                    color: C.text3,
                    lineHeight: '13px',
                    whiteSpace: 'normal',
                    overflow: 'hidden',
                  }}
                >
                  {meta.desc}
                </div>
              </foreignObject>

              {/* 状态徽章 */}
              {isDone && (
                <g>
                  <circle cx={x + NODE_WIDTH - 12} cy={y + 12} r={8} fill={C.done} />
                  <text
                    x={x + NODE_WIDTH - 12}
                    y={y + 16}
                    textAnchor="middle"
                    fontSize={11}
                    fill="white"
                    fontWeight="bold"
                  >
                    ✓
                  </text>
                </g>
              )}
              {isRunning && (
                <g>
                  <circle cx={x + NODE_WIDTH - 12} cy={y + 12} r={8} fill={C.running} />
                  <text
                    x={x + NODE_WIDTH - 12}
                    y={y + 15}
                    textAnchor="middle"
                    fontSize={9}
                    fill="white"
                    fontWeight="bold"
                  >
                    ▶
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
