import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, AlertTriangle, Shield, TrendingUp, Zap, Copy, CheckCheck, ExternalLink } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts'

const SEV = {
  CRITICAL: { col: 'var(--red)',    bg: 'var(--red-g)',    border: 'var(--red-b)' },
  HIGH:     { col: 'var(--orange)', bg: 'var(--orange-g)', border: 'var(--orange-b)' },
  MEDIUM:   { col: 'var(--yellow)', bg: 'var(--yellow-g)', border: 'var(--yellow-b)' },
  LOW:      { col: 'var(--green)',  bg: 'var(--green-g)',  border: 'var(--green-b)' },
}

function RiskGauge({ score }) {
  const color = score >= 80 ? 'var(--red)' : score >= 60 ? 'var(--orange)' : score >= 40 ? 'var(--yellow)' : 'var(--green)'
  const data = [{ value: score, fill: color }, { value: 100 - score, fill: 'var(--bg3)' }]
  return (
    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius={45} outerRadius={65} data={data} startAngle={90} endAngle={-270}>
          <RadialBar dataKey="value" />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 900, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: '0.58rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>Risk %</div>
      </div>
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ background: 'none', border: 'none', color: copied ? 'var(--green)' : 'var(--t3)', cursor: 'pointer', padding: 2 }}
      title="Copy"
    >
      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
    </button>
  )
}

export default function TrainDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    const host = ''
    fetch(`${host}/api/train/${id}/risk`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => {
        // Mock
        setData({
          train_id: id,
          train_name: 'Express',
          risk_score: 78,
          risk_level: 'HIGH',
          alert_count: 23,
          last_alert: {
            station_name: 'Howrah Junction',
            station_code: 'HWH',
            zone: 'ER',
            timestamp: new Date().toISOString(),
            explanation: 'Speed 127 km/h exceeds section limit 95 km/h. DBSCAN anomaly cluster -1. Signal S-45 mismatch detected.',
            actions: ['Issue Speed Restriction Order', 'Alert Section Controller', 'Flag for Inspection at Next Station'],
            severity: 'HIGH',
            risk_score: 78,
            lat: 22.58, lng: 88.34,
          },
          history: [
            { period: 'Day -5', count: 2, avg_risk: 35 },
            { period: 'Day -4', count: 5, avg_risk: 42 },
            { period: 'Day -3', count: 3, avg_risk: 38 },
            { period: 'Day -2', count: 8, avg_risk: 61 },
            { period: 'Day -1', count: 12, avg_risk: 71 },
            { period: 'Today',  count: 15, avg_risk: 78 },
          ]
        })
        setLoading(false)
      })
  }, [id])

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--t2)' }}>
      <div style={{ fontSize: '2rem', animation: 'spin 1.5s linear infinite' }}>🚄</div>
      <div style={{ fontSize: '0.9rem' }}>Locating train {id}…</div>
    </div>
  )

  const s = SEV[data.risk_level] || SEV.LOW
  const a = data.last_alert

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 20 }}>
      
      {/* Back + Header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: 12, fontSize: '0.75rem' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>🚆 {id}</h2>
              {data.train_name && <span style={{ fontSize: '1rem', color: 'var(--t2)', fontWeight: 500 }}>{data.train_name}</span>}
              <span style={{ background: s.bg, color: s.col, border: `1px solid ${s.border}`, padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                {data.risk_level} RISK
              </span>
            </div>
            {a && (
              <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--t2)' }}>
                <span>📍 {a.station_name}</span>
                {a.zone && <span>Zone: {a.zone}</span>}
                <span>🕐 {a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        {[['overview','Overview'], ['history','Alert History'], ['raw','Raw Data']].map(([k, l]) => (
          <button key={k} className={`tab-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="anim-fade">
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr', gap: 12, marginBottom: 16 }}>
            {/* Gauge */}
            <div className="glass-panel" style={{ borderTop: `2px solid ${s.col}` }}>
              <div className="glass-header">Risk Score</div>
              <div className="glass-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiskGauge score={data.risk_score} />
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Total Alerts', val: data.alert_count, icon: <AlertTriangle size={14} />, col: 'var(--orange)' },
                { label: 'Risk Level', val: data.risk_level, icon: <Shield size={14} />, col: s.col },
              ].map(c => (
                <div key={c.label} className="glass-panel" style={{ flex: 1 }}>
                  <div className="glass-header">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: c.col }}>{c.icon} {c.label}</div>
                  </div>
                  <div className="glass-content" style={{ fontSize: '1.5rem', fontWeight: 900, color: c.col, fontFamily: 'JetBrains Mono, monospace' }}>
                    {c.val}
                  </div>
                </div>
              ))}
            </div>

            {/* Trend */}
            <div className="glass-panel">
              <div className="glass-header">
                <span>Risk Trend</span>
                <TrendingUp size={13} color="var(--orange)" />
              </div>
              <div style={{ flex: 1, padding: 8 }}>
                {data.history ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.history} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <XAxis dataKey="period" stroke="var(--border)" tick={{ fill: 'var(--t3)', fontSize: 8 }} />
                      <YAxis stroke="var(--border)" tick={{ fill: 'var(--t3)', fontSize: 8 }} />
                      <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border-b)', borderRadius: 8, fontSize: '0.75rem' }} />
                      <Bar dataKey="avg_risk" name="Avg Risk" fill="var(--orange)" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontSize: '0.78rem' }}>No history</div>}
              </div>
            </div>
          </div>

          {/* Last Incident */}
          {a && (
            <div className="glass-panel" style={{ marginBottom: 12 }}>
              <div className="glass-header">
                <span>Latest Incident Report</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--t3)' }}>{a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</span>
              </div>
              <div className="glass-content">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 4 }}>Location</div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={13} color="var(--blue)" />
                      {a.station_name} {a.station_code && `(${a.station_code})`}
                    </div>
                  </div>
                  {a.zone && (
                    <div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 4 }}>Railway Zone</div>
                      <div style={{ fontWeight: 600 }}>{a.zone}</div>
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--bg3)', border: '1px solid var(--orange-b)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>⚡ AI Analysis</div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--t2)', lineHeight: 1.6 }}>{a.explanation}</div>
                </div>

                {a.actions && a.actions.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Recommended Actions</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {a.actions.map((act, i) => (
                        <span key={i} style={{ background: 'var(--blue-gg)', border: '1px solid var(--blue-b)', color: 'var(--blue)', padding: '6px 12px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 500 }}>
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="anim-fade">
          <div className="glass-panel">
            <div className="glass-header">Alert Count Over Time</div>
            <div style={{ height: 240, padding: 12 }}>
              {data.history ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.history} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                    <XAxis dataKey="period" stroke="var(--border)" tick={{ fill: 'var(--t3)', fontSize: 10 }} />
                    <YAxis stroke="var(--border)" tick={{ fill: 'var(--t3)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border-b)', borderRadius: 8, fontSize: '0.75rem' }} />
                    <Bar dataKey="count" name="Alerts" fill="var(--blue)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)' }}>No historical data</div>}
            </div>
          </div>
        </div>
      )}

      {/* Raw Data Tab */}
      {tab === 'raw' && (
        <div className="anim-fade">
          <div className="glass-panel">
            <div className="glass-header">
              <span>Raw API Response</span>
              <CopyButton text={JSON.stringify(data, null, 2)} />
            </div>
            <div className="glass-content">
              <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--cyan)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
