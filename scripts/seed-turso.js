/**
 * Cronus — Script de Migração & Carga para Turso Cloud
 * Lê os dados do SQLite local (database.sqlite) e exporta tudo diretamente para o banco Turso.
 *
 * Modo de uso:
 * 1. Com .env configurado:
 *    node scripts/seed-turso.js
 *
 * 2. Ou passando URL e Token diretamente:
 *    node scripts/seed-turso.js <TURSO_DATABASE_URL> <TURSO_AUTH_TOKEN>
 */

const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

// Carregar .env se existir
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
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
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const args = process.argv.slice(2);
const tursoUrl = args[0] || process.env.TURSO_DATABASE_URL;
const tursoToken = args[1] || process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error('\n❌ Erro: Credenciais do Turso não encontradas!');
  console.log('\nPor favor, forneça as credenciais de uma das seguintes formas:');
  console.log('1. Crie um arquivo .env na raiz do projeto com:');
  console.log('   TURSO_DATABASE_URL=libsql://seu-banco.turso.io');
  console.log('   TURSO_AUTH_TOKEN=seu_token_aqui\n');
  console.log('2. Ou execute passando os parâmetros diretamente:');
  console.log('   node scripts/seed-turso.js <URL> <TOKEN>\n');
  process.exit(1);
}

const localDbPath = path.resolve(__dirname, '..', 'database.sqlite').replace(/\\/g, '/');

async function runMigration() {
  console.log('\n🚀 Iniciando sincronização: SQLite Local -> Turso Cloud...');
  console.log(`📁 Local: file:${localDbPath}`);
  console.log(`🌐 Turso: ${tursoUrl}\n`);

  // Conectar aos dois bancos
  const localClient = createClient({ url: `file:${localDbPath}` });
  const tursoClient = createClient({ url: tursoUrl, authToken: tursoToken });

  // 1. Criar tabelas no Turso
  console.log('⏳ 1. Criando estrutura de tabelas no Turso...');
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await tursoClient.execute(`
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

  await tursoClient.execute(`
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

  await tursoClient.execute(`
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

  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS blocked_dates (
      date TEXT PRIMARY KEY,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await tursoClient.execute(`
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

  console.log('✅ Tabelas criadas com sucesso no Turso.\n');

  // 2. Migrar Categorias
  const cats = (await localClient.execute('SELECT * FROM categories')).rows;
  console.log(`📦 Copiando ${cats.length} categorias...`);
  for (const c of cats) {
    await tursoClient.execute({
      sql: 'INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name',
      args: [c.id, c.name, c.created_at || new Date().toISOString()]
    });
  }

  // 3. Migrar Serviços
  const services = (await localClient.execute('SELECT * FROM services')).rows;
  console.log(`📦 Copiando ${services.length} serviços...`);
  for (const s of services) {
    await tursoClient.execute({
      sql: `INSERT INTO services (id, name, category, price, duration, description, image, active, featured, has_photo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              category = excluded.category,
              price = excluded.price,
              duration = excluded.duration,
              description = excluded.description,
              image = excluded.image,
              active = excluded.active,
              featured = excluded.featured,
              has_photo = excluded.has_photo`,
      args: [
        s.id, s.name, s.category, s.price, s.duration,
        s.description || '', s.image || '', s.active ? 1 : 0, s.featured ? 1 : 0, s.has_photo ? 1 : 0
      ]
    });
  }

  // 4. Migrar Clientes
  const clients = (await localClient.execute('SELECT * FROM clients')).rows;
  console.log(`📦 Copiando ${clients.length} clientes...`);
  for (const c of clients) {
    await tursoClient.execute({
      sql: `INSERT INTO clients (id, name, phone, email, birthdate, address, notes, block_local_payment, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              phone = excluded.phone,
              email = excluded.email,
              birthdate = excluded.birthdate,
              address = excluded.address,
              notes = excluded.notes,
              block_local_payment = excluded.block_local_payment`,
      args: [
        c.id, c.name, c.phone, c.email || '', c.birthdate || '',
        c.address || '', c.notes || '', c.block_local_payment ? 1 : 0, c.created_at || new Date().toISOString()
      ]
    });
  }

  // 5. Migrar Agendamentos
  const bookings = (await localClient.execute('SELECT * FROM bookings')).rows;
  console.log(`📦 Copiando ${bookings.length} agendamentos...`);
  for (const b of bookings) {
    await tursoClient.execute({
      sql: `INSERT INTO bookings (
              id, client_name, client_phone, client_email, client_address,
              service_ids, service_names, date, time, duration,
              total_price, home_service_fee, amount_paid_now, remaining_amount,
              deposit_policy, service_location, payment_method, payment_status,
              status, is_block, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              client_name = excluded.client_name,
              client_phone = excluded.client_phone,
              client_email = excluded.client_email,
              client_address = excluded.client_address,
              service_ids = excluded.service_ids,
              service_names = excluded.service_names,
              date = excluded.date,
              time = excluded.time,
              duration = excluded.duration,
              total_price = excluded.total_price,
              home_service_fee = excluded.home_service_fee,
              amount_paid_now = excluded.amount_paid_now,
              remaining_amount = excluded.remaining_amount,
              deposit_policy = excluded.deposit_policy,
              service_location = excluded.service_location,
              payment_method = excluded.payment_method,
              payment_status = excluded.payment_status,
              status = excluded.status,
              is_block = excluded.is_block,
              notes = excluded.notes`,
      args: [
        b.id, b.client_name, b.client_phone, b.client_email || '', b.client_address || '',
        b.service_ids, b.service_names, b.date, b.time, b.duration,
        b.total_price, b.home_service_fee || 0, b.amount_paid_now || 0, b.remaining_amount || 0,
        b.deposit_policy || 'full', b.service_location || 'studio', b.payment_method, b.payment_status,
        b.status, b.is_block ? 1 : 0, b.notes || '', b.created_at || new Date().toISOString()
      ]
    });
  }

  // 6. Migrar Datas Bloqueadas
  const blocked = (await localClient.execute('SELECT * FROM blocked_dates')).rows;
  console.log(`📦 Copiando ${blocked.length} datas bloqueadas...`);
  for (const bl of blocked) {
    await tursoClient.execute({
      sql: 'INSERT INTO blocked_dates (date, reason) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET reason = excluded.reason',
      args: [bl.date, bl.reason || '']
    });
  }

  // 7. Migrar Configurações
  const setts = (await localClient.execute('SELECT * FROM settings WHERE id = 1')).rows[0];
  if (setts) {
    console.log('📦 Copiando configurações do studio...');
    await tursoClient.execute({
      sql: `INSERT INTO settings (
              id, studio_name, manicure_name, logo_url, whatsapp_number, instagram, address,
              pix_key, pix_key_type, service_location_mode, home_service_fee,
              opening_time, closing_time, slot_interval, cleaning_buffer_minutes,
              lunch_break_enabled, lunch_start, lunch_end, work_days,
              show_service_photos, payment_methods, deposit_policy, deposit_type,
              deposit_percentage, deposit_fixed_amount, min_notice_hours, max_days_ahead,
              cancellation_hours, delay_tolerance_minutes, admin_login, vacation_periods,
              reminder_whatsapp, reminder_hours, custom_reminder_message, updated_at
            ) VALUES (
              1, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, CURRENT_TIMESTAMP
            )
            ON CONFLICT(id) DO UPDATE SET
              studio_name = excluded.studio_name,
              manicure_name = excluded.manicure_name,
              logo_url = excluded.logo_url,
              whatsapp_number = excluded.whatsapp_number,
              instagram = excluded.instagram,
              address = excluded.address,
              pix_key = excluded.pix_key,
              pix_key_type = excluded.pix_key_type,
              service_location_mode = excluded.service_location_mode,
              home_service_fee = excluded.home_service_fee,
              opening_time = excluded.opening_time,
              closing_time = excluded.closing_time,
              slot_interval = excluded.slot_interval,
              cleaning_buffer_minutes = excluded.cleaning_buffer_minutes,
              lunch_break_enabled = excluded.lunch_break_enabled,
              lunch_start = excluded.lunch_start,
              lunch_end = excluded.lunch_end,
              work_days = excluded.work_days,
              show_service_photos = excluded.show_service_photos,
              payment_methods = excluded.payment_methods,
              deposit_policy = excluded.deposit_policy,
              deposit_type = excluded.deposit_type,
              deposit_percentage = excluded.deposit_percentage,
              deposit_fixed_amount = excluded.deposit_fixed_amount,
              min_notice_hours = excluded.min_notice_hours,
              max_days_ahead = excluded.max_days_ahead,
              cancellation_hours = excluded.cancellation_hours,
              delay_tolerance_minutes = excluded.delay_tolerance_minutes,
              admin_login = excluded.admin_login,
              vacation_periods = excluded.vacation_periods,
              reminder_whatsapp = excluded.reminder_whatsapp,
              reminder_hours = excluded.reminder_hours,
              custom_reminder_message = excluded.custom_reminder_message,
              updated_at = CURRENT_TIMESTAMP`,
      args: [
        setts.studio_name, setts.manicure_name, setts.logo_url, setts.whatsapp_number,
        setts.instagram, setts.address, setts.pix_key, setts.pix_key_type, setts.service_location_mode,
        setts.home_service_fee, setts.opening_time, setts.closing_time, setts.slot_interval,
        setts.cleaning_buffer_minutes, setts.lunch_break_enabled, setts.lunch_start, setts.lunch_end,
        setts.work_days, setts.show_service_photos, setts.payment_methods, setts.deposit_policy,
        setts.deposit_type, setts.deposit_percentage, setts.deposit_fixed_amount, setts.min_notice_hours,
        setts.max_days_ahead, setts.cancellation_hours, setts.delay_tolerance_minutes, setts.admin_login,
        setts.vacation_periods, setts.reminder_whatsapp, setts.reminder_hours, setts.custom_reminder_message
      ]
    });
  }

  // 8. Verificação final no Turso
  console.log('\n🔍 Verificando integridade no Turso Cloud:');
  const checkCats = (await tursoClient.execute('SELECT COUNT(*) as c FROM categories')).rows[0].c;
  const checkSrvs = (await tursoClient.execute('SELECT COUNT(*) as c FROM services')).rows[0].c;
  const checkClis = (await tursoClient.execute('SELECT COUNT(*) as c FROM clients')).rows[0].c;
  const checkBks = (await tursoClient.execute('SELECT COUNT(*) as c FROM bookings')).rows[0].c;
  const checkSet = (await tursoClient.execute('SELECT COUNT(*) as c FROM settings')).rows[0].c;

  console.log('----------------------------------------------------');
  console.log(`✅ Categorias no Turso: ${checkCats}`);
  console.log(`✅ Serviços no Turso:   ${checkSrvs}`);
  console.log(`✅ Clientes no Turso:   ${checkClis}`);
  console.log(`✅ Agendamentos:        ${checkBks}`);
  console.log(`✅ Configurações:       ${checkSet}`);
  console.log('----------------------------------------------------');
  console.log('🎉 Migração concluída com 100% de sucesso no Turso!\n');
}

runMigration().catch(err => {
  console.error('\n❌ Erro durante a migração:', err);
  process.exit(1);
});
