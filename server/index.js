import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-super-secret-key-change-in-production';

// Available roles
const ROLES = ['super_admin', 'admin', 'manager', 'worker', 'client'];

app.use(cors());
app.use(express.json());

// Initialize SQLite
const dbPath = process.env.DB_PATH || join(__dirname, 'crmka.db');
const db = new Database(dbPath);

// ==================== DATABASE SCHEMA ====================

// 1. Global Users (Authenticaton)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 2. Companies (Tenants)
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  )
`);

// 3. Members (Link Users <-> Companies with Roles)
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    role TEXT DEFAULT 'worker',
    
    -- Profile details specific to this company
    phone TEXT,
    position TEXT,
    department TEXT,
    avatar_color TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    UNIQUE(user_id, company_id)
  )
`);

// 4. Clients (Scoped to Company)
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    address TEXT,
    status TEXT DEFAULT 'active',
    assigned_to INTEGER, -- member_id
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (assigned_to) REFERENCES members(id)
  )
`);

// 5. Activities (Scoped to Company)
db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL, -- member_id
    client_id INTEGER,
    status TEXT DEFAULT 'pending',
    scheduled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES members(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )
`);

// 6. Inventory (Warehouse)
db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    min_quantity INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  )
`);

// 7. Inventory Transactions (History)
db.exec(`
  CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL, -- member_id who took/added
    client_id INTEGER, -- Optional: if taken for valid client
    quantity INTEGER NOT NULL, -- Positive for add, Negative for take (or verify logic below)
    type TEXT NOT NULL, -- 'restock', 'use'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (item_id) REFERENCES inventory(id),
    FOREIGN KEY (user_id) REFERENCES members(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )
`);

console.log('Database initialized successfully with Multi-Tenant schema');

// Util: Generate Color
const generateAvatarColor = () => {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// ==================== MIDDLEWARE ====================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Check Company Access & Role
const requireCompany = (req, res, next) => {
  const companyId = req.headers['x-company-id'];
  if (!companyId) return res.status(400).json({ error: 'Company ID required' });

  const member = db.prepare('SELECT * FROM members WHERE user_id = ? AND company_id = ?').get(req.user.id, companyId);

  if (!member) return res.status(403).json({ error: 'Access to this company denied' });

  req.companyId = parseInt(companyId);
  req.member = member;
  next();
};

// ==================== AUTH & ONBOARDING ROUTES ====================

// 1. Register (Creates User + Company + Member Owner)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, companyName } = req.body;

    if (!name || !email || !password || !companyName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    let userId;
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists. Please login and create a company.' });
    } else {
      // Create User
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hashedPassword);
      userId = result.lastInsertRowid;
    }

    // Create Company
    const compResult = db.prepare('INSERT INTO companies (name, owner_id) VALUES (?, ?)').run(companyName, userId);
    const companyId = compResult.lastInsertRowid;

    // Create Member (Owner/Super Admin)
    const avatarColor = generateAvatarColor();
    db.prepare(`
      INSERT INTO members (user_id, company_id, role, avatar_color, position) 
      VALUES (?, ?, 'super_admin', ?, 'Owner')
    `).run(userId, companyId, avatarColor);

    // Login
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: userId, name, email },
      companyId: companyId // Auto-select this company
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login error' });
  }
});

// 3. Get User's Companies
app.get('/api/me/companies', authenticateToken, (req, res) => {
  const companies = db.prepare(`
    SELECT c.id, c.name, m.role, m.avatar_color 
    FROM companies c
    JOIN members m ON c.id = m.company_id
    WHERE m.user_id = ?
  `).all(req.user.id);

  res.json({ companies });
});

// 4. Create New Company (for existing user)
app.post('/api/companies', authenticateToken, (req, res) => {
  const { name } = req.body;

  const result = db.prepare('INSERT INTO companies (name, owner_id) VALUES (?, ?)').run(name, req.user.id);
  const companyId = result.lastInsertRowid;

  db.prepare(`
    INSERT INTO members (user_id, company_id, role, avatar_color, position) 
    VALUES (?, ?, 'super_admin', ?, 'Owner')
  `).run(req.user.id, companyId, generateAvatarColor());

  res.json({ message: 'Company created', company: { id: companyId, name, role: 'super_admin' } });
});


// ==================== COMPANY DATA ROUTES ====================

// Get Current Member Info
app.get('/api/company/me', authenticateToken, requireCompany, (req, res) => {
  res.json({ member: { ...req.member, name: db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id).name } });
});

// Update Company Name (Super Admin only)
app.patch('/api/company', authenticateToken, requireCompany, (req, res) => {
  if (req.member.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Super Admin can rename the company' });
  }
  const { name } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Company name is required' });
  }

  db.prepare('UPDATE companies SET name = ? WHERE id = ?').run(name.trim(), req.companyId);
  res.json({ message: 'Company updated', name: name.trim() });
});

// 1. Team Members
app.get('/api/members', authenticateToken, requireCompany, (req, res) => {
  const members = db.prepare(`
    SELECT m.*, u.name, u.email 
    FROM members m
    JOIN users u ON m.user_id = u.id
    WHERE m.company_id = ?
  `).all(req.companyId);
  res.json({ members });
});

// Add Member (Invite User)
app.post('/api/members', authenticateToken, requireCompany, async (req, res) => {
  // Simplified: If user exists -> add to company. If not -> Create temp user? 
  // For now: Only add existing users by email or create new simple user

  const { name, email, password, role } = req.body;

  let userId;
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

  if (existingUser) {
    userId = existingUser.id;
    // Check if already member
    const isMember = db.prepare('SELECT id FROM members WHERE user_id = ? AND company_id = ?').get(userId, req.companyId);
    if (isMember) return res.status(400).json({ error: 'User is already a member' });
  } else {
    // Create new user
    const hashed = await bcrypt.hash(password || '123456', 10);
    const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hashed);
    userId = result.lastInsertRowid;
  }

  const avatar = generateAvatarColor();
  db.prepare(`
    INSERT INTO members (user_id, company_id, role, avatar_color) VALUES (?, ?, ?, ?)
  `).run(userId, req.companyId, role || 'worker', avatar);

  res.json({ message: 'Member added' });
});

app.delete('/api/members/:id', authenticateToken, requireCompany, (req, res) => {
  // logic to prevent deleting self or owner...
  db.prepare('DELETE FROM members WHERE id = ? AND company_id = ?').run(req.params.id, req.companyId);
  res.json({ message: 'Deleted' });
});

app.patch('/api/members/:id/role', authenticateToken, requireCompany, (req, res) => {
  const { role } = req.body;
  db.prepare('UPDATE members SET role = ? WHERE id = ? AND company_id = ?').run(role, req.params.id, req.companyId);
  res.json({ message: 'Updated' });
});


// 2. Clients
app.get('/api/clients', authenticateToken, requireCompany, (req, res) => {
  const clients = db.prepare('SELECT * FROM clients WHERE company_id = ? ORDER BY created_at DESC').all(req.companyId);
  res.json({ clients });
});

app.post('/api/clients', authenticateToken, requireCompany, (req, res) => {
  const { name, company, email, phone } = req.body;
  db.prepare(`
    INSERT INTO clients (company_id, name, company, email, phone) VALUES (?, ?, ?, ?, ?)
  `).run(req.companyId, name, company, email, phone);
  res.json({ message: 'Client created' });
});

// 3. Activities
app.get('/api/activities', authenticateToken, requireCompany, (req, res) => {
  const activities = db.prepare(`
    SELECT a.*, m.user_id, u.name as user_name, c.name as client_name
    FROM activities a
    JOIN members m ON a.created_by = m.id
    JOIN users u ON m.user_id = u.id
    LEFT JOIN clients c ON a.client_id = c.id
    WHERE a.company_id = ?
    ORDER BY a.created_at DESC
  `).all(req.companyId);
  res.json({ activities });
});

// Migration: Add phone to members if not exists
try {
  db.prepare('ALTER TABLE members ADD COLUMN phone TEXT').run();
} catch (e) {
  // Ignore if column exists
}

// 4. Stats
app.get('/api/stats', authenticateToken, requireCompany, (req, res) => {
  const stats = {
    totalClients: db.prepare('SELECT COUNT(*) as c FROM clients WHERE company_id = ?').get(req.companyId).c,
    totalMembers: db.prepare('SELECT COUNT(*) as c FROM members WHERE company_id = ?').get(req.companyId).c,
    lowStockItems: db.prepare('SELECT COUNT(*) as c FROM inventory WHERE company_id = ? AND quantity <= min_quantity').get(req.companyId).c
  };
  res.json({ stats });
});

// Update Member Profile (Name, Position, Phone)
app.patch('/api/members/:id', authenticateToken, requireCompany, (req, res) => {
  const memberId = parseInt(req.params.id);
  const { name, position, phone } = req.body;

  // Get target member
  const targetMember = db.prepare('SELECT * FROM members WHERE id = ? AND company_id = ?').get(memberId, req.companyId);
  if (!targetMember) return res.status(404).json({ error: 'Member not found' });

  // Permission check: Can edit self OR if admin/super_admin/manager
  // Logic: 
  // - Self can edit own profile
  // - Admin/Super Admin/Manager can edit anyone? Usually yes.
  const isSelf = targetMember.user_id === req.user.id;
  const isManager = ['admin', 'manager', 'super_admin'].includes(req.member.role);

  if (!isSelf && !isManager) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  db.transaction(() => {
    // Update Member details
    db.prepare('UPDATE members SET position = ?, phone = ? WHERE id = ?').run(position || '', phone || '', memberId);

    // Update Global User Name if changed (Only if self or admin?) 
    // Let's allow updating name if provided
    if (name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, targetMember.user_id);
    }
  })();

  res.json({ message: 'Profile updated' });
});

// ==================== INVENTORY ROUTES ====================

// Get Inventory
app.get('/api/inventory', authenticateToken, requireCompany, (req, res) => {
  const items = db.prepare('SELECT * FROM inventory WHERE company_id = ? ORDER BY name ASC').all(req.companyId);
  res.json({ items });
});

// Add New Item (Manager/Admin)
app.post('/api/inventory', authenticateToken, requireCompany, (req, res) => {
  if (!['admin', 'manager', 'super_admin'].includes(req.member.role)) {
    return res.status(403).json({ error: 'Only managers can add items' });
  }
  const { name, quantity, unit, min_quantity } = req.body;

  const result = db.prepare(`
    INSERT INTO inventory (company_id, name, quantity, unit, min_quantity) VALUES (?, ?, ?, ?, ?)
  `).run(req.companyId, name, quantity || 0, unit || 'pcs', min_quantity || 5);

  // Log transaction
  if (quantity > 0) {
    db.prepare(`
       INSERT INTO inventory_transactions (company_id, item_id, user_id, quantity, type)
       VALUES (?, ?, ?, ?, 'restock')
     `).run(req.companyId, result.lastInsertRowid, req.member.id, quantity);
  }

  res.json({ message: 'Item added', id: result.lastInsertRowid });
});

// Restock Item (Manager/Admin)
app.post('/api/inventory/:id/restock', authenticateToken, requireCompany, (req, res) => {
  if (!['admin', 'manager', 'super_admin'].includes(req.member.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { quantity } = req.body;
  const itemId = req.params.id;

  db.transaction(() => {
    db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ? AND company_id = ?').run(quantity, itemId, req.companyId);
    db.prepare(`
       INSERT INTO inventory_transactions (company_id, item_id, user_id, quantity, type)
       VALUES (?, ?, ?, ?, 'restock')
    `).run(req.companyId, itemId, req.member.id, quantity);
  })();

  res.json({ message: 'Restocked' });
});

// Use Item (Worker takes item for client)
app.post('/api/inventory/:id/use', authenticateToken, requireCompany, (req, res) => {
  const { quantity, client_id } = req.body;
  const itemId = req.params.id;

  // Check stock
  const item = db.prepare('SELECT quantity FROM inventory WHERE id = ?').get(itemId);
  if (!item || item.quantity < quantity) {
    return res.status(400).json({ error: 'Not enough stock' });
  }

  db.transaction(() => {
    db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE id = ? AND company_id = ?').run(quantity, itemId, req.companyId);
    db.prepare(`
       INSERT INTO inventory_transactions (company_id, item_id, user_id, client_id, quantity, type)
       VALUES (?, ?, ?, ?, ?, 'use')
    `).run(req.companyId, itemId, req.member.id, client_id, quantity);
  })();

  res.json({ message: 'Item taken' });
});

// Get Client Inventory History
app.get('/api/clients/:id/inventory', authenticateToken, requireCompany, (req, res) => {
  const history = db.prepare(`
    SELECT t.id, t.quantity, t.created_at, i.name as item_name, i.unit, u.name as user_name
    FROM inventory_transactions t
    JOIN inventory i ON t.item_id = i.id
    JOIN members m ON t.user_id = m.id
    JOIN users u ON m.user_id = u.id
    WHERE t.client_id = ? AND t.company_id = ?
    ORDER BY t.created_at DESC
  `).all(req.params.id, req.companyId);

  res.json({ history });
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
