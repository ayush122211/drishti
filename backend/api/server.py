"""
DRISHTI FastAPI Server v4.0
Real-time Railway Accident Prevention — Self-contained with mock streaming
"""

import json, asyncio, logging, random, uuid
from datetime import datetime
from typing import List, Optional, Dict
from pathlib import Path

from fastapi import FastAPI, WebSocket, Query
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DRISHTI API", description="Railway Accident Prevention System", version="4.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# ── Global State ──────────────────────────────────────────────────────────────
active_connections: List[WebSocket] = []
alert_buffer: List[Dict] = []
stats = {
    "total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0,
    "trains_monitored": 2041, "batches_processed": 0,
    "uptime_start": datetime.now().isoformat()
}

# ── Indian Railways Data ──────────────────────────────────────────────────────
TRAINS = [
    ("12001","Shatabdi Express"), ("12951","Mumbai Rajdhani"), ("12309","Patna Rajdhani"),
    ("12301","Howrah Rajdhani"), ("22691","Bangalore Rajdhani"), ("12622","Tamil Nadu Express"),
    ("12627","Karnataka Express"), ("12723","Telangana Express"), ("11061","Pawan Express"),
    ("12801","Purushottam SF"), ("12275","Duronto Express"), ("20503","NE Rajdhani"),
    ("12423","Dibrugarh Rajdhani"), ("12813","Steel Express"), ("12559","Shiv Ganga Express"),
    ("12381","Poorva Express"), ("14005","Lichchavi Express"), ("12002","Bhopal Shatabdi"),
    ("22119","Mumbai-Goa Tejas"), ("12259","Sealdah Duronto"), ("12969","Jaipur SF"),
    ("16588","Rani Chennamma"), ("12649","Karnataka Sampark"), ("19301","Indrail Pass"),
]

STATIONS = [
    ("NDLS","New Delhi"), ("MMCT","Mumbai Central"), ("HWH","Howrah Jn"),
    ("MAS","Chennai Central"), ("SBC","Bengaluru City"), ("PUNE","Pune Jn"),
    ("ADI","Ahmedabad"), ("JP","Jaipur"), ("LKO","Lucknow NR"),
    ("PNBE","Patna Jn"), ("BPL","Bhopal Jn"), ("NGP","Nagpur"),
    ("SC","Secunderabad"), ("ERS","Ernakulam Jn"), ("GHY","Guwahati"),
    ("BSB","Varanasi Jn"), ("VSKP","Visakhapatnam"), ("BBS","Bhubaneswar"),
    ("UDZ","Udaipur City"), ("JAT","Jammu Tawi"), ("UHL","Ambala Cant"),
    ("AGC","Agra Cant"), ("CNB","Kanpur Central"), ("ALD","Prayagraj Jn"),
]

RISK_FACTORS = [
    "Bayesian Network: P(accident)={r1:.3f} — Elevated junction collision probability",
    "Isolation Forest: anomaly_score={r2:.1f} — Unusual speed-delay pattern detected",
    "Causal DAG: causal_risk={r3:.3f} — Cascading delay chain at junction",
    "Consensus: Signal at red, train approaching at {r4:.0f} km/h in restricted block",
    "Speed anomaly: {r4:.0f} km/h in 60 km/h zone — emergency brake advisory",
    "Maintenance flag: Track inspection overdue, risk amplifier ×{r2:.1f}",
    "DBSCAN: Trajectory isolated from cluster — possible ghost train signature",
    "Weather correlation: Fog visibility <50m, stopping distance insufficient at {r4:.0f} km/h",
]

ZONES = ["NR","CR","WR","SR","ER","SER","NER","SCR","NFR","ECR"]

zone_counts: Dict[str, Dict] = {z: {"critical":0,"high":0,"medium":0,"low":0,"total":0} for z in ZONES}

def rand_vals():
    return dict(r1=random.uniform(0.6,0.99), r2=random.uniform(60,100),
                r3=random.uniform(0.55,0.95), r4=random.uniform(70,140))

def make_alert() -> Dict:
    train = random.choice(TRAINS)
    station = random.choice(STATIONS)
    severity = random.choices(
        ["CRITICAL","HIGH","MEDIUM","LOW"], weights=[5,15,40,40])[0]
    risk_score = {"CRITICAL": random.uniform(86,100), "HIGH": random.uniform(70,86),
                  "MEDIUM": random.uniform(50,70), "LOW": random.uniform(28,50)}[severity]
    methods = {"CRITICAL": random.randint(3,4), "HIGH": random.randint(2,3),
               "MEDIUM": 2, "LOW": random.randint(1,2)}[severity]
    explanation = random.choice(RISK_FACTORS).format(**rand_vals())
    zone = random.choice(ZONES)
    zone_counts[zone][severity.lower()] += 1
    zone_counts[zone]["total"] += 1
    return {
        "id": f"ALT-{uuid.uuid4().hex[:6].upper()}",
        "train_id": train[0], "train_name": train[1],
        "station_code": station[0], "station_name": station[1],
        "severity": severity, "risk_score": round(risk_score, 1),
        "methods_agreeing": methods, "zone": zone,
        "bayesian_risk": round(random.uniform(0.5,0.99) if severity in ["CRITICAL","HIGH"] else random.uniform(0.2,0.6), 3),
        "anomaly_score": round(random.uniform(60,100), 1),
        "explanation": explanation,
        "actions": random.sample(["HUD_WARNING","BRAKE_ADVISORY","ALERT_ADJACENT","NOTIFY_CONTROLLER","LOG_AUDIT","REROUTE_SUGGESTION"], k=random.randint(2,4)),
        "timestamp": datetime.now().isoformat(),
    }

async def broadcast(msg: Dict):
    dead = []
    for ws in active_connections:
        try: await ws.send_json(msg)
        except: dead.append(ws)
    for ws in dead:
        try: active_connections.remove(ws)
        except: pass

async def streaming_loop():
    await asyncio.sleep(2)
    while True:
        try:
            n = random.choices([1,2,3], weights=[60,30,10])[0]
            for _ in range(n):
                alert = make_alert()
                stats["total"] += 1
                stats[alert["severity"].lower()] += 1
                stats["batches_processed"] += 1
                alert_buffer.append(alert)
                if len(alert_buffer) > 300: alert_buffer.pop(0)
                await broadcast({"type":"alert","data":alert,"stats":{**stats}})
                await asyncio.sleep(0.2)
            await asyncio.sleep(random.uniform(4,10))
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup():
    asyncio.create_task(streaming_loop())
    logger.info("[DRISHTI v4.0] Streaming engine started")

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def dashboard():
    html_path = Path(__file__).parent / "dashboard.html"
    return HTMLResponse(content=html_path.read_text(encoding="utf-8"))

@app.get("/health")
async def health():
    return {"status":"online","service":"DRISHTI v4.0",
            "timestamp":datetime.now().isoformat(),
            "connections":len(active_connections),"buffer":len(alert_buffer)}

@app.get("/api/stats")
async def get_stats():
    uptime = int((datetime.now() - datetime.fromisoformat(stats["uptime_start"])).total_seconds())
    return {**stats, "uptime_seconds":uptime,
            "active_connections":len(active_connections),"zones":zone_counts}

@app.get("/api/alerts/history")
async def history(severity: Optional[str]=Query(None), limit: int=Query(50,le=200), offset: int=Query(0)):
    items = list(reversed(alert_buffer))
    if severity: items = [a for a in items if a["severity"]==severity.upper()]
    return {"total":len(items),"alerts":items[offset:offset+limit]}

@app.get("/api/train/{train_id}/risk")
async def train_risk(train_id: str):
    alerts = [a for a in alert_buffer if a["train_id"]==train_id]
    if not alerts: return {"train_id":train_id,"risk_level":"UNKNOWN","alert_count":0}
    latest = alerts[-1]
    return {"train_id":train_id,"risk_level":latest["severity"],
            "risk_score":latest["risk_score"],"alert_count":len(alerts),"last_alert":latest}

@app.websocket("/ws/live")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        await websocket.send_json({
            "type":"init","stats":{**stats},
            "recent_alerts":list(reversed(alert_buffer[-30:])),"zones":zone_counts
        })
        while True:
            try: await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                await websocket.send_json({"type":"heartbeat","ts":datetime.now().isoformat()})
    except:
        pass
    finally:
        try: active_connections.remove(websocket)
        except: pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
