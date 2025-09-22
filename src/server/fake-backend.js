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

// Compute 4-stage vehicle health status: "-", "정상", "관심필요", "조치필요"
const computeDiagnosticStatus = (asset, rental) => {
  try {
    if (!asset || !asset.deviceSerial) return "-";
    // Critical: stolen => 조치필요
    if (rental && rental.reported_stolen) return "조치필요";
    // Overdue rental => 관심필요
    const now = new Date();
    const end = rental?.rental_period?.end ? new Date(rental.rental_period.end) : null;
    if (end && now > end) return "관심필요";
    // Insurance expiring within 30 days => 관심필요
    const exp = asset.insuranceExpiryDate ? new Date(asset.insuranceExpiryDate) : null;
    if (exp && (exp - now) / (1000 * 60 * 60 * 24) <= 30) return "관심필요";
    return "정상";
  } catch {
    return "-";
  }
};

const getAssetsArray = () =>
  getVehiclesArray().map((v) => {
    const merged = { ...v.asset, rental: v.rental };
    if (!merged.diagnosticStatus) {
      merged.diagnosticStatus = computeDiagnosticStatus(merged, v.rental);
    }
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
