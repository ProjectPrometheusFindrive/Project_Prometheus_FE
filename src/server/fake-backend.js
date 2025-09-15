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

// Load unified data
const dataPath = path.join(__dirname, '../data/unified-data.json');
let data;
try {
  const rawData = fs.readFileSync(dataPath, 'utf8');
  data = JSON.parse(rawData);
} catch (error) {
  console.error('Error loading data:', error);
  process.exit(1);
}

// Helper functions
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

const getVehiclesArray = () => Object.values(data.vehicles);
const getAssetsArray = () => getVehiclesArray().map(v => ({ ...v.asset, rental: v.rental }));
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
  // For demo purposes, just return updated data
  const updatedAsset = { id: req.params.id, ...req.body };
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
  res.json(data.geofences);
});

app.post('/api/geofences', async (req, res) => {
  await delay();
  const newGeofence = { id: Date.now(), ...req.body };
  res.status(201).json(newGeofence);
});

app.put('/api/geofences/:id', async (req, res) => {
  await delay();
  const updatedGeofence = { id: req.params.id, ...req.body };
  res.json(updatedGeofence);
});

app.delete('/api/geofences/:id', async (req, res) => {
  await delay();
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
  console.log(`📊 Loaded ${Object.keys(data.vehicles).length} vehicles and ${data.geofences.length} geofences`);
});

export default app;