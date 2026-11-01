/**
 * Agende-me — Data Store & LocalStorage Manager
 * Gerencia persistência de serviços, agendamentos, clientes e configurações.
 */

const STORAGE_KEYS = {
  SERVICES: 'agendeme_services_v1',
  BOOKINGS: 'agendeme_bookings_v1',
  SETTINGS: 'agendeme_settings_v1',
  CLIENTS: 'agendeme_clients_v1',
  CATEGORIES: 'agendeme_categories_v1'
};

// Categorias padrão iniciais do sistema
const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Mãos' },
  { id: 'cat-2', name: 'Pés' },
  { id: 'cat-3', name: 'Combos' },
  { id: 'cat-4', name: 'Gel e Alongamento' },
  { id: 'cat-5', name: 'Spa e Cuidados' }
];

// Dados padrão iniciais de Serviços
const DEFAULT_SERVICES = [
  {
    id: 'srv-1',
    name: 'Manicure Tradicional',
    category: 'Mãos',
    price: 38.00,
    duration: 45,
    description: 'Cutilagem detalhada, alinhamento de unhas, hidratação de cutículas e esmaltação com acabamento espelhado.',
    image: 'assets/manicure.jpg',
    active: true,
    featured: true
  },
  {
    id: 'srv-2',
    name: 'Pedicure Completa e Relaxante',
    category: 'Pés',
    price: 45.00,
    duration: 50,
    description: 'Higienização, esfoliação suave com grânulos naturais, lixamento plantar, cutilagem delicada e esmaltação.',
    image: 'assets/pedicure.jpg',
    active: true,
    featured: true
  },
  {
    id: 'srv-3',
    name: 'Combo Mão e Pé Perfeito',
    category: 'Combos',
    price: 75.00,
    duration: 80,
    description: 'Nosso serviço mais solicitado: Manicure e Pedicure completas com massagem relaxante e esmaltação premium.',
    image: 'assets/manicure.jpg',
    active: true,
    featured: true
  },
  {
    id: 'srv-4',
    name: 'Esmaltação em Gel UV/LED',
    category: 'Gel e Alongamento',
    price: 70.00,
    duration: 60,
    description: 'Secagem instantânea na cabine UV, brilho ultra duradouro e resistência por até 21 dias sem lascar.',
    image: 'assets/manicure.jpg',
    active: true,
    featured: true
  },
  {
    id: 'srv-5',
    name: 'Alongamento em Fibra de Vidro',
    category: 'Gel e Alongamento',
    price: 160.00,
    duration: 120,
    description: 'Alongamento resistente, curvatura C natural, estrutura leve e acabamento ultra fino impecável.',
    image: 'assets/nailart.jpg',
    active: true,
    featured: true
  },
  {
    id: 'srv-6',
    name: 'Spa dos Pés com Parafina Morna',
    category: 'Spa e Cuidados',
    price: 65.00,
    duration: 60,
    description: 'Tratamento intensivo de restauração com esfoliação com sais, imersão em parafina aromática e massagem reflexológica.',
    image: 'assets/pedicure.jpg',
    active: true,
    featured: false
  },
  {
    id: 'srv-7',
    name: 'Nail Art e Francesinha Decorada',
    category: 'Gel e Alongamento',
    price: 35.00,
    duration: 30,
    description: 'Design artístico personalizado: francesinha reversa, encapsuladas, folha de ouro ou pedrarias delicadas.',
    image: 'assets/nailart.jpg',
    active: true,
    featured: false
  },
  {
    id: 'srv-8',
    name: 'Manutenção de Fibra / Gel',
    category: 'Gel e Alongamento',
    price: 110.00,
    duration: 90,
    description: 'Higienização, reposição da estrutura de crescimento, nivelamento e nova esmaltação completa.',
    image: 'assets/nailart.jpg',
    active: true,
    featured: false
  }
];

// Dados padrão de Configurações
const DEFAULT_SETTINGS = {
  studioName: 'Studio Bela Unha',
  manicureName: 'Bela Souza',
  logoUrl: 'assets/manicure.jpg',
  instagramHandle: '@studiobelaunha',
  whatsappNumber: '5511987654321',
  pixKey: '11987654321',
  pixKeyType: 'Celular',
  address: 'Rua das Flores, 420 - Sala 3 - Jardins, São Paulo - SP',
  serviceLocationMode: 'both', // 'studio' (Apenas no Studio), 'home' (Apenas em Domicílio), 'both' (No Studio e Domicílio)
  homeServiceFee: 0, // Taxa adicional de deslocamento (R$)
  adminLogin: {
    email: 'manicure@studio.com',
    password: '123456',
    isCustom: false
  },
  openingTime: '09:00',
  closingTime: '19:00',
  slotInterval: 30, // minutos
  cleaningBufferMinutes: 10, // Intervalo entre clientes para higienização
  workDays: [1, 2, 3, 4, 5, 6], // Segunda a Sábado (0=Dom, 1=Seg...)
  hasLunchBreak: true,
  lunchStartTime: '12:00',
  lunchEndTime: '13:00',
  showServicePhotos: true, // Switcher global: Exibir card com foto ou não
  paymentMethods: {
    pix: true,
    creditCard: true,
    debitCard: true,
    local: true
  },
  depositPolicy: 'full', // 'full' (100%), 'deposit' (sinal anti-falta), 'local' (presencial)
  depositType: 'percentage', // 'percentage' ou 'fixed'
  depositPercentage: 30,
  depositFixedAmount: 20,
  minNoticeHours: 2,
  maxDaysAhead: 30,
  cancellationHours: 4,
  delayToleranceMinutes: 10,
  vacationPeriods: [] // [{ id, start, end, reason }]
};

// Gerador de Agendamentos iniciais para o mês atual
function generateInitialBookings() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();

  function pad(n) { return n < 10 ? '0' + n : n; }
  function formatDate(d) {
    return `${year}-${pad(month + 1)}-${pad(d)}`;
  }

  return [
    {
      id: 'AG-7102',
      clientName: 'Camila Fernandes',
      clientPhone: '(11) 98112-3344',
      clientEmail: 'camila.f@email.com',
      serviceIds: ['srv-3'],
      serviceNames: 'Combo Mão e Pé Perfeito',
      date: formatDate(todayDate),
      time: '10:00',
      duration: 80,
      totalPrice: 75.00,
      serviceLocation: 'studio',
      clientAddress: '',
      paymentMethod: 'PIX',
      paymentStatus: 'PAGO',
      status: 'CONFIRMADO',
      notes: 'Gosta de tons nude e esmalte fosco'
    },
    {
      id: 'AG-7103',
      clientName: 'Beatriz Lima',
      clientPhone: '(11) 97455-8899',
      clientEmail: 'beatriz.lima@email.com',
      serviceIds: ['srv-4', 'srv-7'],
      serviceNames: 'Esmaltação em Gel + Nail Art',
      date: formatDate(todayDate),
      time: '14:30',
      duration: 90,
      totalPrice: 105.00,
      serviceLocation: 'home',
      clientAddress: 'Alameda Santos, 1200, Apto 41 - Cerqueira César, São Paulo',
      paymentMethod: 'CARTAO',
      paymentStatus: 'PAGO',
      status: 'CONFIRMADO',
      notes: 'Atendimento a domicílio • Francesinha com detalhe dourado'
    },
    {
      id: 'AG-7104',
      clientName: 'Mariana Duarte',
      clientPhone: '(11) 99233-1122',
      clientEmail: 'mariana.d@email.com',
      serviceIds: ['srv-5'],
      serviceNames: 'Alongamento em Fibra de Vidro',
      date: formatDate(Math.min(todayDate + 1, 28)),
      time: '09:30',
      duration: 120,
      totalPrice: 160.00,
      paymentMethod: 'PIX',
      paymentStatus: 'PAGO',
      status: 'CONFIRMADO',
      notes: 'Primeira vez no alongamento'
    },
    {
      id: 'AG-7105',
      clientName: 'Larissa Rocha',
      clientPhone: '(11) 98844-5566',
      clientEmail: 'larissa.r@email.com',
      serviceIds: ['srv-6'],
      serviceNames: 'Spa dos Pés com Parafina Morna',
      date: formatDate(Math.min(todayDate + 2, 28)),
      time: '16:00',
      duration: 60,
      totalPrice: 65.00,
      paymentMethod: 'PIX',
      paymentStatus: 'PAGO',
      status: 'CONFIRMADO',
      notes: 'Pés cansados pós-viagem'
    },
    {
      id: 'AG-7101',
      clientName: 'Juliana Costa',
      clientPhone: '(11) 97722-4411',
      clientEmail: 'juliana.c@email.com',
      serviceIds: ['srv-1'],
      serviceNames: 'Manicure Tradicional',
      date: formatDate(Math.max(todayDate - 2, 1)),
      time: '11:00',
      duration: 45,
      totalPrice: 38.00,
      paymentMethod: 'PIX',
      paymentStatus: 'PAGO',
      status: 'CONCLUIDO',
      notes: 'Cliente semanal'
    }
  ];
}

// Dados padrão iniciais de Clientes
const DEFAULT_CLIENTS = [
  {
    id: 'cli-1',
    name: 'Camila Fernandes',
    phone: '(11) 98112-3344',
    email: 'camila.f@email.com',
    birthdate: '14/05',
    notes: 'Gosta de tons nude, esmalte fosco e cutícula bem funda.',
    createdAt: '2026-09-10'
  },
  {
    id: 'cli-2',
    name: 'Beatriz Lima',
    phone: '(11) 97455-8899',
    email: 'beatriz.lima@email.com',
    birthdate: '22/08',
    notes: 'Prefere francesinha clássica ou encapsulada com folha de ouro.',
    createdAt: '2026-09-15'
  },
  {
    id: 'cli-3',
    name: 'Mariana Duarte',
    phone: '(11) 99233-1122',
    email: 'mariana.d@email.com',
    birthdate: '03/11',
    notes: 'Alongamento em fibra de vidro formato amendoado.',
    createdAt: '2026-09-20'
  },
  {
    id: 'cli-4',
    name: 'Larissa Rocha',
    phone: '(11) 98844-5566',
    email: 'larissa.r@email.com',
    birthdate: '19/02',
    notes: 'Adora massagem no spa dos pés. Pele sensível.',
    createdAt: '2026-10-01'
  },
  {
    id: 'cli-5',
    name: 'Juliana Costa',
    phone: '(11) 97722-4411',
    email: 'juliana.c@email.com',
    birthdate: '30/07',
    notes: 'Cliente semanal de manicure tradicional. Cores vibrantes (vermelho/vinho).',
    createdAt: '2026-10-05'
  }
];

// Limpeza automática para testes do zero: apaga todo o localStorage mantendo apenas serviços
(function cleanStorageKeepOnlyServices() {
  const CLEAN_FLAG = 'maoepe_fresh_test_v1';
  if (!localStorage.getItem(CLEAN_FLAG)) {
    let currentServices = null;
    try {
      const savedServices = localStorage.getItem(STORAGE_KEYS.SERVICES);
      if (savedServices) {
        currentServices = JSON.parse(savedServices);
      }
    } catch (e) {}

    const servicesToKeep = (currentServices && Array.isArray(currentServices) && currentServices.length > 0)
      ? currentServices
      : DEFAULT_SERVICES;

    // Limpa completamente o localStorage e sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Mantém estritamente os serviços, configurações padrão e zera agendamentos e clientes
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(servicesToKeep));
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(CLEAN_FLAG, 'true');
  }
})();

// Função utilitária disponível globalmente para resetar a qualquer momento
window.resetToServicesOnly = function() {
  const currentServices = window.dataManager ? window.dataManager.getServices() : DEFAULT_SERVICES;
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(currentServices));
  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  localStorage.setItem('maoepe_fresh_test_v1', 'true');
  window.location.reload();
};

// Classe DataManager
class DataManager {
  constructor() {
    this.services = this.load(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES);
    this.bookings = this.load(STORAGE_KEYS.BOOKINGS, []);
    this.clients = this.load(STORAGE_KEYS.CLIENTS, []);
    this.settings = Object.assign({}, DEFAULT_SETTINGS, this.load(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS));
    this.categories = this.load(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    this.listeners = [];
    this.sqliteConnected = false;

    // Sincronização automática com o banco SQLite em segundo plano
    this.initSqliteSync();
  }

  async initSqliteSync() {
    try {
      const res = await fetch('/api/all');
      if (!res.ok) return;
      const data = await res.json();

      let hasChanges = false;

      if (data.categories && data.categories.length) {
        this.categories = data.categories;
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
        hasChanges = true;
      }
      if (data.services && data.services.length) {
        this.services = data.services;
        localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(this.services));
        hasChanges = true;
      }
      if (data.bookings) {
        if (data.bookings.length > 0) {
          this.bookings = data.bookings;
          localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(this.bookings));
          hasChanges = true;
        } else if (this.bookings.length > 0) {
          this.syncLocalToSqlite();
        }
      }
      if (data.clients && data.clients.length) {
        this.clients = data.clients;
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(this.clients));
        hasChanges = true;
      }
      if (data.settings) {
        this.settings = Object.assign({}, this.settings, data.settings);
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
        hasChanges = true;
      }

      this.sqliteConnected = true;
      console.log('🟢 Cronus: Banco de dados SQLite conectado e sincronizado com sucesso.');

      if (hasChanges) {
        this.notifyListeners();
      }
    } catch (e) {
      console.warn('Cronus: Operando com cache local:', e.message);
    }
  }

  async syncLocalToSqlite() {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: this.categories,
          services: this.services,
          bookings: this.bookings,
          clients: this.clients
        })
      });
    } catch (e) {
      console.warn('Erro ao sincronizar dados locais com SQLite:', e);
    }
  }

  async apiSend(url, method = 'POST', bodyData = null) {
    try {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (bodyData) opts.body = JSON.stringify(bodyData);
      fetch(url, opts).catch(err => console.warn(`Aviso ao gravar no SQLite (${url}):`, err.message));
    } catch (e) {
      console.warn(`Erro de rede SQLite (${url}):`, e.message);
    }
  }

  load(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn('Erro ao carregar do localStorage', e);
      return fallback;
    }
  }

  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      this.notifyListeners();
    } catch (e) {
      console.error('Erro ao salvar no localStorage', e);
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => {
      try { cb(); } catch (e) { console.error(e); }
    });
  }

  // --- Operações de Serviços ---
  getServices() {
    return this.services;
  }

  getActiveServices() {
    return this.services.filter(s => s.active);
  }

  getServiceById(id) {
    return this.services.find(s => s.id === id);
  }

  addService(serviceData) {
    const newService = {
      id: 'srv-' + Date.now(),
      name: serviceData.name,
      category: serviceData.category || 'Mãos',
      price: parseFloat(serviceData.price) || 0,
      duration: parseInt(serviceData.duration) || 45,
      description: serviceData.description || '',
      image: serviceData.image || 'assets/manicure.jpg',
      active: serviceData.active !== undefined ? serviceData.active : true,
      featured: !!serviceData.featured
    };
    this.services.unshift(newService);
    this.save(STORAGE_KEYS.SERVICES, this.services);
    this.apiSend('/api/services', 'POST', newService);
    return newService;
  }

  updateService(id, updatedFields) {
    const index = this.services.findIndex(s => s.id === id);
    if (index !== -1) {
      this.services[index] = { ...this.services[index], ...updatedFields };
      this.save(STORAGE_KEYS.SERVICES, this.services);
      this.apiSend('/api/services', 'POST', this.services[index]);
      return this.services[index];
    }
    return null;
  }

  deleteService(id) {
    this.services = this.services.filter(s => s.id !== id);
    this.save(STORAGE_KEYS.SERVICES, this.services);
    this.apiSend(`/api/services/${id}`, 'DELETE');
  }

  toggleServiceStatus(id) {
    const s = this.getServiceById(id);
    if (s) {
      s.active = !s.active;
      this.save(STORAGE_KEYS.SERVICES, this.services);
    }
  }

  // --- Operações de Categorias (CRUD Dinâmico) ---
  getCategories() {
    if (!this.categories || !this.categories.length) {
      this.categories = [...DEFAULT_CATEGORIES];
      this.save(STORAGE_KEYS.CATEGORIES, this.categories);
    }
    return this.categories;
  }

  addCategory(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('O nome da categoria não pode estar em branco.');
    }
    const exists = this.getCategories().some(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      throw new Error(`A categoria "${trimmed}" já está cadastrada.`);
    }
    const newCategory = {
      id: 'cat-' + Date.now(),
      name: trimmed
    };
    this.categories.push(newCategory);
    this.save(STORAGE_KEYS.CATEGORIES, this.categories);
    this.apiSend('/api/categories', 'POST', newCategory);
    return newCategory;
  }

  updateCategory(id, newName) {
    const trimmed = (newName || '').trim();
    if (!trimmed) {
      throw new Error('O nome da categoria não pode estar em branco.');
    }
    const cat = this.getCategories().find(c => c.id === id);
    if (!cat) {
      throw new Error('Categoria não encontrada.');
    }
    const exists = this.getCategories().some(c => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      throw new Error(`Já existe outra categoria chamada "${trimmed}".`);
    }
    const oldName = cat.name;
    cat.name = trimmed;
    this.save(STORAGE_KEYS.CATEGORIES, this.categories);

    // Atualização em cascata: atualiza a categoria em todos os serviços cadastrados
    let servicesChanged = false;
    this.services.forEach(s => {
      if ((s.category || '').toLowerCase() === oldName.toLowerCase()) {
        s.category = trimmed;
        servicesChanged = true;
      }
    });
    if (servicesChanged) {
      this.save(STORAGE_KEYS.SERVICES, this.services);
    }

    return cat;
  }

  deleteCategory(id) {
    const cat = this.getCategories().find(c => c.id === id);
    if (!cat) return;
    if (this.categories.length <= 1) {
      throw new Error('Você deve manter pelo menos uma categoria cadastrada no sistema.');
    }

    const servicesUsingCategory = this.services.filter(s => (s.category || '').toLowerCase() === cat.name.toLowerCase());

    this.categories = this.categories.filter(c => c.id !== id);
    this.save(STORAGE_KEYS.CATEGORIES, this.categories);
    this.apiSend(`/api/categories/${id}`, 'DELETE');

    // Se houver serviços nesta categoria removida, reatribui para a primeira categoria restante
    if (servicesUsingCategory.length > 0) {
      const fallbackName = this.categories[0].name;
      this.services.forEach(s => {
        if ((s.category || '').toLowerCase() === cat.name.toLowerCase()) {
          s.category = fallbackName;
        }
      });
      this.save(STORAGE_KEYS.SERVICES, this.services);
    }
  }

  getServicesCountByCategory(categoryName) {
    if (!categoryName) return 0;
    return this.services.filter(s => (s.category || '').toLowerCase() === categoryName.toLowerCase()).length;
  }

  // --- Operações de Agendamentos ---
  getBookings() {
    return this.bookings;
  }

  getBookingsByDate(dateStr) {
    return this.bookings.filter(b => b.date === dateStr && b.status !== 'CANCELADO');
  }

  addBooking(bookingData) {
    const newBooking = {
      id: 'AG-' + Math.floor(1000 + Math.random() * 9000),
      clientName: bookingData.clientName,
      clientPhone: bookingData.clientPhone,
      clientEmail: bookingData.clientEmail || '',
      serviceIds: bookingData.serviceIds || [],
      serviceNames: bookingData.serviceNames || '',
      date: bookingData.date,
      time: bookingData.time,
      duration: bookingData.duration || 60,
      totalPrice: parseFloat(bookingData.totalPrice) || 0,
      homeServiceFee: parseFloat(bookingData.homeServiceFee) || 0,
      amountPaidNow: parseFloat(bookingData.amountPaidNow) || 0,
      remainingAmount: parseFloat(bookingData.remainingAmount) || 0,
      depositPolicy: bookingData.depositPolicy || 'full',
      serviceLocation: bookingData.serviceLocation || 'studio',
      clientAddress: bookingData.clientAddress || '',
      paymentMethod: bookingData.paymentMethod || 'PIX',
      paymentStatus: bookingData.paymentStatus || 'PAGO',
      status: bookingData.status || 'CONFIRMADO',
      notes: bookingData.notes || '',
      createdAt: new Date().toISOString()
    };
    this.bookings.push(newBooking);
    this.save(STORAGE_KEYS.BOOKINGS, this.bookings);
    this.apiSend('/api/bookings', 'POST', newBooking);

    // Auto cadastrar cliente na carteira se ainda não existir (não cadastra se for bloqueio de agenda)
    if (!bookingData.isBlock && bookingData.status !== 'BLOQUEADO' && bookingData.clientName && bookingData.clientPhone) {
      const cleanPhone = bookingData.clientPhone.replace(/\D/g, '');
      const cleanName = bookingData.clientName.trim().toLowerCase();
      const existing = this.clients.find(c => 
        (cleanPhone && c.phone && c.phone.replace(/\D/g, '') === cleanPhone) ||
        (cleanName && c.name && c.name.trim().toLowerCase() === cleanName)
      );
      if (!existing) {
        this.addClient({
          name: bookingData.clientName,
          phone: bookingData.clientPhone,
          email: bookingData.clientEmail || '',
          address: bookingData.clientAddress || '',
          notes: bookingData.notes || 'Cliente cadastrada via agendamento online'
        });
      } else {
        let changed = false;
        if (bookingData.clientAddress && existing.address !== bookingData.clientAddress) {
          existing.address = bookingData.clientAddress;
          changed = true;
        }
        if (bookingData.clientEmail && existing.email !== bookingData.clientEmail) {
          existing.email = bookingData.clientEmail;
          changed = true;
        }
        if (bookingData.clientName && existing.name !== bookingData.clientName) {
          existing.name = bookingData.clientName;
          changed = true;
        }
        if (changed) {
          this.save(STORAGE_KEYS.CLIENTS, this.clients);
        }
      }
    }

    return newBooking;
  }

  // Adicionar Bloqueio de Horário ou Dia na Agenda
  addBlockedSlot(blockData) {
    const isAllDay = !!blockData.allDay;
    const settings = this.getSettings();
    const [openH, openM] = (settings.openingTime || '09:00').split(':').map(Number);
    const [closeH, closeM] = (settings.closingTime || '19:00').split(':').map(Number);
    const allDayDuration = (closeH * 60 + closeM) - (openH * 60 + openM);

    const newBlock = {
      id: 'BLK-' + Math.floor(1000 + Math.random() * 9000),
      isBlock: true,
      clientName: blockData.reason ? `${blockData.reason}` : 'Horário Bloqueado',
      clientPhone: '—',
      clientEmail: '',
      serviceIds: [],
      serviceNames: blockData.reason || 'Bloqueio de Agenda / Intervalo',
      date: blockData.date,
      time: isAllDay ? (settings.openingTime || '09:00') : blockData.startTime,
      duration: isAllDay ? allDayDuration : (parseInt(blockData.duration) || 60),
      totalPrice: 0,
      paymentMethod: 'OUTRO',
      paymentStatus: 'CONCLUIDO',
      status: 'BLOQUEADO',
      notes: blockData.notes || '',
      allDay: isAllDay,
      createdAt: new Date().toISOString()
    };

    this.bookings.push(newBlock);
    this.save(STORAGE_KEYS.BOOKINGS, this.bookings);
    this.apiSend('/api/bookings', 'POST', newBlock);
    return newBlock;
  }

  deleteBooking(id) {
    this.bookings = this.bookings.filter(b => b.id !== id);
    this.save(STORAGE_KEYS.BOOKINGS, this.bookings);
    this.apiSend(`/api/bookings/${id}`, 'DELETE');
  }

  isDateInVacation(dateStr) {
    const list = this.settings.vacationPeriods || [];
    return list.some(v => dateStr >= v.start && dateStr <= v.end);
  }

  isDateFullyBlocked(dateStr) {
    if (this.isDateInVacation(dateStr)) return true;
    return this.bookings.some(b => b.date === dateStr && (b.status === 'BLOQUEADO' || b.isBlock) && b.allDay);
  }

  addVacationPeriod(periodData) {
    if (!this.settings.vacationPeriods) this.settings.vacationPeriods = [];
    const newPeriod = {
      id: 'VAC-' + Date.now(),
      start: periodData.start,
      end: periodData.end,
      reason: periodData.reason || 'Férias / Recesso'
    };
    this.settings.vacationPeriods.push(newPeriod);
    this.save(STORAGE_KEYS.SETTINGS, this.settings);
    this.apiSend('/api/settings', 'POST', this.settings);
    return newPeriod;
  }

  removeVacationPeriod(id) {
    if (!this.settings.vacationPeriods) return;
    this.settings.vacationPeriods = this.settings.vacationPeriods.filter(v => v.id !== id);
    this.save(STORAGE_KEYS.SETTINGS, this.settings);
    this.apiSend('/api/settings', 'POST', this.settings);
  }

  unblockDate(dateStr) {
    const blocksToRemove = this.bookings.filter(b => b.date === dateStr && (b.status === 'BLOQUEADO' || b.isBlock));
    this.bookings = this.bookings.filter(b => !(b.date === dateStr && (b.status === 'BLOQUEADO' || b.isBlock)));
    this.save(STORAGE_KEYS.BOOKINGS, this.bookings);
    blocksToRemove.forEach(b => this.apiSend(`/api/bookings/${b.id}`, 'DELETE'));
  }

  updateBookingStatus(id, newStatus) {
    const booking = this.bookings.find(b => b.id === id);
    if (booking) {
      booking.status = newStatus;
      this.save(STORAGE_KEYS.BOOKINGS, this.bookings);
      this.apiSend('/api/bookings', 'POST', booking);
    }
  }

  updateBooking(id, updatedFields) {
    const booking = this.bookings.find(b => b.id === id);
    if (booking) {
      Object.assign(booking, updatedFields);
      this.save(STORAGE_KEYS.BOOKINGS, this.bookings);
      this.apiSend('/api/bookings', 'POST', booking);
      return booking;
    }
    return null;
  }

  // --- Operações de Clientes (CRUD) ---
  getClients() {
    return this.clients;
  }

  getClientById(id) {
    return this.clients.find(c => c.id === id);
  }

  addClient(clientData) {
    const newClient = {
      id: 'cli-' + Date.now(),
      name: clientData.name.trim(),
      phone: clientData.phone.trim(),
      email: clientData.email ? clientData.email.trim() : '',
      birthdate: clientData.birthdate ? clientData.birthdate.trim() : '',
      address: clientData.address ? clientData.address.trim() : '',
      notes: clientData.notes ? clientData.notes.trim() : '',
      blockLocalPayment: !!clientData.blockLocalPayment,
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.clients.unshift(newClient);
    this.save(STORAGE_KEYS.CLIENTS, this.clients);
    this.apiSend('/api/clients', 'POST', newClient);
    return newClient;
  }

  updateClient(id, updatedFields) {
    const index = this.clients.findIndex(c => c.id === id);
    if (index !== -1) {
      this.clients[index] = { ...this.clients[index], ...updatedFields };
      this.save(STORAGE_KEYS.CLIENTS, this.clients);
      this.apiSend('/api/clients', 'POST', this.clients[index]);
      return this.clients[index];
    }
    return null;
  }

  deleteClient(id) {
    this.clients = this.clients.filter(c => c.id !== id);
    this.save(STORAGE_KEYS.CLIENTS, this.clients);
    this.apiSend(`/api/clients/${id}`, 'DELETE');
  }

  getClientStats(client) {
    let visits = 0;
    let spent = 0;
    let lastDate = '';

    const clientPhoneDigits = (client.phone || '').replace(/\D/g, '');
    const clientNameLower = (client.name || '').trim().toLowerCase();

    this.bookings.forEach(b => {
      const bPhoneDigits = (b.clientPhone || '').replace(/\D/g, '');
      const bNameLower = (b.clientName || '').trim().toLowerCase();

      const isMatch = (clientPhoneDigits && bPhoneDigits && clientPhoneDigits === bPhoneDigits) ||
                      (clientNameLower && bNameLower && clientNameLower === bNameLower);

      if (isMatch && b.status !== 'CANCELADO') {
        visits++;
        spent += (b.totalPrice || 0);
        if (!lastDate || b.date > lastDate) {
          lastDate = b.date;
        }
      }
    });

    return {
      totalVisits: visits,
      totalSpent: spent,
      lastDate: lastDate || client.createdAt || ''
    };
  }

  // --- Operações de Configurações ---
  getSettings() {
    return this.settings;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.save(STORAGE_KEYS.SETTINGS, this.settings);
    this.apiSend('/api/settings', 'POST', this.settings);
  }

  getShowServicePhotos() {
    return this.settings.showServicePhotos !== false;
  }

  setShowServicePhotos(show) {
    this.updateSettings({ showServicePhotos: !!show });
  }

  // Estatísticas Financeiras Dinâmicas por Mês ou Consolidado
  getFinancialStats(targetYear = null, targetMonth = null) {
    const now = new Date();
    const selYear = targetYear !== null ? targetYear : now.getFullYear();
    const selMonth = targetMonth !== null ? targetMonth : (now.getMonth() + 1);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let revenueMonth = 0;
    let revenueToday = 0;
    let totalAppointments = 0;
    let pixCount = 0;
    let cardCount = 0;
    let localCount = 0;

    this.bookings.forEach(b => {
      if (b.status !== 'CANCELADO' && !b.isBlock) {
        const [bYear, bMonth] = (b.date || '').split('-').map(Number);
        const matchesPeriod = (targetMonth === 'all') 
          ? true 
          : (bYear === selYear && bMonth === selMonth);

        if (matchesPeriod) {
          revenueMonth += (b.totalPrice || 0);
          totalAppointments++;
          if (b.paymentMethod === 'PIX') pixCount++;
          else if (b.paymentMethod && b.paymentMethod.includes('CARTAO')) cardCount++;
          else localCount++;
        }

        if (b.date === todayStr) {
          revenueToday += (b.totalPrice || 0);
        }
      }
    });

    return {
      revenueMonth,
      revenueToday,
      totalAppointments,
      pixCount,
      cardCount,
      localCount,
      averageTicket: totalAppointments > 0 ? (revenueMonth / totalAppointments) : 0,
      selectedYear: selYear,
      selectedMonth: selMonth
    };
  }
}

// Instância global disponível
window.dataManager = new DataManager();
