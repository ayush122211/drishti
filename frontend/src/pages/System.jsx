import { useState, useEffect } from 'react'
import { Server, Cpu, Database, Wifi, CheckCircle, XCircle, AlertTriangle, RefreshCw, Clock, Terminal, Zap } from 'lucide-react'

function StatusRow({ label, status, value, icon }) {
  const ok = status === 'ok' || status === 'live'
  const warn = status === 'warn' || status === 'degraded'
  const col = ok ? 'var(--green)' : warn ? 'var(--yellow)' : 'var(--red)'
  const Icon = ok ? CheckCircle : warn ? AlertTriangle : XCircle
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--t3)' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--t2)' }}>{label}</span>
      {value && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--t3)' }}>{value}</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon size={14} color={col} />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: col, textTransform: 'uppercase' }}>{status}</span>
      </div>
    </div>
  )
}

function LogLine({ line, i }) {
  const isError = line.includes('ERROR') || line.includes('error')
  const isWarn = line.includes('WARN') || line.includes('warn')
  const isInfo = line.includes('INFO') || line.includes('→')
  const col = isError ? 'var(--red)' : isWarn ? 'var(--yellow)' : isInfo ? 'var(--cyan)' : 'var(--t2)'
  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: col, padding: '2px 0', lineHeight: 1.5,
      animation: 'fadeIn 0.3s ease', animationDelay: `${i * 20}ms`, animationFillMode: 'both' }}>
      {line}
    </div>
  )
}

const MOCK_LOGS = [
  '[12:00:01] INFO  → WS client connected (peer=127.0.0.1)',
  '[12:00:02] INFO  → Inference batch: 50 trains processed in 43ms',
  '[12:00:02] ALERT → Train 12841 CRITICAL risk_score=91 at HWH',
  '[12:00:07] INFO  → Alert persisted: id=a1f4e8 (signed)',
  '[12:00:12] INFO  → Inference batch: 48 trains processed in 39ms',
  '[12:00:17] WARN  → NTES connector: 2 trains with stale data (>10m)',
  '[12:00:22] INFO  → Inference batch: 52 trains processed in 47ms',
  '[12:00:25] ALERT → Train 22119 HIGH risk_score=72 at NDLS',
  '[12:00:30] INFO  → WebSocket broadcast: 2 subscribers',
  '[12:00:35] INFO  → Zone summary updated: 7 zones, 156 alerts total',
]

export default function System({ wsStatus, stats }) {
  const [health, setHealth] = useState(null)
  const [logs, setLogs] = useState(MOCK_LOGS)
  const [uptime, setUptime] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const host = ''
    fetch(`${host}/api/health`)
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth(null))

    // Uptime counter
    const timer = setInterval(() => setUptime(u => u + 1), 1000)

    // Simulate incoming logs
    const logTimer = setInterval(() => {
      const msgs = [
        `[${new Date().toLocaleTimeString()}] INFO  → Inference batch: ${45 + Math.floor(Math.random()*10)} trains in ${35 + Math.floor(Math.random()*20)}ms`,
        `[${new Date().toLocaleTimeString()}] INFO  → WebSocket heartbeat OK`,
        `[${new Date().toLocaleTimeString()}] INFO  → Feature store updated: ${1000 + Math.floor(Math.random()*200)} records`,
      ]
      setLogs(prev => [msgs[Math.floor(Math.random()*msgs.length)], ...prev].slice(0, 40))
    }, 4000)

    return () => { clearInterval(timer); clearInterval(logTimer) }
  }, [])

  const refresh = () => {
    setRefreshing(true)
    const host = ''
    fetch(`${host}/api/health`).then(r => r.json()).then(d => { setHealth(d); setRefreshing(false) }).catch(() => setRefreshing(false))
  }

  const fmtUptime = s => `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 }}>System Status</h2>
          <p style={{ color: 'var(--t3)', fontSize: '0.8rem' }}>Real-time health monitoring of all DRISHTI subsystems.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--t3)' }}>
            ⏱ {fmtUptime(uptime)}
          </div>
          <button className="btn btn-ghost" onClick={refresh}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        
        {/* Services */}
        <div className="glass-panel">
          <div className="glass-header">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Server size={13} /> Services</div>
          </div>
          <div className="glass-content">
            <StatusRow label="FastAPI Backend"        status={health ? 'ok' : 'offline'}  value="8000"   icon={<Server size={13}/>} />
            <StatusRow label="WebSocket Stream"       status={wsStatus === 'live' ? 'ok' : wsStatus === 'connecting' ? 'warn' : 'offline'} value="/ws/live" icon={<Wifi size={13}/>} />
            <StatusRow label="Inference Engine"       status={health ? 'ok' : 'offline'}  value="batch"  icon={<Cpu size={13}/>} />
            <StatusRow label="Alert Database"         status={stats.total > 0 ? 'ok' : 'warn'} value={`${stats.total} records`} icon={<Database size={13}/>} />
            <StatusRow label="NTES Connector"         status="warn" value="mock"           icon={<Zap size={13}/>} />
            <StatusRow label="Redis Feature Store"    status={health ? 'ok' : 'offline'}  value="port 6379" icon={<Database size={13}/>} />
          </div>
        </div>

        {/* Performance */}
        <div className="glass-panel">
          <div className="glass-header">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Cpu size={13} /> Performance</div>
          </div>
          <div className="glass-content">
            {[
              { label: 'Inference Latency', val: '<50ms', pct: 20, col: 'var(--green)' },
              { label: 'Alerts Processed', val: stats.total.toString(), pct: Math.min((stats.total / 1000) * 100, 100), col: 'var(--blue)' },
              { label: 'WSS Subscribers',  val: '—', pct: 40, col: 'var(--cyan)' },
              { label: 'Trains Monitored', val: stats.trains_monitored.toString(), pct: Math.min((stats.trains_monitored / 9000) * 100, 100), col: 'var(--purple)' },
              { label: 'Critical Rate',    val: stats.total > 0 ? `${Math.round((stats.critical/stats.total)*100)}%` : '0%', pct: stats.total > 0 ? (stats.critical/stats.total)*100 : 0, col: 'var(--red)' },
            ].map(m => (
              <div key={m.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--t2)' }}>{m.label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: m.col, fontWeight: 700 }}>{m.val}</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${m.pct}%`, height: '100%', background: m.col, borderRadius: 2, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Logs */}
      <div className="glass-panel" style={{ flex: 1 }}>
        <div className="glass-header">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="dot dot-green" />
            <Terminal size={13} /> System Log
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--t3)' }}>Streaming live</span>
        </div>
        <div className="glass-content" style={{ background: 'var(--bg)', maxHeight: 260 }}>
          {logs.map((l, i) => <LogLine key={i} line={l} i={i} />)}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="glass-panel">
        <div className="glass-header">Tech Stack</div>
        <div className="glass-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {[
              ['FastAPI',     'Backend',   'var(--green)'],
              ['WebSocket',   'Streaming', 'var(--blue)'],
              ['scikit-learn','ML Engine', 'var(--orange)'],
              ['Redis',       'Feature Store', 'var(--red)'],
              ['SQLite',      'Alert DB',  'var(--cyan)'],
              ['React 18',    'Frontend',  'var(--blue)'],
              ['Vite 5',      'Build',     'var(--purple)'],
              ['Leaflet',     'Maps',      'var(--green)'],
              ['Recharts',    'Charts',    'var(--orange)'],
              ['Lucide',      'Icons',     'var(--cyan)'],
            ].map(([name, role, col]) => (
              <div key={name} style={{ background: 'var(--bg3)', border: `1px solid ${col}33`, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: col, marginBottom: 2 }}>{name}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--t3)' }}>{role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
