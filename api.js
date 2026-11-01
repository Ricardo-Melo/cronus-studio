/**
 * Cronus — REST API Router (libSQL Cloud Turso + SQLite Local)
 * Endpoints HTTP assíncronos e universais para Node.js local e Netlify Serverless Functions.
 */

const { query, queryOne, execute, ensureInitialized, isTurso } = require('./db.js');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Consulta e formata todos os dados do banco para o frontend
 */
async function getAllData() {
  await ensureInitialized();

  // 1. Categorias
  const categories = await query('SELECT id, name FROM categories ORDER BY name ASC');

  // 2. Serviços
  const servicesRows = await query('SELECT * FROM services ORDER BY rowid ASC');
  const services = servicesRows.map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    price: r.price,
    duration: r.duration,
    description: r.description || '',
    image: r.image || 'assets/manicure.jpg',
    active: Boolean(r.active),
    featured: Boolean(r.featured),
    hasPhoto: Boolean(r.has_photo)
  }));

  // 3. Agendamentos
  const bookingsRows = await query('SELECT * FROM bookings ORDER BY date ASC, time ASC');
  const bookings = bookingsRows.map(r => {
    let sIds = [];
    try { sIds = JSON.parse(r.service_ids || '[]'); } catch (e) { sIds = []; }
    return {
      id: r.id,
      clientName: r.client_name,
      clientPhone: r.client_phone,
      clientEmail: r.client_email || '',
      clientAddress: r.client_address || '',
      serviceIds: sIds,
      serviceNames: r.service_names || '',
      date: r.date,
      time: r.time,
      duration: r.duration,
      durationMinutes: r.duration,
      totalPrice: r.total_price,
      homeServiceFee: r.home_service_fee || 0,
      amountPaidNow: r.amount_paid_now !== null && r.amount_paid_now !== undefined ? r.amount_paid_now : 0,
      remainingAmount: r.remaining_amount !== null && r.remaining_amount !== undefined ? r.remaining_amount : 0,
      depositPolicy: r.deposit_policy || 'full',
      serviceLocation: r.service_location || 'studio',
      paymentMethod: r.payment_method,
      paymentStatus: r.payment_status,
      status: r.status,
      isBlock: Boolean(r.is_block),
      notes: r.notes || ''
    };
  });

  // 4. Clientes
  const clientRows = await query('SELECT * FROM clients ORDER BY name ASC');
  const clients = clientRows.map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email || '',
    birthdate: c.birthdate || '',
    address: c.address || '',
    notes: c.notes || '',
    blockLocalPayment: Boolean(c.block_local_payment),
    createdAt: c.created_at ? String(c.created_at).split(' ')[0] : ''
  }));

  // 5. Datas Bloqueadas
  const blockedDates = await query('SELECT date, reason FROM blocked_dates');

  // 6. Configurações
  const settsRow = await queryOne('SELECT * FROM settings WHERE id = 1');
  let settings = null;
  if (settsRow) {
    let workDays = [1, 2, 3, 4, 5, 6];
    try { workDays = JSON.parse(settsRow.work_days || '[1,2,3,4,5,6]'); } catch (e) {}

    let paymentMethods = { pix: true, creditCard: true, debitCard: true, local: true };
    try {
      if (settsRow.payment_methods) paymentMethods = JSON.parse(settsRow.payment_methods);
    } catch (e) {}

    let adminLogin = { email: 'manicure@studio.com', password: '123456', isCustom: false };
    try {
      if (settsRow.admin_login) adminLogin = JSON.parse(settsRow.admin_login);
    } catch (e) {}

    let vacationPeriods = [];
    try {
      if (settsRow.vacation_periods) vacationPeriods = JSON.parse(settsRow.vacation_periods);
    } catch (e) {}

    settings = {
      studioName: settsRow.studio_name || 'Studio Bela Unha',
      manicureName: settsRow.manicure_name || 'Bela Souza',
      logoUrl: settsRow.logo_url || 'assets/manicure.jpg',
      whatsappNumber: settsRow.whatsapp_number || '5511987654321',
      instagram: settsRow.instagram || '@studiobelaunha',
      instagramHandle: settsRow.instagram || '@studiobelaunha',
      address: settsRow.address || '',
      pixKey: settsRow.pix_key || '',
      pixKeyType: settsRow.pix_key_type || 'Celular',
      serviceLocationMode: settsRow.service_location_mode || 'both',
      homeServiceFee: settsRow.home_service_fee || 0,
      openingTime: settsRow.opening_time || '09:00',
      closingTime: settsRow.closing_time || '19:00',
      slotInterval: settsRow.slot_interval || 30,
      cleaningBufferMinutes: settsRow.cleaning_buffer_minutes !== undefined ? settsRow.cleaning_buffer_minutes : 10,
      lunchBreakEnabled: Boolean(settsRow.lunch_break_enabled),
      hasLunchBreak: Boolean(settsRow.lunch_break_enabled),
      lunchStart: settsRow.lunch_start || '12:00',
      lunchStartTime: settsRow.lunch_start || '12:00',
      lunchEnd: settsRow.lunch_end || '13:00',
      lunchEndTime: settsRow.lunch_end || '13:00',
      workDays,
      showServicePhotos: settsRow.show_service_photos !== 0,
      paymentMethods,
      depositPolicy: settsRow.deposit_policy || 'full',
      depositType: settsRow.deposit_type || 'percentage',
      depositPercentage: settsRow.deposit_percentage || 30,
      depositFixedAmount: settsRow.deposit_fixed_amount || 20,
      minNoticeHours: settsRow.min_notice_hours || 2,
      maxDaysAhead: settsRow.max_days_ahead || 30,
      cancellationHours: settsRow.cancellation_hours || 4,
      delayToleranceMinutes: settsRow.delay_tolerance_minutes || 10,
      adminLogin,
      vacationPeriods,
      reminderWhatsApp: Boolean(settsRow.reminder_whatsapp),
      reminderHours: settsRow.reminder_hours || 24,
      customReminderMessage: settsRow.custom_reminder_message || '',
      blockedDates: blockedDates.map(b => b.date)
    };
  }

  return {
    categories,
    services,
    bookings,
    clients,
    blockedDates,
    settings
  };
}

/**
 * Núcleo do roteador da API universal (independente de servidor HTTP ou serverless)
 */
async function handleApiCore({ method, pathname, query: queryParams, body }) {
  await ensureInitialized();

  // CORS preflight
  if (method === 'OPTIONS') {
    return { status: 204, data: {} };
  }

  // 1. Health check & status
  if (pathname === '/api/status' && method === 'GET') {
    const cat = await queryOne('SELECT COUNT(*) as c FROM categories');
    const srv = await queryOne('SELECT COUNT(*) as c FROM services');
    const bk = await queryOne('SELECT COUNT(*) as c FROM bookings');
    const cli = await queryOne('SELECT COUNT(*) as c FROM clients');
    const blk = await queryOne('SELECT COUNT(*) as c FROM blocked_dates');

    return {
      status: 200,
      data: {
        ok: true,
        database: isTurso ? 'turso_libsql' : 'sqlite_local',
        counts: {
          categories: cat ? cat.c : 0,
          services: srv ? srv.c : 0,
          bookings: bk ? bk.c : 0,
          clients: cli ? cli.c : 0,
          blockedDates: blk ? blk.c : 0
        }
      }
    };
  }

  // 2. Buscar todos os dados
  if (pathname === '/api/all' && method === 'GET') {
    const allData = await getAllData();
    return { status: 200, data: allData };
  }

  // 3. Categorias (CRUD)
  if (pathname === '/api/categories') {
    if (method === 'GET') {
      const categories = await query('SELECT id, name FROM categories ORDER BY name ASC');
      return { status: 200, data: categories };
    }
    if (method === 'POST') {
      const b = body || {};
      if (!b.name || !b.name.trim()) {
        return { status: 400, data: { error: 'Nome da categoria é obrigatório.' } };
      }
      const id = b.id || 'cat-' + Date.now();
      const name = b.name.trim();

      await execute(`
        INSERT INTO categories (id, name) VALUES (?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name
      `, [id, name]);

      if (b.oldName && b.oldName !== name) {
        await execute('UPDATE services SET category = ? WHERE category = ?', [name, b.oldName]);
      }

      return { status: 200, data: { ok: true, id, name } };
    }
  }

  if (pathname.startsWith('/api/categories/') && method === 'DELETE') {
    const catId = pathname.replace('/api/categories/', '');
    const cat = await queryOne('SELECT name FROM categories WHERE id = ?', [catId]);
    if (cat) {
      await execute('DELETE FROM categories WHERE id = ?', [catId]);
      const fallback = await queryOne('SELECT name FROM categories LIMIT 1');
      if (fallback) {
        await execute('UPDATE services SET category = ? WHERE category = ?', [fallback.name, cat.name]);
      }
    }
    return { status: 200, data: { ok: true, deleted: catId } };
  }

  // 4. Serviços (CRUD)
  if (pathname === '/api/services') {
    if (method === 'GET') {
      const services = await query('SELECT * FROM services');
      return { status: 200, data: services };
    }
    if (method === 'POST') {
      const s = body || {};
      const id = s.id || 'srv-' + Date.now();
      await execute(`
        INSERT INTO services (id, name, category, price, duration, description, image, active, featured, has_photo)
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
          has_photo = excluded.has_photo
      `, [
        id,
        s.name,
        s.category || 'Mãos',
        parseFloat(s.price) || 0,
        parseInt(s.duration) || 45,
        s.description || '',
        s.image || 'assets/manicure.jpg',
        s.active !== false ? 1 : 0,
        s.featured ? 1 : 0,
        s.hasPhoto !== false ? 1 : 0
      ]);
      return { status: 200, data: { ok: true, id } };
    }
  }

  if (pathname.startsWith('/api/services/') && method === 'DELETE') {
    const srvId = pathname.replace('/api/services/', '');
    await execute('DELETE FROM services WHERE id = ?', [srvId]);
    return { status: 200, data: { ok: true, deleted: srvId } };
  }

  // 5. Agendamentos (CRUD)
  if (pathname === '/api/bookings') {
    if (method === 'GET') {
      const all = await getAllData();
      return { status: 200, data: all.bookings };
    }
    if (method === 'POST') {
      const b = body || {};
      const id = b.id || 'AG-' + Math.floor(1000 + Math.random() * 9000);
      await execute(`
        INSERT INTO bookings (
          id, client_name, client_phone, client_email, client_address,
          service_ids, service_names, date, time, duration,
          total_price, home_service_fee, amount_paid_now, remaining_amount,
          deposit_policy, service_location, payment_method, payment_status,
          status, is_block, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          notes = excluded.notes
      `, [
        id,
        b.clientName || '',
        b.clientPhone || '',
        b.clientEmail || '',
        b.clientAddress || '',
        JSON.stringify(b.serviceIds || []),
        b.serviceNames || '',
        b.date,
        b.time,
        parseInt(b.duration || b.durationMinutes) || 60,
        parseFloat(b.totalPrice) || 0,
        parseFloat(b.homeServiceFee) || 0,
        parseFloat(b.amountPaidNow) || 0,
        parseFloat(b.remainingAmount) || 0,
        b.depositPolicy || 'full',
        b.serviceLocation || 'studio',
        b.paymentMethod || 'PIX',
        b.paymentStatus || 'PENDENTE',
        b.status || 'CONFIRMADO',
        b.isBlock ? 1 : 0,
        b.notes || ''
      ]);
      return { status: 200, data: { ok: true, id } };
    }
  }

  if (pathname.startsWith('/api/bookings/') && method === 'DELETE') {
    const bookingId = pathname.replace('/api/bookings/', '');
    await execute('DELETE FROM bookings WHERE id = ?', [bookingId]);
    return { status: 200, data: { ok: true, deleted: bookingId } };
  }

  // 6. Datas Bloqueadas
  if (pathname === '/api/blocked-dates') {
    if (method === 'GET') {
      const rows = await query('SELECT * FROM blocked_dates');
      return { status: 200, data: rows };
    }
    if (method === 'POST') {
      const b = body || {};
      if (!b.date) return { status: 400, data: { error: 'Data é obrigatória' } };
      await execute(`
        INSERT INTO blocked_dates (date, reason) VALUES (?, ?)
        ON CONFLICT(date) DO UPDATE SET reason = excluded.reason
      `, [b.date, b.reason || 'Imprevisto / Folga']);
      return { status: 200, data: { ok: true, date: b.date } };
    }
  }

  if (pathname.startsWith('/api/blocked-dates/') && method === 'DELETE') {
    const dateKey = pathname.replace('/api/blocked-dates/', '');
    await execute('DELETE FROM blocked_dates WHERE date = ?', [dateKey]);
    return { status: 200, data: { ok: true, deleted: dateKey } };
  }

  // 7. Clientes (CRUD)
  if (pathname === '/api/clients') {
    if (method === 'GET') {
      const all = await getAllData();
      return { status: 200, data: all.clients };
    }
    if (method === 'POST') {
      const c = body || {};
      const id = c.id || 'cli-' + Date.now();
      await execute(`
        INSERT INTO clients (id, name, phone, email, birthdate, address, notes, block_local_payment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          phone = excluded.phone,
          email = excluded.email,
          birthdate = excluded.birthdate,
          address = excluded.address,
          notes = excluded.notes,
          block_local_payment = excluded.block_local_payment
      `, [
        id,
        c.name,
        c.phone,
        c.email || '',
        c.birthdate || '',
        c.address || '',
        c.notes || '',
        c.blockLocalPayment ? 1 : 0
      ]);
      return { status: 200, data: { ok: true, id } };
    }
  }

  if (pathname.startsWith('/api/clients/') && method === 'DELETE') {
    const clientId = pathname.replace('/api/clients/', '');
    await execute('DELETE FROM clients WHERE id = ?', [clientId]);
    return { status: 200, data: { ok: true, deleted: clientId } };
  }

  // 8. Configurações
  if (pathname === '/api/settings') {
    if (method === 'GET') {
      const all = await getAllData();
      return { status: 200, data: all.settings };
    }
    if (method === 'POST') {
      const s = body || {};
      const instagramVal = s.instagramHandle || s.instagram || '';
      const lunchBreakEnabledVal = s.hasLunchBreak !== undefined ? (s.hasLunchBreak ? 1 : 0) : (s.lunchBreakEnabled ? 1 : 0);
      const lunchStartVal = s.lunchStartTime || s.lunchStart || '12:00';
      const lunchEndVal = s.lunchEndTime || s.lunchEnd || '13:00';
      const payMethodsStr = typeof s.paymentMethods === 'object' ? JSON.stringify(s.paymentMethods) : (s.paymentMethods || null);
      const adminLoginStr = typeof s.adminLogin === 'object' ? JSON.stringify(s.adminLogin) : (s.adminLogin || null);
      const vacationPeriodsStr = Array.isArray(s.vacationPeriods) ? JSON.stringify(s.vacationPeriods) : (s.vacationPeriods || '[]');

      await execute(`
        INSERT INTO settings (
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
          updated_at = CURRENT_TIMESTAMP
      `, [
        s.studioName || 'Studio Bela Unha',
        s.manicureName || 'Bela Souza',
        s.logoUrl || 'assets/manicure.jpg',
        s.whatsappNumber || '',
        instagramVal,
        s.address || '',
        s.pixKey || '',
        s.pixKeyType || 'Celular',
        s.serviceLocationMode || 'both',
        parseFloat(s.homeServiceFee) || 0,
        s.openingTime || '09:00',
        s.closingTime || '19:00',
        parseInt(s.slotInterval) || 30,
        parseInt(s.cleaningBufferMinutes) || 0,
        lunchBreakEnabledVal,
        lunchStartVal,
        lunchEndVal,
        JSON.stringify(s.workDays || [1, 2, 3, 4, 5, 6]),
        s.showServicePhotos !== false ? 1 : 0,
        payMethodsStr,
        s.depositPolicy || 'full',
        s.depositType || 'percentage',
        parseFloat(s.depositPercentage) || 30,
        parseFloat(s.depositFixedAmount) || 20,
        parseInt(s.minNoticeHours) || 2,
        parseInt(s.maxDaysAhead) || 30,
        parseInt(s.cancellationHours) || 4,
        parseInt(s.delayToleranceMinutes) || 10,
        adminLoginStr,
        vacationPeriodsStr,
        s.reminderWhatsApp !== false ? 1 : 0,
        parseInt(s.reminderHours) || 24,
        s.customReminderMessage || ''
      ]);
      return { status: 200, data: { ok: true } };
    }
  }

  // 9. Carga / Sincronização em Massa
  if (pathname === '/api/sync' && method === 'POST') {
    const payload = body || {};
    if (payload.categories && Array.isArray(payload.categories)) {
      for (const c of payload.categories) {
        if (c.name) {
          await execute('INSERT OR REPLACE INTO categories (id, name) VALUES (?, ?)', [c.id || 'cat-' + Date.now(), c.name]);
        }
      }
    }
    if (payload.services && Array.isArray(payload.services)) {
      for (const s of payload.services) {
        await execute(`
          INSERT OR REPLACE INTO services (id, name, category, price, duration, description, image, active, featured, has_photo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          s.id,
          s.name,
          s.category || 'Mãos',
          parseFloat(s.price) || 0,
          parseInt(s.duration) || 45,
          s.description || '',
          s.image || 'assets/manicure.jpg',
          s.active !== false ? 1 : 0,
          s.featured ? 1 : 0,
          s.hasPhoto !== false ? 1 : 0
        ]);
      }
    }
    if (payload.bookings && Array.isArray(payload.bookings)) {
      for (const b of payload.bookings) {
        await execute(`
          INSERT OR REPLACE INTO bookings (
            id, client_name, client_phone, client_email, client_address,
            service_ids, service_names, date, time, duration,
            total_price, home_service_fee, amount_paid_now, remaining_amount,
            deposit_policy, service_location, payment_method, payment_status,
            status, is_block, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          b.id,
          b.clientName || '',
          b.clientPhone || '',
          b.clientEmail || '',
          b.clientAddress || '',
          JSON.stringify(b.serviceIds || []),
          b.serviceNames || '',
          b.date,
          b.time,
          parseInt(b.duration || b.durationMinutes) || 60,
          parseFloat(b.totalPrice) || 0,
          parseFloat(b.homeServiceFee) || 0,
          parseFloat(b.amountPaidNow) || 0,
          parseFloat(b.remainingAmount) || 0,
          b.depositPolicy || 'full',
          b.serviceLocation || 'studio',
          b.paymentMethod || 'PIX',
          b.paymentStatus || 'PENDENTE',
          b.status || 'CONFIRMADO',
          b.isBlock ? 1 : 0,
          b.notes || ''
        ]);
      }
    }
    if (payload.clients && Array.isArray(payload.clients)) {
      for (const c of payload.clients) {
        await execute(`
          INSERT OR REPLACE INTO clients (id, name, phone, email, birthdate, address, notes, block_local_payment)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          c.id,
          c.name,
          c.phone,
          c.email || '',
          c.birthdate || '',
          c.address || '',
          c.notes || '',
          c.blockLocalPayment ? 1 : 0
        ]);
      }
    }
    return { status: 200, data: { ok: true, synced: true } };
  }

  return { status: 404, data: { error: 'API route not found' } };
}

/**
 * Adaptador para servidor Node.js HTTP nativo (server.js)
 */
async function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  try {
    let body = {};
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      body = await parseBody(req);
    }

    const response = await handleApiCore({
      method,
      pathname,
      query: Object.fromEntries(url.searchParams),
      body
    });

    return sendJson(res, response.status, response.data);
  } catch (err) {
    console.error('API Error:', err);
    return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
}

module.exports = {
  handleApiCore,
  handleApiRequest,
  getAllData
};
