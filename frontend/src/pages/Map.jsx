import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Layers, Filter, Compass } from 'lucide-react'

const RISKS = {
  CRITICAL: { col: '#ef4444', r: 11 },
  HIGH:     { col: '#f97316', r: 8 },
  MEDIUM:   { col: '#eab308', r: 6 },
  LOW:      { col: '#22c55e', r: 5 },
}

const MAP_TILES = {
  gmap:     'https://mt1.google.com/vt/lyrs=m,transit&x={x}&y={y}&z={z}',
  gterrain: 'https://mt1.google.com/vt/lyrs=p,transit&x={x}&y={y}&z={z}',
  dark:     'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

const S = {
  NDLS: [28.6430, 77.2185], MMCT: [18.9696, 72.8194], HWH: [22.5841, 88.3435],
  MAS: [13.0827, 80.2707], SBC: [12.9784, 77.5684], PUNE: [18.5284, 73.8743],
  ADI: [23.0256, 72.5977], JP: [26.9196, 75.7878], LKO: [26.8329, 80.9205],
  PNBE: [25.6022, 85.1376], BPL: [23.2647, 77.4116], NGP: [21.1472, 79.0881],
  SC: [17.4337, 78.5016], ERS: [9.9658, 76.2929], GHY: [26.1820, 91.7515]
}

const S_ZONES = {
  NDLS: 'NR', MMCT: 'WR', HWH: 'ER', MAS: 'SR', SBC: 'SWR',
  PUNE: 'CR', ADI: 'WR', JP: 'NWR', LKO: 'NR', PNBE: 'ECR',
  BPL: 'WCR', NGP: 'CR', SC: 'SCR', ERS: 'SR', GHY: 'NFR'
}
const ZONES = {
  NR: '#3b82f6', WR: '#eab308', ER: '#ef4444', SR: '#10b981',
  SWR: '#06b6d4', CR: '#a855f7', NWR: '#f97316', ECR: '#db2777',
  WCR: '#84cc16', SCR: '#6366f1', NFR: '#14b8a6'
}

const getTrainIcon = (color, isCritical) => new L.DivIcon({
  className: 'custom-loco-icon',
  html: `<div style="background-color: ${color}; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 4px; border: 2px solid ${isCritical ? '#fff' : 'rgba(255,255,255,0.7)'}; box-shadow: 0 0 ${isCritical ? '15px' : '4px'} ${color};">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${isCritical ? '#fff' : '#1e293b'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="2" ry="2"></rect><path d="M4 11h16"></path><path d="M12 3v8"></path><path d="M8 19l-2 3"></path><path d="M16 19l2 3"></path><path d="M8 15h0"></path><path d="M16 15h0"></path></svg>
         </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
})

function LocomotiveMarker({ alert, colorMode }) {
  const code = Object.keys(S).find(k => S[k][0] === alert.lat && S[k][1] === alert.lng)
  const zone = code ? S_ZONES[code] : 'NR'
  
  const inf = RISKS[alert.severity] || RISKS.LOW
  const isCritical = alert.severity === 'CRITICAL'
  const color = colorMode === 'ZONE' ? (ZONES[zone] || '#94a3b8') : inf.col

  return (
    <Marker position={[alert.lat, alert.lng]} icon={getTrainIcon(color, isCritical)}>
      <Popup className="drishti-popup">
        <div style={{ padding: 14, minWidth: 240, fontFamily: 'var(--mono)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--blue)' }}>LOCO: {alert.train_id}</div>
            <span style={{
              background: `${inf.col}22`, color: inf.col, border: `1px solid ${inf.col}55`,
              fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4
            }}>ISL STAT: {alert.severity}</span>
          </div>
          <div style={{ color: '#7c8fad', fontSize: '0.78rem', marginBottom: 2 }}>
            <span style={{ color: 'var(--t1)', fontWeight: 600 }}>RAKE/PNR:</span> {alert.train_name || 'UNLISTED'}
          </div>
          <div style={{ color: '#7c8fad', fontSize: '0.78rem', marginBottom: 2 }}>
            <span style={{ color: 'var(--t1)', fontWeight: 600 }}>ZONE / DIV:</span> {zone} ADMINISTRATION
          </div>
          <div style={{ color: '#7c8fad', fontSize: '0.75rem', marginBottom: 8 }}>
            <span style={{ color: 'var(--t1)', fontWeight: 600 }}>BLOCK SEC:</span> {alert.station_name}
          </div>
          {alert.explanation && (
            <div style={{ fontSize: '0.72rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, marginBottom: 8 }}>
              {alert.explanation.substring(0, 100)}…
            </div>
          )}
          <Link to={`/train/${alert.train_id}`} style={{
            display: 'inline-block', background: 'var(--blue-gg)', border: '1px solid var(--blue-b)',
            color: 'var(--blue)', fontSize: '0.74rem', padding: '4px 10px', borderRadius: 4,
            fontWeight: 700, letterSpacing: 1
          }}>
            ENGAGE CONTROLLER →
          </Link>
        </div>
      </Popup>
    </Marker>
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
  const [colorMode, setColorMode] = useState('RISK')
  const [tileKey, setTileKey] = useState('gmap')
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

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Filter size={12} color="var(--t3)" style={{ marginRight: 4 }} />
          {['ALL','CRITICAL','HIGH','MEDIUM','LOW'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '4px 10px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700,
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

        {/* Color Mode Switcher */}
        <div style={{ display: 'flex', gap: 4, borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
          <Compass size={12} color="var(--t3)" style={{ marginRight: 4, alignSelf: 'center' }} />
          {['RISK', 'ZONE'].map(c => (
            <button key={c} onClick={() => setColorMode(c)} style={{
              padding: '4px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600,
              background: colorMode === c ? 'var(--blue-g)' : 'var(--card)',
              color: colorMode === c ? 'var(--blue)' : 'var(--t3)',
              border: `1px solid ${colorMode === c ? 'var(--blue-b)' : 'var(--border)'}`,
              cursor: 'pointer'
            }}>{c} VIEW</button>
          ))}
        </div>

        {/* Tile switcher */}
        <div style={{ display: 'flex', gap: 4 }}>
          <Layers size={12} color="var(--t3)" style={{ marginRight: 4, alignSelf: 'center' }} />
          {Object.keys(MAP_TILES).map(t => (
            <button key={t} onClick={() => setTileKey(t)} style={{
              padding: '4px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600,
              background: tileKey === t ? 'var(--blue-g)' : 'var(--card)',
              color: tileKey === t ? 'var(--blue)' : 'var(--t3)',
              border: `1px solid ${tileKey === t ? 'var(--blue-b)' : 'var(--border)'}`,
              cursor: 'pointer', textTransform: 'capitalize'
            }}>{t}</button>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 10, borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
          {colorMode === 'RISK' ? Object.entries(RISKS).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.col }} />
              <span style={{ color: 'var(--t2)' }}>{k.charAt(0)+k.slice(1).toLowerCase()}</span>
            </div>
          )) : Object.entries(ZONES).slice(0, 5).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', fontWeight: 700 }}>
              <div style={{ width: 8, height: 8, borderRadius: '2px', background: v }} />
              <span style={{ color: 'var(--t2)' }}>{k}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MapContainer center={[22.5, 79.0]} zoom={5} maxBounds={[[6.5, 68.0], [35.5, 97.0]]} style={{ height: '100%', width: '100%' }}>
          <TileLayer key={tileKey} url={MAP_TILES[tileKey]} attribution="© Google / CARTO" />
          {visible.map(a => <LocomotiveMarker key={a.train_id} alert={a} colorMode={colorMode} />)}
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
