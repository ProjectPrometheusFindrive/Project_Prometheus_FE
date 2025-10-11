import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Load seed data (VIN-keyed map) and geofences
const dataPath = path.join(__dirname, '../data/seed.json');
const geofencesPath = path.join(__dirname, '../data/geofences.json');
let data;
let geofences = [];
try {
  const rawData = fs.readFileSync(dataPath, 'utf8');
  data = JSON.parse(rawData);
} catch (error) {
  console.error('Error loading data:', error);
  process.exit(1);
}
try {
  const gfRaw = fs.readFileSync(geofencesPath, 'utf8');
  const parsed = JSON.parse(gfRaw);
  geofences = Array.isArray(parsed)
    ? parsed.map((g, i) => ({ id: g.id ?? String(i + 1), name: g.name || `Polygon ${i + 1}`, points: Array.isArray(g.points) ? g.points : [] }))
    : [];
} catch (error) {
  console.warn('No geofences.json found or invalid JSON; starting with empty geofences.');
  geofences = [];
}

// Helper functions
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// In seed.json, root is the vehicles map
const getVehiclesArray = () => Object.values(data);

// Compute vehicle health status based on max diagnostic severity: "-", "정상", "관심필요", "심각"
const MANAGEMENT_STAGE_VALUES = new Set([
  "대여중",
  "대여가능",
  "예약중",
  "입고 대상",
  "수리/점검 중",
  "수리/점검 완료",
]);
const MANAGEMENT_STAGE_DEFAULT = "대여가능";
const LEGACY_STAGE_MAP = new Map([
  ["대여 중", "대여중"],
  ["대여 가능", "대여가능"],
  ["입고대상", "입고 대상"],
  ["입고 대상", "입고 대상"],
  ["전산등록완료", "입고 대상"],
  ["전산등록 완료", "입고 대상"],
  ["단말 장착 완료", "대여가능"],
  ["수리/점검 중", "수리/점검 중"],
  ["수리/점검 완료", "수리/점검 완료"],
]);

const deriveManagementStage = (asset = {}) => {
  if (!asset) return MANAGEMENT_STAGE_DEFAULT;
  const current = asset.managementStage;
  if (current) {
    if (MANAGEMENT_STAGE_VALUES.has(current)) return current;
    const legacy = LEGACY_STAGE_MAP.get(String(current).trim());
    if (legacy) return legacy;
  }

  const vehicleStatus = (asset.vehicleStatus || '').trim();
  const registrationStatus = (asset.registrationStatus || '').trim();
  const deviceSerial = (asset.deviceSerial || '').trim();
  const dc = asset.diagnosticCodes;
  const totalIssues = Array.isArray(dc) ? dc.length : 0;

  if (vehicleStatus === '대여중' || vehicleStatus === '운행중' || vehicleStatus === '반납대기') {
    return '대여중';
  }
  if (vehicleStatus === '예약중') {
    return '예약중';
  }
  if (vehicleStatus === '정비중' || vehicleStatus === '수리중' || vehicleStatus === '점검중' || vehicleStatus === '도난추적') {
    return '수리/점검 중';
  }

  if (totalIssues > 0) {
    return '수리/점검 중';
  }

  if (!deviceSerial) {
    return '입고 대상';
  }

  if (vehicleStatus === '대기중' || vehicleStatus === '유휴' || vehicleStatus === '대여가능' || vehicleStatus === '준비중') {
    return '대여가능';
  }

  if (vehicleStatus === '수리완료' || vehicleStatus === '점검완료') {
    return '수리/점검 완료';
  }

  if (registrationStatus === '장비부착 완료' || registrationStatus === '장비장착 완료' || registrationStatus === '보험등록 완료') {
    return '대여가능';
  }

  return MANAGEMENT_STAGE_DEFAULT;
};

const computeDiagnosticStatus = (asset) => {
  try {
    if (!asset || !asset.deviceSerial || !String(asset.deviceSerial).trim()) return '-';
    const list = Array.isArray(asset?.diagnosticCodes) ? asset.diagnosticCodes : [];
    const toNum = (x) => {
      const v = x?.severity;
      if (typeof v === 'number') return Math.max(0, Math.min(10, v));
      if (typeof v === 'string') {
        const m = v.trim();
        if (m === '낮음') return 2;
        if (m === '보통') return 5;
        if (m === '높음') return 8;
        const n = parseFloat(m);
        return isNaN(n) ? 0 : Math.max(0, Math.min(10, n));
      }
      return 0;
    };
    const max = list.reduce((acc, it) => Math.max(acc, toNum(it)), 0);
    if (max <= 3) return '정상';
    if (max <= 7) return '관심필요';
    return '심각';
  } catch {
    return '-';
  }
};

const getAssetsArray = () =>
  getVehiclesArray().map((v) => {
    const merged = { ...v.asset, rental: v.rental };
    if (!merged.diagnosticStatus) {
      merged.diagnosticStatus = computeDiagnosticStatus(merged, v.rental);
    }
    merged.managementStage = deriveManagementStage(merged);
    return merged;
  });
const getRentalsArray = () => {
  const allRentals = [];
  getVehiclesArray().forEach(v => {
    if (v.rental) {
      if (Array.isArray(v.rental)) {
        allRentals.push(...v.rental);
      } else {
        allRentals.push(v.rental);
      }
    }
  });
  return allRentals;
};
const getProblemVehicles = () => {
  const now = new Date();
  return getVehiclesArray().filter(v => {
    if (!v.rental) return false;
    const end = v.rental.rental_period?.end ? new Date(v.rental.rental_period.end) : null;
    const isOverdue = end ? now > end : false;
    const isStolen = Boolean(v.rental.reported_stolen);
    return isOverdue || isStolen;
  }).map(v => ({
    ...v.rental,
    asset: v.asset,
    issue: v.rental.reported_stolen ? 'stolen' : 
           (end => end && now > end ? `overdue(${Math.floor((now - end) / (1000 * 60 * 60 * 24))}d)` : '')(
             v.rental.rental_period?.end ? new Date(v.rental.rental_period.end) : null
           )
  }));
};

// API Routes

// Assets
app.get('/api/assets', async (req, res) => {
  await delay();
  res.json(getAssetsArray());
});

app.get('/api/assets/:id', async (req, res) => {
  await delay();
  const asset = getAssetsArray().find(a => a.id === req.params.id);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  res.json(asset);
});

app.post('/api/assets', async (req, res) => {
  await delay();
  // For demo purposes, just return the posted data with an ID
  const newAsset = { id: `VH-${Date.now()}`, ...req.body };
  res.status(201).json(newAsset);
});

app.put('/api/assets/:id', async (req, res) => {
  await delay();
  const id = req.params.id;
  const patch = req.body || {};
  // Try to find and update the in-memory data so subsequent GETs reflect changes
  let found = null;
  for (const [vin, v] of Object.entries(data)) {
    if (v && v.asset && v.asset.id === id) {
      const prev = v.asset;
      const merged = { ...prev, ...patch };
      // Merge insuranceHistory arrays if both exist
      if (Array.isArray(prev.insuranceHistory) || Array.isArray(patch.insuranceHistory)) {
        const base = Array.isArray(prev.insuranceHistory) ? [...prev.insuranceHistory] : [];
        const add = Array.isArray(patch.insuranceHistory) ? patch.insuranceHistory : [];
        const key = (h) => [h.date || h.startDate || '', h.company || '', h.product || ''].join('#');
        const seen = new Set(base.map(key));
        const out = [...base];
        for (const h of add) {
          const k = key(h);
          if (!seen.has(k)) {
            out.push(h);
            seen.add(k);
          }
        }
        out.sort((a, b) => new Date(a.startDate || a.date || 0) - new Date(b.startDate || b.date || 0));
        merged.insuranceHistory = out;
      }
      merged.managementStage = deriveManagementStage(merged);
      data[vin].asset = merged;
      found = merged;
      break;
    }
  }
  const updatedAsset = found || { id, ...patch };
  res.json(updatedAsset);
});

app.delete('/api/assets/:id', async (req, res) => {
  await delay();
  res.status(204).send();
});

// Rentals
app.get('/api/rentals', async (req, res) => {
  await delay();
  res.json(getRentalsArray());
});

app.get('/api/rentals/latest', async (req, res) => {
  await delay();
  res.json(getRentalsArray());
});

app.get('/api/rentals/:id', async (req, res) => {
  await delay();
  const rental = getRentalsArray().find(r => r.rental_id == req.params.id);
  if (!rental) {
    return res.status(404).json({ error: 'Rental not found' });
  }
  res.json(rental);
});

app.post('/api/rentals', async (req, res) => {
  await delay();
  const newRental = { rental_id: Date.now(), ...req.body };
  res.status(201).json(newRental);
});

app.put('/api/rentals/:id', async (req, res) => {
  await delay();
  const updatedRental = { rental_id: req.params.id, ...req.body };
  res.json(updatedRental);
});

app.delete('/api/rentals/:id', async (req, res) => {
  await delay();
  res.status(204).send();
});

// Problem Vehicles
app.get('/api/problem-vehicles', async (req, res) => {
  await delay();
  res.json(getProblemVehicles());
});

// Issue Drafts (simulate creating issue reports)
app.post('/api/issue-drafts', async (req, res) => {
  await delay();
  const newIssue = { id: Date.now(), createdAt: new Date().toISOString(), ...req.body };
  res.status(201).json(newIssue);
});

// Geofences
app.get('/api/geofences', async (req, res) => {
  await delay();
  res.json(geofences);
});

app.post('/api/geofences', async (req, res) => {
  await delay();
  const payload = req.body || {};
  const item = { id: String(Date.now()), name: payload.name || `Polygon ${geofences.length + 1}`, points: Array.isArray(payload.points) ? payload.points : [] };
  geofences.push(item);
  res.status(201).json(item);
});

app.put('/api/geofences/:id', async (req, res) => {
  await delay();
  const id = String(req.params.id);
  const idx = geofences.findIndex((g) => String(g.id) === id);
  if (idx === -1) return res.status(404).json({ error: 'Geofence not found' });
  const prev = geofences[idx];
  const patch = req.body || {};
  geofences[idx] = { ...prev, ...patch, id: prev.id };
  res.json(geofences[idx]);
});

app.delete('/api/geofences/:id', async (req, res) => {
  await delay();
  const id = String(req.params.id);
  geofences = geofences.filter((g) => String(g.id) !== id);
  res.status(204).send();
});

// Dashboard data
app.get('/api/dashboard', async (req, res) => {
  await delay();
  const vehicles = getVehiclesArray();
  const assets = getAssetsArray();
  const rentals = getRentalsArray();
  const problems = getProblemVehicles();
  
  const now = new Date();
  const activeRentals = rentals.filter(r => {
    const start = r.rental_period?.start ? new Date(r.rental_period.start) : null;
    const end = r.rental_period?.end ? new Date(r.rental_period.end) : null;
    return start && end && now >= start && now <= end;
  });

  const overdueRentals = rentals.filter(r => {
    const end = r.rental_period?.end ? new Date(r.rental_period.end) : null;
    return end && now > end && !r.reported_stolen;
  });

  const stolenVehicles = rentals.filter(r => r.reported_stolen);

  // Calculate registration status distribution
  const registered = assets.filter(a => a.registrationStatus === '장비장착 완료').length;
  const pending = assets.filter(a => a.registrationStatus === '등록 대기').length;
  const installing = assets.filter(a => a.registrationStatus === '장비장착 중').length;
  const available = assets.length - activeRentals.length;

  res.json({
    totalAssets: assets.length,
    availableAssets: registered,
    activeRentals: activeRentals.length,
    problemVehicles: problems.length,
    overdueRentals: overdueRentals.length,
    stolenVehicles: stolenVehicles.length,
    deviceInstalled: assets.filter(a => a.deviceSerial && a.deviceSerial.trim()).length,
    insuranceRegistered: assets.filter(a => a.registrationStatus !== '등록 대기').length,
    
    // Chart data for donut charts
    vehicleStatus: [
      { name: '등록완료', value: registered },
      { name: '등록대기', value: pending },
      { name: '장착중', value: installing }
    ].filter(item => item.value > 0),
    
    bizStatus: [
      { name: '렌탈중', value: activeRentals.length },
      { name: '이용가능', value: available },
      { name: '연체', value: overdueRentals.length },
      { name: '도난', value: stolenVehicles.length },
      { name: '문제차량', value: problems.length }
    ].filter(item => item.value > 0),
    
    recentActivities: [
      { id: 1, type: 'rental', message: '새 대여 계약이 등록되었습니다.', timestamp: new Date().toISOString() },
      { id: 2, type: 'asset', message: '차량 장비 설치가 완료되었습니다.', timestamp: new Date().toISOString() },
      { id: 3, type: 'problem', message: '반납 지연 차량이 발견되었습니다.', timestamp: new Date().toISOString() }
    ]
  });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Fake backend server running on http://localhost:${PORT}`);
  console.log(`📊 Loaded ${Object.keys(data).length} vehicles and ${geofences.length} geofences`);
});

export default app;
