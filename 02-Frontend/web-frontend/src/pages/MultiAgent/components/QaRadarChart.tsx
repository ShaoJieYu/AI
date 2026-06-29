/**
 * 质检雷达图（极简降噪版）
 *
 * 设计原则：
 * - 去掉渐变填充、发光滤镜
 * - 用细线 + 淡色填充
 * - 结论用简洁文字，不用渐变徽章
 */
import { Empty } from 'antd';
import type { QaResult } from '@/api/multi-agent';

interface QaRadarChartProps {
  qaResult: QaResult | null;
}

const DIMENSIONS = [
  { key: 'accuracy', label: '准确性', angle: -90 },
  { key: 'format', label: '格式', angle: 30 },
  { key: 'formula', label: '公式', angle: 150 },
] as const;

const SIZE = 200;
const CENTER = SIZE / 2;
const MAX_RADIUS = 70;
const MAX_SCORE = 10;

const C = {
  border: '#e8eaed',
  text1: '#202124',
  text2: '#5f6368',
  text3: '#9aa0a6',
  done: '#188038',
  error: '#d93025',
  warn: '#e37400',
  line: '#dadce0',
};

function polarToCartesian(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

export default function QaRadarChart({ qaResult }: QaRadarChartProps) {
  if (!qaResult || !qaResult.dimensions) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无质检结果" className="!my-4" />;
  }

  const dims = qaResult.dimensions;
  const passed = qaResult.overall_pass;
  const forced = qaResult.forced_pass;

  const totalScore = DIMENSIONS.reduce((sum, d) => sum + (dims[d.key]?.score ?? 0), 0);
  const avgScore = (totalScore / DIMENSIONS.length).toFixed(1);

  const scorePoints = DIMENSIONS.map((d) => {
    const score = dims[d.key]?.score ?? 0;
    const radius = (Math.min(score, MAX_SCORE) / MAX_SCORE) * MAX_RADIUS;
    return { ...d, score, ...polarToCartesian(d.angle, radius) };
  });

  const passLinePoints = DIMENSIONS.map((d) => {
    const r = (6 / MAX_SCORE) * MAX_RADIUS;
    const p = polarToCartesian(d.angle, r);
    return `${p.x},${p.y}`;
  }).join(' ');

  const maxLinePoints = DIMENSIONS.map((d) => {
    const p = polarToCartesian(d.angle, MAX_RADIUS);
    return `${p.x},${p.y}`;
  }).join(' ');

  const scorePolygon = scorePoints.map((p) => `${p.x},${p.y}`).join(' ');
  const polyColor = passed ? C.done : forced ? C.warn : C.error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={SIZE} height={SIZE}>
        {/* 背景同心多边形 */}
        {[2, 4, 6, 8, 10].map((level) => {
          const r = (level / MAX_SCORE) * MAX_RADIUS;
          const pts = DIMENSIONS.map((d) => {
            const p = polarToCartesian(d.angle, r);
            return `${p.x},${p.y}`;
          }).join(' ');
          return (
            <polygon key={level} points={pts} fill="none" stroke={C.border} strokeWidth={1} />
          );
        })}

        {/* 满分线 */}
        <polygon points={maxLinePoints} fill="none" stroke={C.line} strokeWidth={1.5} />

        {/* 及格线 */}
        <polygon points={passLinePoints} fill="none" stroke={C.error} strokeWidth={1} strokeDasharray="4,3" opacity={0.4} />

        {/* 轴线 */}
        {DIMENSIONS.map((d) => {
          const p = polarToCartesian(d.angle, MAX_RADIUS);
          return (
            <line key={d.key} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke={C.border} strokeWidth={1} />
          );
        })}

        {/* 评分多边形 */}
        <polygon
          points={scorePolygon}
          fill={`${polyColor}15`}
          stroke={polyColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* 评分点 */}
        {scorePoints.map((p) => (
          <circle key={p.key} cx={p.x} cy={p.y} r={4} fill="#fff" stroke={polyColor} strokeWidth={2} />
        ))}

        {/* 中心分数 */}
        <text x={CENTER} y={CENTER - 2} textAnchor="middle" fontSize={24} fontWeight="700" fill={polyColor}>
          {avgScore}
        </text>
        <text x={CENTER} y={CENTER + 14} textAnchor="middle" fontSize={9} fill={C.text3}>
          平均分
        </text>

        {/* 维度标签 */}
        {scorePoints.map((p) => {
          const labelR = MAX_RADIUS + 18;
          const lp = polarToCartesian(p.angle, labelR);
          return (
            <g key={p.key}>
              <text x={lp.x} y={lp.y - 3} textAnchor="middle" fontSize={11} fontWeight="600" fill={C.text1}>
                {p.label}
              </text>
              <text x={lp.x} y={lp.y + 10} textAnchor="middle" fontSize={11} fontWeight="600" fill={p.score >= 6 ? C.done : C.error}>
                {p.score}/10
              </text>
            </g>
          );
        })}
      </svg>

      {/* 结论 */}
      <div
        style={{
          marginTop: 6,
          padding: '3px 12px',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          color: passed ? C.done : forced ? C.warn : C.error,
          background: passed ? '#e6f4ea' : forced ? '#fef7e0' : '#fce8e6',
        }}
      >
        {passed
          ? forced ? '超过重试上限，强制通过' : '质检通过'
          : `质检未通过（${qaResult.issue_type === 'structure' ? '结构问题' : '内容问题'}）`}
      </div>

      {/* 问题列表 */}
      {!passed && (
        <div style={{ marginTop: 8, width: '100%', padding: 8, background: '#fce8e6', borderRadius: 6 }}>
          {DIMENSIONS.map((d) => {
            const issues = dims[d.key]?.issues ?? [];
            if (issues.length === 0) return null;
            return (
              <div key={d.key} style={{ marginBottom: 3, fontSize: 11, color: C.text2 }}>
                <span style={{ fontWeight: 600, color: C.error }}>{d.label}：</span>
                {issues.map((issue, i) => (
                  <span key={i}> {issue};</span>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
