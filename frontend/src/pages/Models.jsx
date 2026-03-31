import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts'
import { Network, Database, AlertOctagon, Cpu, ChevronDown, ChevronUp, Info } from 'lucide-react'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-b)', borderRadius: 8, padding: '8px 12px', fontSize: '0.75rem' }}>
      {payload.map((p, i) => <div key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {Math.round(p.value)}</div>)}
    </div>
  )
}

function ExpandableCard({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="glass-panel">
      <button
        onClick={() => setOpen(o => !o)}
        style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', width: '100%', borderBottom: open ? '1px solid var(--border)' : 'none' }}
      >
        <span style={{ color: 'var(--blue)' }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: '0.82rem' }}>{title}</span>
        {open ? <ChevronUp size={14} color="var(--t3)" /> : <ChevronDown size={14} color="var(--t3)" />}
      </button>
      {open && <div className="glass-content">{children}</div>}
    </div>
  )
}

export default function Models() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeModel, setActiveModel] = useState('bayesian')

  useEffect(() => {
    const host = ''
    fetch(`${host}/api/models/explainability`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => {
        // Mock data if backend offline
        setData({
          ensemble_accuracy: 0.87,
          models: {
            bayesian: { name: 'Bayesian Network', accuracy: 0.82, precision: 0.79, recall: 0.88 },
            isolation_forest: { name: 'Isolation Forest', accuracy: 0.75, precision: 0.73, recall: 0.78 },
            dbscan: { name: 'DBSCAN', accuracy: 0.68, precision: 0.65, recall: 0.72 },
            causal_dag: { name: 'Causal DAG', accuracy: 0.91, precision: 0.89, recall: 0.93 },
          },
          feature_importance: [
            { feature: 'signal_failure', importance: 0.34 },
            { feature: 'speed_deviation', importance: 0.28 },
            { feature: 'delay_trend', importance: 0.18 },
            { feature: 'junction_density', importance: 0.12 },
            { feature: 'maintenance_active', importance: 0.08 },
          ],
          causal_dag: {
            root_cause: 'Signal Relay Misconfiguration',
            impact_chain: ['Track Occupancy Confusion', 'Interlocking Override', 'Speed Limit Ignored', 'Collision Risk']
          }
        })
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--t2)' }}>
      <div style={{ fontSize: '2rem', animation: 'spin 1.5s linear infinite' }}>⚙️</div>
      <div style={{ fontSize: '0.9rem' }}>Loading AI Explainability Engine…</div>
    </div>
  )

  const isoData = Array.from({ length: 24 }).map((_, i) => ({
    x: i * 4,
    normal: Math.exp(-Math.pow(i - 10, 2) / 12) * 100,
    anomaly: i > 17 ? Math.exp(-Math.pow(i - 20, 2) / 3) * 50 : 0
  }))

  const radarData = data?.models ? Object.values(data.models).map(m => ({
    model: m.name.split(' ')[0],
    Accuracy: Math.round(m.accuracy * 100),
    Precision: Math.round(m.precision * 100),
    Recall: Math.round(m.recall * 100),
  })) : []

  const models = [
    { key: 'bayesian', icon: <Network size={16} />, label: 'Bayesian Network', desc: 'Probabilistic causal inference using conditional probability tables derived from CRS accident corpus.', stats: [['Accuracy', '82%'], ['Prior P(accident)', '0.023'], ['CPT nodes', '14']], color: 'var(--blue)' },
    { key: 'isolation', icon: <Database size={16} />, label: 'Isolation Forest', desc: 'Unsupervised anomaly detection that isolates outlier train states using randomized decision trees.', stats: [['Accuracy', '75%'], ['Contamination', '5%'], ['Estimators', '200']], color: 'var(--purple)' },
    { key: 'dbscan', icon: <Cpu size={16} />, label: 'DBSCAN Clustering', desc: 'Density-based spatial clustering to detect abnormal trajectory patterns and movement clusters.', stats: [['Accuracy', '68%'], ['Epsilon', '0.5'], ['Min Samples', '3']], color: 'var(--cyan)' },
    { key: 'causal', icon: <AlertOctagon size={16} />, label: 'Causal DAG', desc: 'Directed acyclic graph inference engine that discovers causal intervention pathways from historical accidents.', stats: [['Accuracy', '91%'], ['DAG nodes', '8'], ['Edges', '12']], color: 'var(--orange)' },
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 }}>AI Model Explainability</h2>
          <p style={{ color: 'var(--t3)', fontSize: '0.8rem' }}>Transparent breakdown of the ensemble ML stack driving DRISHTI predictions.</p>
        </div>
        <div style={{ background: 'var(--green-g)', border: '1px solid var(--green-b)', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.62rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>Ensemble Accuracy</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
            {data?.ensemble_accuracy ? `${Math.round(data.ensemble_accuracy * 100)}%` : '87%'}
          </div>
        </div>
      </div>

      {/* Model tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {models.map(m => (
          <button key={m.key} onClick={() => setActiveModel(m.key)} style={{
            padding: '12px 14px', borderRadius: 10, textAlign: 'left',
            background: activeModel === m.key ? `${m.color}22` : 'var(--card)',
            border: `1px solid ${activeModel === m.key ? m.color+'55' : 'var(--border)'}`,
            cursor: 'pointer', transition: 'all 0.18s'
          }}>
            <div style={{ color: m.color, marginBottom: 6 }}>{m.icon}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: activeModel === m.key ? 'var(--t1)' : 'var(--t2)', marginBottom: 2 }}>{m.label}</div>
            {m.stats.map(([k, v]) => (
              <div key={k} style={{ fontSize: '0.62rem', color: 'var(--t3)' }}>{k}: <span style={{ color: m.color }}>{v}</span></div>
            ))}
          </button>
        ))}
      </div>

      {/* Active model detail */}
      {(() => {
        const m = models.find(x => x.key === activeModel)
        return (
          <div className="glass-panel anim-fade" key={activeModel}>
            <div className="glass-header">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{m.icon} {m.label}</div>
              <span className="badge badge-blue">Active in Ensemble</span>
            </div>
            <div className="glass-content">
              <p style={{ color: 'var(--t2)', fontSize: '0.82rem', marginBottom: 12, lineHeight: 1.6 }}>{m.desc}</p>
              {activeModel === 'isolation' && (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={isoData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gNormal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gAnom" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="x" stroke="var(--border)" tick={{ fill: 'var(--t3)', fontSize: 9 }} />
                    <YAxis stroke="var(--border)" tick={{ fill: 'var(--t3)', fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="normal" name="Normal" stroke="#3b82f6" fill="url(#gNormal)" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="anomaly" name="Anomaly" stroke="#ef4444" fill="url(#gAnom)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {activeModel === 'bayesian' && (
                <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: '10px 0' }}>
                  <div style={{ display: 'flex', gap: 20 }}>
                    {[['P(Signal|Delay)','0.88','var(--blue)'], ['P(Speed|Clear)','0.72','var(--cyan)'], ['P(Overlap|Maint)','0.91','var(--purple)']].map(([k,v,c]) => (
                      <div key={k} style={{ padding: '10px 16px', background: 'var(--bg3)', border: `1px solid ${c}44`, borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--t3)', marginBottom: 4 }}>{k}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: c, fontFamily: 'JetBrains Mono, monospace' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 32, borderLeft: '2px dashed var(--blue)' }} />
                  <div style={{ padding: '12px 24px', background: 'var(--red-g)', border: '1px solid var(--red-b)', borderRadius: 8, fontWeight: 700, color: 'var(--red)', fontSize: '1rem' }}>
                    P(Collision) = 0.82
                  </div>
                </div>
              )}
              {activeModel === 'causal' && data?.causal_dag && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflowX: 'auto', padding: '12px 0' }}>
                  <div style={{ background: 'var(--bg3)', border: '1px solid var(--border-b)', padding: '10px 14px', borderRadius: 8, whiteSpace: 'nowrap', fontSize: '0.8rem', flexShrink: 0 }}>
                    🔴 {data.causal_dag.root_cause}
                  </div>
                  {data.causal_dag.impact_chain.map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <div style={{ color: 'var(--orange)', fontSize: '1rem' }}>➔</div>
                      <div style={{
                        background: i === data.causal_dag.impact_chain.length - 1 ? 'var(--red-g)' : 'var(--bg3)',
                        border: `1px solid ${i === data.causal_dag.impact_chain.length - 1 ? 'var(--red-b)' : 'var(--border)'}`,
                        padding: '10px 14px', borderRadius: 8, fontSize: '0.78rem', whiteSpace: 'nowrap'
                      }}>{step}</div>
                    </div>
                  ))}
                </div>
              )}
              {activeModel === 'dbscan' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
                  {[['Cluster 1 (Normal)','98 trains','var(--green)'],['Cluster 2 (Edge)','34 trains','var(--yellow)'],['Cluster -1 (Outlier)','12 trains','var(--red)']].map(([k,v,c]) => (
                    <div key={k} style={{ background: 'var(--bg3)', border: `1px solid ${c}33`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--t3)', marginBottom: 4 }}>{k}</div>
                      <div style={{ fontWeight: 800, color: c, fontSize: '1.1rem', fontFamily: 'JetBrains Mono, monospace' }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Feature importance */}
      {data?.feature_importance && (
        <ExpandableCard title="Feature Importance (Ensemble)" icon={<Info size={15} />} defaultOpen={true}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.feature_importance.sort((a,b)=>b.importance-a.importance).map(f => (
              <div key={f.feature}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--t2)' }}>{f.feature.replace(/_/g, ' ')}</span>
                  <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--blue)' }}>{(f.importance * 100).toFixed(1)}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${f.importance * 100}%`, height: '100%',
                    background: `linear-gradient(90deg, var(--blue), var(--cyan))`,
                    borderRadius: 3, transition: 'width 0.8s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </ExpandableCard>
      )}
    </div>
  )
}
