/**
 * Cronus — Unified Database Engine (Turso Cloud libSQL + Local SQLite)
 * Suporta libSQL Cloud (Turso) em produção (Netlify) e SQLite local em desenvolvimento.
 */

const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

// 1. Carregamento resiliente de variáveis de ambiente (.env) sem dependências externas
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx > 0) {
          const key = line.slice(0, eqIdx).trim();
          let val = line.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
    } catch (e) {
      console.warn('Aviso: Não foi possível ler .env local:', e.message);
    }
  }
}
loadEnv();

const isTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
const DB_PATH = path.join(__dirname, 'database.sqlite');

let client;
if (isTurso) {
  console.log('🌐 [DB] Conectado ao Turso Cloud Database:', process.env.TURSO_DATABASE_URL);
  client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
} else if (process.env.NETLIFY) {
  // Ambiente serverless Netlify sem Turso configurado: fallback temporário em /tmp
  console.warn('⚠️ [DB] Netlify detectado sem TURSO_DATABASE_URL. Usando banco temporário /tmp/database.sqlite');
  client = createClient({
    url: 'file:/tmp/database.sqlite'
  });
} else {
  // Ambiente local
  const resolvedPath = path.resolve(DB_PATH).replace(/\\/g, '/');
  console.log('📁 [DB] Usando SQLite local em:', resolvedPath);
  client = createClient({
    url: `file:${resolvedPath}`
  });
}

// Helpers de consulta universais
async function query(sql, args = []) {
  const res = await client.execute({ sql, args });
  return res.rows || [];
}

async function queryOne(sql, args = []) {
  const res = await client.execute({ sql, args });
  return res.rows && res.rows.length > 0 ? res.rows[0] : null;
}

async function execute(sql, args = []) {
  return await client.execute({ sql, args });
}

async function batch(statements) {
  return await client.batch(statements);
}

async function executeMultiple(sql) {
  if (typeof client.executeMultiple === 'function') {
    return await client.executeMultiple(sql);
  }
  return await client.execute(sql);
}

/**
 * Criação das tabelas relacionais do sistema
 */
async function initSchema() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      duration INTEGER NOT NULL,
      description TEXT,
      image TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      has_photo INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      birthdate TEXT,
      address TEXT,
      notes TEXT,
      block_local_payment INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      client_email TEXT,
      client_address TEXT,
      service_ids TEXT,
      service_names TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration INTEGER NOT NULL,
      total_price REAL NOT NULL,
      home_service_fee REAL DEFAULT 0,
      amount_paid_now REAL DEFAULT 0,
      remaining_amount REAL DEFAULT 0,
      deposit_policy TEXT DEFAULT 'full',
      service_location TEXT DEFAULT 'studio',
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      status TEXT NOT NULL,
      is_block INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS blocked_dates (
      date TEXT PRIMARY KEY,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      studio_name TEXT,
      manicure_name TEXT,
      logo_url TEXT,
      whatsapp_number TEXT,
      instagram TEXT,
      address TEXT,
      pix_key TEXT,
      pix_key_type TEXT,
      service_location_mode TEXT DEFAULT 'both',
      home_service_fee REAL DEFAULT 0,
      opening_time TEXT DEFAULT '09:00',
      closing_time TEXT DEFAULT '19:00',
      slot_interval INTEGER DEFAULT 30,
      cleaning_buffer_minutes INTEGER DEFAULT 10,
      lunch_break_enabled INTEGER DEFAULT 1,
      lunch_start TEXT DEFAULT '12:00',
      lunch_end TEXT DEFAULT '13:00',
      work_days TEXT DEFAULT '[1,2,3,4,5,6]',
      show_service_photos INTEGER DEFAULT 1,
      payment_methods TEXT DEFAULT '{"pix":true,"creditCard":true,"debitCard":true,"local":true}',
      deposit_policy TEXT DEFAULT 'full',
      deposit_type TEXT DEFAULT 'percentage',
      deposit_percentage REAL DEFAULT 30,
      deposit_fixed_amount REAL DEFAULT 20,
      min_notice_hours INTEGER DEFAULT 2,
      max_days_ahead INTEGER DEFAULT 30,
      cancellation_hours INTEGER DEFAULT 4,
      delay_tolerance_minutes INTEGER DEFAULT 10,
      admin_login TEXT DEFAULT '{"email":"manicure@studio.com","password":"123456","isCustom":false}',
      vacation_periods TEXT DEFAULT '[]',
      reminder_whatsapp INTEGER DEFAULT 1,
      reminder_hours INTEGER DEFAULT 24,
      custom_reminder_message TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Migração automática para garantir colunas em tabelas pré-existentes
 */
async function migrateSchema() {
  async function getTableColumns(table) {
    const res = await client.execute(`PRAGMA table_info(${table})`);
    return (res.rows || []).map(c => c.name);
  }

  try {
    const clientCols = await getTableColumns('clients');
    if (clientCols.length > 0) {
      if (!clientCols.includes('birthdate')) {
        await client.execute('ALTER TABLE clients ADD COLUMN birthdate TEXT;');
      }
      if (!clientCols.includes('block_local_payment')) {
        await client.execute('ALTER TABLE clients ADD COLUMN block_local_payment INTEGER DEFAULT 0;');
      }
    }

    const bookingCols = await getTableColumns('bookings');
    if (bookingCols.length > 0) {
      if (!bookingCols.includes('amount_paid_now')) {
        await client.execute('ALTER TABLE bookings ADD COLUMN amount_paid_now REAL DEFAULT 0;');
      }
      if (!bookingCols.includes('remaining_amount')) {
        await client.execute('ALTER TABLE bookings ADD COLUMN remaining_amount REAL DEFAULT 0;');
      }
      if (!bookingCols.includes('deposit_policy')) {
        await client.execute("ALTER TABLE bookings ADD COLUMN deposit_policy TEXT DEFAULT 'full';");
      }
    }

    const settingsCols = await getTableColumns('settings');
    if (settingsCols.length > 0) {
      const newSettingCols = [
        { name: 'logo_url', def: 'TEXT' },
        { name: 'show_service_photos', def: 'INTEGER DEFAULT 1' },
        { name: 'payment_methods', def: `TEXT DEFAULT '{"pix":true,"creditCard":true,"debitCard":true,"local":true}'` },
        { name: 'deposit_policy', def: `TEXT DEFAULT 'full'` },
        { name: 'deposit_type', def: `TEXT DEFAULT 'percentage'` },
        { name: 'deposit_percentage', def: `REAL DEFAULT 30` },
        { name: 'deposit_fixed_amount', def: `REAL DEFAULT 20` },
        { name: 'min_notice_hours', def: `INTEGER DEFAULT 2` },
        { name: 'max_days_ahead', def: `INTEGER DEFAULT 30` },
        { name: 'cancellation_hours', def: `INTEGER DEFAULT 4` },
        { name: 'delay_tolerance_minutes', def: `INTEGER DEFAULT 10` },
        { name: 'admin_login', def: `TEXT DEFAULT '{"email":"manicure@studio.com","password":"123456","isCustom":false}'` },
        { name: 'vacation_periods', def: `TEXT DEFAULT '[]'` }
      ];

      for (const col of newSettingCols) {
        if (!settingsCols.includes(col.name)) {
          await client.execute(`ALTER TABLE settings ADD COLUMN ${col.name} ${col.def};`);
        }
      }
    }
  } catch (err) {
    console.warn('[DB] Migração verificada com aviso:', err.message);
  }
}

/**
 * Semeia o banco com os dados padrão se estiver vazio
 */
async function seedInitialData() {
  try {
    // 1. Categorias
    const catCountRes = await queryOne('SELECT COUNT(*) as count FROM categories');
    if (!catCountRes || Number(catCountRes.count) === 0) {
      const initialCats = [
        ['cat-1', 'Mãos'],
        ['cat-2', 'Pés'],
        ['cat-3', 'Combos'],
        ['cat-4', 'Gel e Alongamento'],
        ['cat-5', 'Spa e Cuidados']
      ];
      for (const [id, name] of initialCats) {
        await execute('INSERT INTO categories (id, name) VALUES (?, ?)', [id, name]);
      }
    }

    // 2. Serviços
    const srvCountRes = await queryOne('SELECT COUNT(*) as count FROM services');
    if (!srvCountRes || Number(srvCountRes.count) === 0) {
      const initialServices = [
        ['srv-1', 'Manicure Tradicional', 'Mãos', 38.00, 45, 'Cutilagem detalhada, alinhamento de unhas, hidratação de cutículas e esmaltação com acabamento espelhado.', 'assets/manicure.jpg', 1, 1, 1],
        ['srv-2', 'Pedicure Completa e Relaxante', 'Pés', 45.00, 50, 'Higienização, esfoliação suave com grânulos naturais, lixamento plantar, cutilagem delicada e esmaltação.', 'assets/pedicure.jpg', 1, 1, 1],
        ['srv-3', 'Combo Mão e Pé Perfeito', 'Combos', 75.00, 90, 'O pacote essencial com desconto exclusivo: manicure completa e pedicure com esfoliação e hidratação profunda.', 'assets/combo.jpg', 1, 1, 1],
        ['srv-4', 'Esmaltação em Gel de Longa Duração', 'Gel e Alongamento', 65.00, 60, 'Secagem instantânea na cabine LED/UV com brilho ultra resistente que dura de 15 a 21 dias sem lascar.', 'assets/gel.jpg', 1, 0, 1],
        ['srv-5', 'Alongamento em Fibra de Vidro', 'Gel e Alongamento', 140.00, 120, 'Unhas longas, finas e com curvatura natural utilizando filamentos de fibra e gel construtor premium.', 'assets/fibra.jpg', 1, 1, 1],
        ['srv-6', 'Spa dos Pés com Hidratação Profunda', 'Spa e Cuidados', 55.00, 45, 'Imersão em sais aromáticos, esfoliação revigorante, remoção de asperezas, máscara nutritiva e massagem podal.', 'assets/spa.jpg', 1, 0, 1],
        ['srv-7', 'Manutenção de Alongamento', 'Gel e Alongamento', 85.00, 90, 'Nivelamento da raiz, reposição de estrutura e novo acabamento para manter as unhas perfeitas.', 'assets/fibra.jpg', 1, 0, 1],
        ['srv-8', 'Nail Art / Decoração Personalizada', 'Gel e Alongamento', 25.00, 30, 'Francesinha francesa, degradê baby boomer, fitilhos, pedrarias ou encapsulados artesanais.', 'assets/nailart.jpg', 1, 0, 1]
      ];
      for (const srv of initialServices) {
        await execute(`
          INSERT INTO services (id, name, category, price, duration, description, image, active, featured, has_photo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, srv);
      }
    }

    // 3. Configurações
    const settsCountRes = await queryOne('SELECT COUNT(*) as count FROM settings WHERE id = 1');
    if (!settsCountRes || Number(settsCountRes.count) === 0) {
      await execute(`
        INSERT INTO settings (
          id, studio_name, manicure_name, logo_url, whatsapp_number, instagram, address,
          pix_key, pix_key_type, service_location_mode, home_service_fee,
          opening_time, closing_time, slot_interval, cleaning_buffer_minutes,
          lunch_break_enabled, lunch_start, lunch_end, work_days,
          show_service_photos, payment_methods, deposit_policy, deposit_type,
          deposit_percentage, deposit_fixed_amount, min_notice_hours, max_days_ahead,
          cancellation_hours, delay_tolerance_minutes, admin_login, vacation_periods,
          reminder_whatsapp, reminder_hours
        ) VALUES (
          1, 'Studio Bela Unha', 'Bela Souza', 'assets/manicure.jpg', '5511987654321', '@studiobelaunha', 'Rua das Flores, 420 - Sala 3 - Jardins, São Paulo - SP',
          '11987654321', 'Celular', 'both', 15.00,
          '09:00', '19:00', 30, 10,
          1, '12:00', '13:00', '[1,2,3,4,5,6]',
          1, '{"pix":true,"creditCard":true,"debitCard":true,"local":true}', 'full', 'percentage',
          30, 20, 2, 30,
          4, 10, '{"email":"manicure@studio.com","password":"123456","isCustom":false}', '[]',
          1, 24
        )
      `);
    }

    // 4. Clientes Iniciais
    const clientCountRes = await queryOne('SELECT COUNT(*) as count FROM clients');
    if (!clientCountRes || Number(clientCountRes.count) === 0) {
      const initialClients = [
        ['cli-1', 'Camila Fernandes', '(11) 98112-3344', 'camila.f@email.com', '14/05', 'Alameda Santos, 1200 - São Paulo', 'Gosta de tons nude, esmalte fosco e cutícula bem funda.', 0, '2026-09-10'],
        ['cli-2', 'Beatriz Lima', '(11) 97455-8899', 'beatriz.lima@email.com', '22/08', 'Rua Oscar Freire, 800 - Jardins', 'Prefere francesinha clássica ou encapsulada com folha de ouro.', 0, '2026-09-15'],
        ['cli-3', 'Mariana Duarte', '(11) 99233-1122', 'mariana.d@email.com', '03/11', 'Av. Paulista, 1500 - Bela Vista', 'Alongamento em fibra de vidro formato amendoado.', 0, '2026-09-20'],
        ['cli-4', 'Larissa Rocha', '(11) 98844-5566', 'larissa.r@email.com', '19/02', 'Rua Augusta, 450 - Consolação', 'Adora massagem no spa dos pés. Pele sensível.', 0, '2026-10-01'],
        ['cli-5', 'Juliana Costa', '(11) 97722-4411', 'juliana.c@email.com', '30/07', 'Rua Haddock Lobo, 920 - Cerqueira César', 'Cliente semanal de manicure tradicional. Cores vibrantes.', 0, '2026-10-05']
      ];
      for (const cli of initialClients) {
        await execute(`
          INSERT INTO clients (id, name, phone, email, birthdate, address, notes, block_local_payment, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, cli);
      }
    }

    // 5. Agendamentos Iniciais
    const bookingCountRes = await queryOne('SELECT COUNT(*) as count FROM bookings');
    if (!bookingCountRes || Number(bookingCountRes.count) === 0) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const todayDate = now.getDate();
      function pad(n) { return n < 10 ? '0' + n : n; }
      function fmt(d) { return `${year}-${pad(month + 1)}-${pad(d)}`; }

      const initialBookings = [
        [
          'AG-7101', 'Juliana Costa', '(11) 97722-4411', 'juliana.c@email.com', '',
          JSON.stringify(['srv-1']), 'Manicure Tradicional', fmt(Math.max(todayDate - 2, 1)), '11:00', 45,
          38.00, 0, 38.00, 0, 'full', 'studio', 'PIX', 'PAGO', 'CONCLUIDO', 0, 'Cliente semanal', new Date().toISOString()
        ],
        [
          'AG-7102', 'Camila Fernandes', '(11) 98112-3344', 'camila.f@email.com', '',
          JSON.stringify(['srv-3']), 'Combo Mão e Pé Perfeito', fmt(todayDate), '10:00', 90,
          75.00, 0, 75.00, 0, 'full', 'studio', 'PIX', 'PAGO', 'CONFIRMADO', 0, 'Gosta de tons nude e esmalte fosco', new Date().toISOString()
        ],
        [
          'AG-7103', 'Beatriz Lima', '(11) 97455-8899', 'beatriz.lima@email.com', 'Alameda Santos, 1200 - Apto 41',
          JSON.stringify(['srv-4', 'srv-8']), 'Esmaltação em Gel + Nail Art', fmt(todayDate), '14:30', 90,
          90.00, 15.00, 105.00, 0, 'full', 'home', 'CARTAO', 'PAGO', 'CONFIRMADO', 0, 'Atendimento a domicílio', new Date().toISOString()
        ],
        [
          'AG-7104', 'Mariana Duarte', '(11) 99233-1122', 'mariana.d@email.com', '',
          JSON.stringify(['srv-5']), 'Alongamento em Fibra de Vidro', fmt(Math.min(todayDate + 1, 28)), '09:30', 120,
          140.00, 0, 140.00, 0, 'full', 'studio', 'PIX', 'PAGO', 'CONFIRMADO', 0, 'Primeira vez no alongamento', new Date().toISOString()
        ],
        [
          'AG-7105', 'Larissa Rocha', '(11) 98844-5566', 'larissa.r@email.com', '',
          JSON.stringify(['srv-6']), 'Spa dos Pés com Hidratação Profunda', fmt(Math.min(todayDate + 2, 28)), '16:00', 45,
          55.00, 0, 55.00, 0, 'full', 'studio', 'PIX', 'PAGO', 'CONFIRMADO', 0, 'Pés cansados pós-viagem', new Date().toISOString()
        ]
      ];

      for (const bk of initialBookings) {
        await execute(`
          INSERT INTO bookings (
            id, client_name, client_phone, client_email, client_address,
            service_ids, service_names, date, time, duration,
            total_price, home_service_fee, amount_paid_now, remaining_amount,
            deposit_policy, service_location, payment_method, payment_status,
            status, is_block, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, bk);
      }
    }
  } catch (err) {
    console.warn('[DB] Seed inicial finalizado com aviso:', err.message);
  }
}

// Inicialização única (singleton promise) para ambientes serverless e locais
let initPromise = null;
function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      await initSchema();
      await migrateSchema();
      await seedInitialData();
      return true;
    })();
  }
  return initPromise;
}

// Inicializa no carregamento do arquivo
ensureInitialized()
  .then(() => console.log('✅ [DB] Inicialização e migração concluídas com sucesso.'))
  .catch(err => console.error('❌ [DB] Erro na inicialização:', err));

module.exports = {
  client,
  query,
  queryOne,
  execute,
  batch,
  executeMultiple,
  ensureInitialized,
  isTurso,
  DB_PATH
};
