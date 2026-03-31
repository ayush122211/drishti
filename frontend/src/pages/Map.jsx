import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import { Layers, Filter } from 'lucide-react'

const RISKS = {
  CRITICAL: { col: '#ef4444', r: 11 },
  HIGH:     { col: '#f97316', r: 8 },
  MEDIUM:   { col: '#eab308', r: 6 },
  LOW:      { col: '#22c55e', r: 5 },
}

const MAP_TILES = {
  dark:   'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  night:  'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
  sat:    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}

function PulsingMarker({ alert }) {
  const inf = RISKS[alert.severity] || RISKS.LOW
  return (
    <CircleMarker
      center={[alert.lat, alert.lng]}
      radius={inf.r}
      pathOptions={{
        color: inf.col, fillColor: inf.col,
        fillOpacity: alert.severity === 'CRITICAL' ? 0.85 : 0.55,
        weight: alert.severity === 'CRITICAL' ? 2 : 1,
      }}
    >
      <Popup className="drishti-popup">
        <div style={{ padding: 14, minWidth: 220 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>🚆 {alert.train_id}</div>
            <span style={{
              background: `${inf.col}22`, color: inf.col, border: `1px solid ${inf.col}55`,
              fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10
            }}>{alert.severity}</span>
          </div>
          <div style={{ color: '#7c8fad', fontSize: '0.78rem', marginBottom: 2 }}>
            {alert.train_name && <span>{alert.train_name} · </span>}
            Risk: <span style={{ color: inf.col, fontWeight: 700 }}>{alert.risk_score}%</span>
          </div>
          <div style={{ color: '#7c8fad', fontSize: '0.75rem', marginBottom: 8 }}>
            📍 {alert.station_name}
          </div>
          {alert.explanation && (
            <div style={{ fontSize: '0.72rem', color: '#4a5568', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, marginBottom: 8 }}>
              {alert.explanation.substring(0, 100)}…
            </div>
          )}
          <Link to={`/train/${alert.train_id}`} style={{
            display: 'inline-block', background: '#3b82f622', border: '1px solid #3b82f655',
            color: '#60a5fa', fontSize: '0.74rem', padding: '4px 10px', borderRadius: 6,
            fontWeight: 600
          }}>
            Deep Analysis →
          </Link>
        </div>
      </Popup>
    </CircleMarker>
  )
}

function MapController({ center, zoom }) {
  const map = useMap()
  useEffect(() => { map.setView(center, zoom) }, [center, zoom, map])
  return null
}

export default function NetworkMap() {
  const [alerts, setAlerts] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [tileKey, setTileKey] = useState('dark')
  const [count, setCount] = useState(0)

  useEffect(() => {
    const host = ''
    fetch(`${host}/api/alerts/history?limit=200`)
      .then(r => r.json())
      .then(d => {
        const map = new Map()
        d.alerts.forEach(a => { if (!map.has(a.train_id)) map.set(a.train_id, a) })
        setAlerts(Array.from(map.values()))
        setCount(d.alerts.length)
      })
      .catch(() => {})

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${proto}//${window.location.host}/ws/live`
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'alert' && msg.data) {
        setAlerts(prev => {
          const m = new Map(prev.map(p => [p.train_id, p]))
          m.set(msg.data.train_id, msg.data)
          return Array.from(m.values())
        })
      }
    }
    return () => ws.close()
  }, [])

  const visible = filter === 'ALL' ? alerts : alerts.filter(a => a.severity === filter)
  const critCount = alerts.filter(a => a.severity === 'CRITICAL').length
  const highCount  = alerts.filter(a => a.severity === 'HIGH').length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* Header bar */}
      <div style={{
        padding: '10px 16px', background: 'rgba(4,7,26,0.92)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, zIndex: 10, flexShrink: 0
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Live Network View</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--t3)' }}>
            Geo-tracking {alerts.length} trains · {count} total alerts processed
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Filter size={12} color="var(--t3)" style={{ marginRight: 4 }} />
          {['ALL','CRITICAL','HIGH','MEDIUM','LOW'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700,
              background: filter === f ? (f === 'CRITICAL' ? 'var(--red-g)' : f === 'HIGH' ? 'var(--orange-g)' : f === 'MEDIUM' ? 'var(--yellow-g)' : f === 'LOW' ? 'var(--green-g)' : 'var(--blue-gg)') : 'var(--card)',
              color: filter === f ? (f === 'CRITICAL' ? 'var(--red)' : f === 'HIGH' ? 'var(--orange)' : f === 'MEDIUM' ? 'var(--yellow)' : f === 'LOW' ? 'var(--green)' : 'var(--blue)') : 'var(--t3)',
              border: `1px solid ${filter === f ? 'var(--border-b)' : 'var(--border)'}`,
              cursor: 'pointer', transition: 'all 0.15s'
            }}>
              {f}
              {f !== 'ALL' && <span style={{ marginLeft: 4, opacity: 0.7 }}>
                ({alerts.filter(a => a.severity === f).length})
              </span>}
            </button>
          ))}
        </div>

        {/* Tile switcher */}
        <div style={{ display: 'flex', gap: 4 }}>
          <Layers size={12} color="var(--t3)" style={{ marginRight: 4, alignSelf: 'center' }} />
          {Object.keys(MAP_TILES).map(t => (
            <button key={t} onClick={() => setTileKey(t)} style={{
              padding: '4px 8px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 600,
              background: tileKey === t ? 'var(--blue-g)' : 'var(--card)',
              color: tileKey === t ? 'var(--blue)' : 'var(--t3)',
              border: `1px solid ${tileKey === t ? 'var(--blue-b)' : 'var(--border)'}`,
              cursor: 'pointer', textTransform: 'capitalize'
            }}>{t}</button>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 10, borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
          {Object.entries(RISKS).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.col }} />
              <span style={{ color: 'var(--t2)' }}>{k.charAt(0)+k.slice(1).toLowerCase()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div className="scan-line" />
        <MapContainer center={[22.5, 79.0]} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer key={tileKey} url={MAP_TILES[tileKey]} attribution="© CARTO / ESRI" />
          {visible.map(a => <PulsingMarker key={a.train_id} alert={a} />)}
        </MapContainer>

        {/* Stats overlay */}
        <div style={{
          position: 'absolute', bottom: 16, left: 16, zIndex: 900,
          background: 'rgba(4,7,26,0.88)', border: '1px solid var(--border-b)',
          borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(12px)',
          display: 'flex', gap: 20
        }}>
          {[
            { label: 'Visible', val: visible.length, col: 'var(--cyan)' },
            { label: 'Critical', val: critCount, col: 'var(--red)' },
            { label: 'High', val: highCount, col: 'var(--orange)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.col, fontFamily: 'JetBrains Mono, monospace' }}>{s.val}</div>
              <div style={{ fontSize: '0.58rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
