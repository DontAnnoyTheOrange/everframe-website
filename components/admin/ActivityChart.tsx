import type { Bucket } from "@/lib/admin/dashboard";

// Bars: requests received (olive) and how many of them are confirmed or completed now (copper).
// Drawn as plain SVG on the server, with a hidden table for screen readers.
export default function ActivityChart({
  buckets,
  title,
}: {
  buckets: Bucket[];
  title: string;
}) {
  const W = 640;
  const H = 220;
  const pad = { l: 28, r: 8, t: 12, b: 28 };
  const max = Math.max(1, ...buckets.map((b) => b.received));
  // A tidy top value for the axis (at least 4 so a single booking does not fill the whole chart).
  const top = Math.max(4, Math.ceil(max / 2) * 2);
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const slot = innerW / buckets.length;
  const barW = Math.min(18, slot * 0.34);
  const y = (v: number) => pad.t + innerH - (v / top) * innerH;
  const every = buckets.length > 14 ? 5 : 1;
  const total = buckets.reduce((n, b) => n + b.received, 0);
  const kept = buckets.reduce((n, b) => n + b.confirmed, 0);
  const ticks = [0, top / 2, top];

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title}: ${total} requests received, ${kept} of them confirmed or completed.`}
        className="h-auto w-full"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(t)}
              y2={y(t)}
              stroke="#e4e1d6"
              strokeDasharray={t === 0 ? undefined : "3 4"}
            />
            <text
              x={pad.l - 6}
              y={y(t) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#6b6a5f"
            >
              {t}
            </text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const cx = pad.l + slot * i + slot / 2;
          return (
            <g key={b.key}>
              {b.received > 0 && (
                <rect
                  x={cx - barW - 1}
                  y={y(b.received)}
                  width={barW}
                  height={y(0) - y(b.received)}
                  rx="2"
                  fill="#73785a"
                />
              )}
              {b.confirmed > 0 && (
                <rect
                  x={cx + 1}
                  y={y(b.confirmed)}
                  width={barW}
                  height={y(0) - y(b.confirmed)}
                  rx="2"
                  fill="#b98260"
                />
              )}
              {i % every === 0 && (
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6b6a5f"
                >
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#73785a]" />
          Requests received
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#b98260]" />
          Now confirmed or completed
        </span>
      </figcaption>
      <div className="sr-only">
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th>Period</th>
              <th>Received</th>
              <th>Confirmed or completed</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.key}>
                <td>{b.label}</td>
                <td>{b.received}</td>
                <td>{b.confirmed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}