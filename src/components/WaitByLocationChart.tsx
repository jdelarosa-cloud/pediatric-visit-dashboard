import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.ts'
import type { LocationWaitStat } from '../lib/types.ts'
import styles from './AnalysisCard.module.css'

type WaitByLocationChartProps = {
  stats: LocationWaitStat[]
  onReset: () => void
}

type WaitChartDatum = LocationWaitStat & {
  displayWait: number
  valueLabel: string
}

function formatAverage(value: number | null): string {
  return value === null ? 'No wait data' : `${value.toFixed(1)} min`
}

function WaitTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: readonly { payload?: WaitChartDatum }[]
}) {
  const datum = payload?.[0]?.payload
  if (!active || datum === undefined) return null

  return (
    <div className={styles.tooltip}>
      <strong>{datum.location}</strong>
      <span>{formatAverage(datum.avgWait)}</span>
      <span>
        {datum.withWait} of {datum.visits} visits recorded
      </span>
    </div>
  )
}

function WaitDataTable({ stats }: { stats: LocationWaitStat[] }) {
  return (
    <details className={styles.tableDetails}>
      <summary>View Wait-Time Data Table</summary>
      <table className={styles.dataTable}>
        <caption className="visually-hidden">Average wait time by location</caption>
        <thead>
          <tr>
            <th scope="col">Location</th>
            <th className={styles.number} scope="col">Visits</th>
            <th className={styles.number} scope="col">Recorded</th>
            <th className={styles.number} scope="col">Average</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => (
            <tr key={stat.location}>
              <th scope="row">{stat.location}</th>
              <td className={styles.number}>{stat.visits}</td>
              <td className={styles.number}>{stat.withWait}</td>
              <td className={styles.number}>{formatAverage(stat.avgWait)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

export function WaitByLocationChart({ stats, onReset }: WaitByLocationChartProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const recordedStats = stats.filter((stat) => stat.avgWait !== null)
  const noWaitLocations = stats
    .filter((stat) => stat.avgWait === null)
    .map((stat) => stat.location)

  if (stats.length === 0) {
    return (
      <figure
        aria-describedby="wait-chart-description"
        aria-labelledby="wait-chart-title"
        className={styles.card}
      >
        <figcaption className={styles.heading}>
          <h2 id="wait-chart-title">Average Wait by Location</h2>
          <p className={styles.description} id="wait-chart-description">
            Recorded waits only · values rounded to one decimal
          </p>
        </figcaption>
        <div className={styles.emptyPanel}>
          <h3>No Wait-Time Results</h3>
          <p>No visits match these filters, so there are no location averages to compare.</p>
          <button onClick={onReset} type="button">Reset filters</button>
        </div>
      </figure>
    )
  }

  if (recordedStats.length === 0) {
    return (
      <figure
        aria-describedby="wait-chart-description"
        aria-labelledby="wait-chart-title"
        className={styles.card}
      >
        <figcaption className={styles.heading}>
          <h2 id="wait-chart-title">Average Wait by Location</h2>
          <p className={styles.description} id="wait-chart-description">
            Recorded waits only · values rounded to one decimal
          </p>
        </figcaption>
        <div className={styles.emptyPanel}>
          <h3>No Recorded Waits</h3>
          <p>The matching visits have no usable wait-time values to average.</p>
        </div>
        <WaitDataTable stats={stats} />
      </figure>
    )
  }

  const chartData: WaitChartDatum[] = stats.map((stat) => ({
    ...stat,
    displayWait: stat.avgWait ?? 0,
    valueLabel: formatAverage(stat.avgWait),
  }))
  const leader = recordedStats[0]
  const maxAverage = Math.max(...recordedStats.map((stat) => stat.avgWait ?? 0))
  const domainMax = maxAverage === 0 ? 1 : Math.ceil(maxAverage * 1.28)
  const chartHeight = Math.max(150, stats.length * 31)
  const summary = `Highest recorded average: ${leader?.avgWait?.toFixed(1)} minutes at ${leader?.location}.${noWaitLocations.length > 0 ? ` No recorded wait data: ${noWaitLocations.join(', ')}.` : ''}`

  return (
    <figure
      aria-describedby="wait-chart-description wait-chart-summary"
      aria-labelledby="wait-chart-title"
      className={styles.card}
    >
      <figcaption className={styles.heading}>
        <h2 id="wait-chart-title">Average Wait by Location</h2>
        <p className={styles.description} id="wait-chart-description">
          Recorded waits only · values rounded to one decimal
        </p>
      </figcaption>

      <div className={styles.chartFrame}>
        <ResponsiveContainer height={chartHeight} minWidth={0} width="100%">
          <BarChart
            accessibilityLayer
            aria-label={summary}
            data={chartData}
            layout="vertical"
            margin={{ top: 2, right: 68, bottom: 0, left: 0 }}
            role="img"
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis
              axisLine={false}
              dataKey="displayWait"
              domain={[0, domainMax]}
              height={8}
              tick={false}
              tickLine={false}
              type="number"
            />
            <YAxis
              axisLine={false}
              dataKey="location"
              interval={0}
              tick={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 600 }}
              tickLine={false}
              type="category"
              width={120}
            />
            <Tooltip content={<WaitTooltip />} cursor={{ fill: 'var(--surface-subtle)' }} />
            <Bar
              animationDuration={300}
              animationEasing="ease-out"
              barSize={20}
              dataKey="displayWait"
              fill="var(--primary)"
              isAnimationActive={!prefersReducedMotion}
              radius={[0, 4, 4, 0]}
            >
              <LabelList
                dataKey="valueLabel"
                fill="var(--ink)"
                fontSize={12}
                fontWeight={600}
                position="right"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className={styles.summary} id="wait-chart-summary">{summary}</p>
      <WaitDataTable stats={stats} />
    </figure>
  )
}
