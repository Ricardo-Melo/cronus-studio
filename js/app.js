/**
 * Agende-me — Main Application Controller
 * Coordena troca de visões (Admin / Cliente), navegação da sidebar, notificações e modais.
 */

class AppController {
  constructor() {
    this.currentView = 'admin'; // 'admin' ou 'client'
    this.currentAdminTab = 'agenda'; // 'agenda', 'services', 'clients', 'financial', 'settings'
    this.whatsappConnected = true;
    this.notifications = [
      {
        id: 1,
        type: 'booking',
        title: 'Novo agendamento: Camila Fernandes',
        clientName: 'Camila Fernandes',
        text: 'Alongamento em Gel • Hoje às 14:00',
        meta: 'R$ 75,00 (Pix)',
        time: '10 min atrás',
        bookingDate: new Date().toISOString().split('T')[0],
        read: false
      },
      {
        id: 2,
        type: 'system',
        title: 'WhatsApp Conectado',
        clientName: '',
        text: 'Lembretes automáticos ativados com sucesso',
        meta: 'Sistema',
        time: '1h atrás',
        read: true
      }
    ];
  }

  init() {
    // Inicializar autenticação da manicure
    if (window.authManager) {
      window.authManager.init();
    }

    // Inicializar gerenciador de alerta sonoro
    if (window.soundAlertManager) {
      window.soundAlertManager.init();
    }

    // Inicializar componentes filhos
    window.calendarEngine.goToToday();
    window.adminManager.init();
    window.bookingFlow.init();

    this.setupViewSwitchers();
    this.setupSidebarNavigation();
    this.setupNotificationsDropdown();
    this.updateNotificationBadge();
    this.updateWhatsappUI();
    this.updateSidebarBranding();

    // Determinar visão inicial com base em URL e estado de autenticação
    const isClientHash = window.location.hash === '#agendar' || window.location.hash === '#cliente';
    if (isClientHash) {
      this.switchView('client');
    } else if (window.authManager && window.authManager.isAuthenticated()) {
      this.switchView('admin');
    } else {
      this.switchView('login');
    }

    // Ouvir mudanças nos dados para sincronização instantânea
    window.dataManager.subscribe(() => {
      window.calendarEngine.renderMainCalendar('.calendar-grid-body', '.month-display-title');
      window.calendarEngine.renderMiniCalendar('.mini-cal-days', '.mini-cal-title');
      window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
      window.adminManager.renderFinancialDashboard();
      window.adminManager.renderClientsList();
      this.updateNotificationBadge();
      this.updateSidebarBranding();
    });
  }

  updateSidebarBranding() {
    const s = window.dataManager.getSettings();
    if (!s) return;

    const titleEl = document.getElementById('sidebarBrandTitle');
    const subtitleEl = document.getElementById('sidebarBrandSubtitle');
    const iconEl = document.getElementById('sidebarBrandIcon');

    if (titleEl) {
      titleEl.textContent = s.studioName || 'Cronus';
    }
    if (subtitleEl) {
      subtitleEl.textContent = s.manicureName ? `Studio • ${s.manicureName}` : 'Studio Nails e Care';
    }
    if (iconEl && s.logoUrl) {
      iconEl.innerHTML = `<img src="${s.logoUrl}" alt="${s.studioName || 'Logo'}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`;
    }
  }

  // --- Troca de Visão: Painel da Manicure vs Portal do Cliente vs Login ---
  switchView(viewName) {
    // Se tentar ir para 'admin' sem estar autenticado, redireciona para 'login'
    if (viewName === 'admin' && window.authManager && !window.authManager.isAuthenticated()) {
      viewName = 'login';
      this.showToast('Faça login para acessar o painel restrito da manicure.', 'brand');
    }

    this.currentView = viewName;
    const adminContainer = document.getElementById('adminLayoutView');
    const clientContainer = document.getElementById('clientBookingView');
    const loginContainer = document.getElementById('manicureLoginView');

    if (viewName === 'admin') {
      if (adminContainer) adminContainer.style.display = 'flex';
      if (clientContainer) clientContainer.style.display = 'none';
      if (loginContainer) loginContainer.style.display = 'none';
      window.calendarEngine.renderMainCalendar('.calendar-grid-body', '.month-display-title');
      window.calendarEngine.renderMiniCalendar('.mini-cal-days', '.mini-cal-title');
      window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
    } else if (viewName === 'client') {
      if (adminContainer) adminContainer.style.display = 'none';
      if (clientContainer) clientContainer.style.display = 'flex';
      if (loginContainer) loginContainer.style.display = 'none';
      window.bookingFlow.resetBooking();
    } else if (viewName === 'login') {
      if (adminContainer) adminContainer.style.display = 'none';
      if (clientContainer) clientContainer.style.display = 'none';
      if (loginContainer) loginContainer.style.display = 'flex';
    }
  }

  setupViewSwitchers() {
    const btnToClient = document.getElementById('btnSwitchToClient');
    if (btnToClient) {
      btnToClient.addEventListener('click', () => this.switchView('client'));
    }

    const btnBackToAdmin = document.getElementById('btnBackToAdmin');
    if (btnBackToAdmin) {
      btnBackToAdmin.addEventListener('click', () => {
        if (window.authManager && window.authManager.isAuthenticated()) {
          this.switchView('admin');
        } else {
          this.switchView('login');
        }
      });
    }

    const btnShareAgenda = document.getElementById('btnShareAgenda');
    if (btnShareAgenda) {
      btnShareAgenda.addEventListener('click', () => this.shareBookingLink());
    }

    const btnDivulgar = document.getElementById('btnDivulgar');
    if (btnDivulgar) {
      btnDivulgar.addEventListener('click', () => this.shareBookingLink());
    }
  }

  // --- Navegação da Sidebar ---
  setupSidebarNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.dataset.tab;
        if (!targetTab) return;

        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        this.showAdminTab(targetTab);
      });
    });

    // Toggle Sidebar Mobile
    const toggleBtn = document.getElementById('mobileSidebarToggle');
    const sidebar = document.querySelector('.admin-sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  }

  showAdminTab(tabName) {
    this.currentAdminTab = tabName;
    document.querySelectorAll('.admin-content-view').forEach(view => {
      view.classList.remove('active');
    });

    const activeView = document.getElementById(`viewTab-${tabName}`);
    if (activeView) {
      activeView.classList.add('active');
    }

    if (tabName === 'agenda') {
      window.calendarEngine.renderMainCalendar('.calendar-grid-body', '.month-display-title');
      window.calendarEngine.renderMiniCalendar('.mini-cal-days', '.mini-cal-title');
      window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
    } else if (tabName === 'services') {
      window.adminManager.renderAdminServices();
    } else if (tabName === 'financial') {
      window.adminManager.renderFinancialDashboard();
    } else if (tabName === 'clients') {
      window.adminManager.renderClientsList();
    } else if (tabName === 'settings') {
      window.adminManager.loadSettingsForm();
    }

    // Fechar sidebar mobile ao navegar
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar && window.innerWidth <= 992) {
      sidebar.classList.remove('open');
    }
  }

  // --- Sistema de Notificações (Sininho) ---
  setupNotificationsDropdown() {
    const trigger = document.getElementById('notificationTrigger');
    const dropdown = document.getElementById('notificationDropdown');
    if (trigger && dropdown) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
        this.renderNotificationsList();
      });

      // Não fechar se clicar dentro da caixa de notificações
      dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Fechar ao clicar fora
      document.addEventListener('click', () => {
        dropdown.classList.remove('open');
      });
    }
  }

  renderNotificationsList() {
    const list = document.getElementById('notificationList');
    const badgeDropdown = document.getElementById('notifDropdownBadge');
    if (!list) return;

    const unreadCount = this.notifications.filter(n => !n.read).length;
    if (badgeDropdown) {
      badgeDropdown.textContent = unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? 'nova' : 'novas'}` : 'Todas lidas';
    }

    if (this.notifications.length === 0) {
      list.innerHTML = `
        <div class="notif-empty-state">
          <div class="notif-empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>
          <strong style="color:var(--color-text-900); display:block; margin-bottom:4px;">Nenhuma notificação por aqui</strong>
          <p style="margin:0; font-size:12px; color:var(--color-text-500);">Novos agendamentos e avisos aparecerão nesta lista.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = '';
    this.notifications.forEach(n => {
      const item = document.createElement('div');
      item.className = `notif-item ${n.read ? '' : 'unread'} ${n.type === 'booking' ? 'is-booking' : ''}`;

      const icon = n.type === 'booking' 
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' 
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

      item.innerHTML = `
        <div class="notif-icon-box">${icon}</div>
        <div class="notif-content">
          <div class="notif-top-row">
            <span class="notif-title">${n.title}</span>
            <span class="notif-time">${n.time}</span>
          </div>
          <div class="notif-text">${n.text}</div>
          <div class="notif-meta-row">
            ${n.meta ? `<span class="notif-meta-pill">${n.meta}</span>` : '<span></span>'}
            ${n.bookingDate ? `<span style="color:var(--color-brand-700); font-size:11px; display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>Ver na agenda</span>` : ''}
          </div>
        </div>
      `;

      item.addEventListener('click', () => {
        n.read = true;
        this.updateNotificationBadge();
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) dropdown.classList.remove('open');

        if (n.bookingDate) {
          this.goToBookingInAgenda(n.bookingDate);
        } else if (n.bookingId) {
          this.showBookingDetails(n.bookingId);
        }
      });

      list.appendChild(item);
    });
  }

  updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const trigger = document.getElementById('notificationTrigger');
    const unreadCount = this.notifications.filter(n => !n.read).length;

    if (badge) {
      if (unreadCount > 0) {
        badge.style.display = 'flex';
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.classList.add('pulse');
      } else {
        badge.style.display = 'none';
        badge.classList.remove('pulse');
      }
    }

    if (trigger) {
      trigger.classList.toggle('has-unread', unreadCount > 0);
    }
  }

  markAllNotificationsAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.updateNotificationBadge();
    this.renderNotificationsList();
    this.showToast('Todas as notificações foram marcadas como lidas.');
  }

  // --- WhatsApp Status Toggle ---
  toggleWhatsappConnection() {
    this.whatsappConnected = !this.whatsappConnected;
    this.updateWhatsappUI();
    this.showToast(this.whatsappConnected ? 'WhatsApp reconectado com sucesso!' : 'WhatsApp desconectado.');
  }

  updateWhatsappUI() {
    const textEl = document.getElementById('sidebarWhatsappText');
    const dotEl = document.getElementById('sidebarWhatsappDot');
    if (textEl && dotEl) {
      if (this.whatsappConnected) {
        textEl.textContent = 'Conectado';
        dotEl.className = 'status-dot connected';
      } else {
        textEl.textContent = 'Desconectado';
        dotEl.className = 'status-dot disconnected';
      }
    }
  }

  // --- Compartilhar Link de Agendamento ---
  shareBookingLink() {
    const url = window.location.href.split('#')[0] + '#agendar';
    navigator.clipboard.writeText(url).then(() => {
      this.showToast('Link do agendamento copiado para a área de transferência!', 'success');
    }).catch(() => {
      this.showToast('Link: ' + url, 'brand');
    });
  }

  // --- Modal de Detalhes do Agendamento ---
  showBookingDetails(bookingId) {
    const booking = window.dataManager.getBookings().find(b => b.id === bookingId);
    if (!booking) return;

    const modal = document.getElementById('bookingDetailsModalBackdrop');
    const body = document.getElementById('bookingDetailsModalBody');
    if (!modal || !body) return;

    const [y, m, d] = booking.date.split('-');
    const formattedDate = `${d}/${m}/${y}`;
    const isPaid = booking.paymentStatus === 'PAGO' || booking.status === 'CONCLUIDO';

    let payBadge = 'Pagamento no Local';
    if (booking.paymentMethod === 'PIX') payBadge = 'Pix Online';
    else if (booking.paymentMethod === 'CARTAO_CREDITO') payBadge = 'Cartão de Crédito';
    else if (booking.paymentMethod === 'CARTAO_DEBITO') payBadge = 'Cartão de Débito';
    else if (booking.paymentMethod === 'DINHEIRO') payBadge = 'Dinheiro em Espécie';

    body.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <span style="font-size:18px; font-weight:800; color:var(--color-brand-900);">#${booking.id}</span>
        <span class="badge ${isPaid ? 'badge-success' : (booking.status === 'CANCELADO' ? 'badge-danger' : 'badge-warning')}">
          ${isPaid ? 'CONCLUÍDO' : booking.status}
        </span>
      </div>

      <div style="background-color:var(--color-surface-50); border:1px solid var(--color-border-100); border-radius:var(--radius-md); padding:16px; margin-bottom:16px;">
        <div style="font-size:12px; color:var(--color-text-500); font-weight:600;">CLIENTE</div>
        <div style="font-size:16px; font-weight:700; color:var(--color-text-900); margin-top:2px;">${booking.clientName}</div>
        <div style="font-size:13px; color:var(--color-text-700); margin-top:4px; display:flex; align-items:center; gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
          <span>${booking.clientPhone} ${booking.clientEmail ? '• ' + booking.clientEmail : ''}</span>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <div style="font-size:12px; color:var(--color-text-500); font-weight:600; margin-bottom:4px;">SERVIÇOS E HORÁRIO</div>
        <div style="font-size:15px; font-weight:700; color:var(--color-text-900);">${booking.serviceNames}</div>
        <div style="font-size:13px; color:var(--color-brand-700); font-weight:600; margin-top:4px; display:flex; align-items:center; gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>${formattedDate} às ${booking.time} (${booking.duration} min)</span>
        </div>
      </div>

      <!-- Local do Atendimento: Studio ou Domicílio -->
      <div style="background-color: ${booking.serviceLocation === 'home' ? '#f0fdf4' : '#f8fafc'}; border:1px solid ${booking.serviceLocation === 'home' ? '#86efac' : '#e2e8f0'}; border-radius:var(--radius-md); padding:12px 16px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12px; font-weight:800; color:${booking.serviceLocation === 'home' ? '#166534' : 'var(--color-brand-900)'}; display:flex; align-items:center; gap:6px;">
            ${booking.serviceLocation === 'home' 
              ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> ATENDIMENTO NA CASA DA CLIENTE (DOMICÍLIO)' 
              : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="6" x2="9" y2="6.01"></line><line x1="15" y1="6" x2="15" y2="6.01"></line><line x1="9" y1="10" x2="9" y2="10.01"></line><line x1="15" y1="10" x2="15" y2="10.01"></line><line x1="9" y1="14" x2="9" y2="14.01"></line><line x1="15" y1="14" x2="15" y2="14.01"></line><line x1="9" y1="18" x2="15" y2="18"></line></svg> ATENDIMENTO NO STUDIO'}
          </span>
          ${booking.serviceLocation === 'home' && booking.clientAddress ? `
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.clientAddress)}" target="_blank" style="font-size:11px; background:#16a34a; color:#fff; padding:3px 10px; border-radius:12px; text-decoration:none; font-weight:700;">
              Abrir GPS
            </a>
          ` : ''}
        </div>
        <div style="font-size:13px; color:${booking.serviceLocation === 'home' ? '#14532d' : 'var(--color-text-700)'}; margin-top:6px; font-weight:600; display:flex; align-items:center; gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          <span>${booking.serviceLocation === 'home' ? (booking.clientAddress || 'Endereço da cliente não informado') : (window.dataManager.getSettings().address || 'Endereço do Studio')}</span>
        </div>
      </div>

      <!-- Caixa de Pagamento e Ação de Dar Baixa -->
      <div style="background-color: ${isPaid ? '#f0fdf4' : '#fffbeb'}; border: 1.5px solid ${isPaid ? '#86efac' : '#fcd34d'}; border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12px; font-weight:800; color:${isPaid ? '#166534' : '#92400e'}; display:flex; align-items:center; gap:6px;">
            ${isPaid 
              ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> PAGAMENTO CONFIRMADO' 
              : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> PAGAMENTO PENDENTE (RECEBER NO LOCAL)'}
          </span>
          <span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}" style="font-size:11px;">
            ${isPaid ? 'PAGO' : 'A RECEBER'}
          </span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:8px;">
          <span style="font-size:13px; color:var(--color-text-700); font-weight:600;">Valor do Atendimento:</span>
          <span style="font-size:20px; font-weight:800; color:var(--color-brand-900);">R$ ${(booking.totalPrice || 0).toFixed(2)}</span>
        </div>

        ${!isPaid ? `
          <div style="margin-top:12px; padding-top:12px; border-top:1px dashed #fcd34d;">
            <div style="font-size:12px; font-weight:700; color:#78350f; margin-bottom:8px;">
              Dar baixa no pagamento da cliente:
            </div>
            <div style="display:flex; gap:8px;">
              <select id="modalMarkPaidMethod" class="form-select" style="flex:1; height:38px; font-size:13px; background:#fff; border-color:#fcd34d;">
                <option value="DINHEIRO">Dinheiro (Espécie)</option>
                <option value="PIX">Pix (Maquininha / Chave)</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
              </select>
              <button class="btn-dar-baixa-modal" onclick="window.app.markBookingAsPaid('${booking.id}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Confirmar Pagamento</span>
              </button>
            </div>
          </div>
        ` : `
          <div style="margin-top:8px; font-size:12px; color:#15803d; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
            <span>Forma: <strong>${payBadge}</strong></span>
            <button type="button" style="background:none; border:none; color:var(--color-text-500); text-decoration:underline; cursor:pointer; font-size:11px;" onclick="window.app.reopenBookingPayment('${booking.id}')">
              Reabrir cobrança
            </button>
          </div>
        `}
      </div>

      ${booking.notes ? `
        <div style="margin-bottom:16px;">
          <div style="font-size:12px; color:var(--color-text-500); font-weight:600; margin-bottom:2px;">OBSERVAÇÕES</div>
          <div style="font-size:13px; color:var(--color-text-700); background-color:var(--color-surface-50); padding:10px; border-radius:var(--radius-sm);">${booking.notes}</div>
        </div>
      ` : ''}

      <div style="display:flex; gap:10px; margin-top:24px;">
        <a class="btn-primary" style="flex:1; text-align:center; height:40px; font-size:13px; background-color:#25d366; display:inline-flex; align-items:center; justify-content:center; gap:6px; text-decoration:none;" 
           href="https://wa.me/55${booking.clientPhone.replace(/\D/g,'')}" target="_blank">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.772.82 2.79.82 3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.767-5.766zm9.969 5.766c0 5.485-4.464 9.948-9.95 9.948-1.688 0-3.273-.426-4.665-1.173l-5.385 1.411 1.439-5.253c-.848-1.455-1.339-3.14-1.339-4.933 0-5.485 4.464-9.949 9.95-9.949 5.486 0 9.95 4.464 9.95 9.949z"/></svg>
          <span>WhatsApp da Cliente</span>
        </a>
        <button class="btn-secondary" style="color:var(--color-danger-500); border-color:#f8b4b4; height:40px; font-size:13px;"
                onclick="window.app.cancelBooking('${booking.id}')">
          Cancelar Agendamento
        </button>
      </div>
    `;

    modal.classList.add('open');
  }

  markBookingAsPaid(bookingId) {
    const methodSelect = document.getElementById('modalMarkPaidMethod');
    const selectedMethod = methodSelect ? methodSelect.value : 'DINHEIRO';
    const booking = window.dataManager.getBookings().find(b => b.id === bookingId);
    if (!booking) return;

    window.dataManager.updateBooking(bookingId, {
      paymentStatus: 'PAGO',
      status: 'CONCLUIDO',
      paymentMethod: selectedMethod,
      amountPaidNow: booking.totalPrice || 0,
      remainingAmount: 0
    });

    this.showToast(`Pagamento do agendamento #${bookingId} baixado com sucesso!`, 'success');
    this.closeBookingDetailsModal();

    // Atualiza Agenda e Dashboard Financeiro em tempo real
    if (window.calendarEngine) {
      window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
      window.calendarEngine.renderMainCalendar('.calendar-grid-body', '.month-display-title');
    }
    if (window.adminManager && typeof window.adminManager.renderFinancialDashboard === 'function') {
      window.adminManager.renderFinancialDashboard();
    }
  }

  reopenBookingPayment(bookingId) {
    if (confirm('Deseja reabrir este agendamento como pagamento pendente?')) {
      window.dataManager.updateBooking(bookingId, {
        paymentStatus: 'PENDENTE',
        status: 'CONFIRMADO'
      });
      this.showToast(`Status do agendamento #${bookingId} reaberto como pendente.`, 'warning');
      this.closeBookingDetailsModal();

      if (window.calendarEngine) {
        window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
        window.calendarEngine.renderMainCalendar('.calendar-grid-body', '.month-display-title');
      }
      if (window.adminManager && typeof window.adminManager.renderFinancialDashboard === 'function') {
        window.adminManager.renderFinancialDashboard();
      }
    }
  }

  closeBookingDetailsModal() {
    const modal = document.getElementById('bookingDetailsModalBackdrop');
    if (modal) modal.classList.remove('open');
  }

  cancelBooking(bookingId) {
    if (confirm('Deseja realmente cancelar este agendamento?')) {
      window.dataManager.updateBookingStatus(bookingId, 'CANCELADO');
      this.closeBookingDetailsModal();
      this.showToast('Agendamento cancelado com sucesso.');
      if (window.calendarEngine) {
        window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
        window.calendarEngine.renderMainCalendar('.calendar-grid-body', '.month-display-title');
      }
      if (window.adminManager && typeof window.adminManager.renderFinancialDashboard === 'function') {
        window.adminManager.renderFinancialDashboard();
      }
    }
  }

  openNewBookingModal(presetDate = null) {
    window.adminManager.openManualBookingModal(presetDate);
  }

  // --- Toast Flutuante ---
  showToast(message, type = 'brand') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'danger' ? 'toast-danger' : ''}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // --- Sistema de Alerta Visual e Sonoro de Novo Agendamento ---
  triggerNewBookingAlert(booking, playSound = true) {
    if (!booking) return;

    // 1. Tocar sinal sonoro se habilitado
    if (playSound && window.soundAlertManager) {
      window.soundAlertManager.playChime();
    }

    // 2. Formatar data para exibição
    const [y, m, d] = (booking.date || '').split('-');
    const formattedDate = (d && m && y) ? `${d}/${m}/${y}` : booking.date;

    let payBadge = 'Pagamento no Local';
    if (booking.paymentMethod === 'PIX') payBadge = 'Pix';
    else if (booking.paymentMethod === 'CARTAO_CREDITO') payBadge = 'Cartão de Crédito';
    else if (booking.paymentMethod === 'CARTAO_DEBITO') payBadge = 'Cartão de Débito';

    // 3. Adicionar notificação no dropdown de notificações do sininho
    const newNotif = {
      id: Date.now(),
      type: 'booking',
      title: `Novo agendamento: ${booking.clientName}`,
      clientName: booking.clientName,
      text: `${booking.serviceNames} • ${formattedDate} às ${booking.time}`,
      meta: `R$ ${(booking.totalPrice || 0).toFixed(2)} (${payBadge})`,
      time: 'Agora mesmo',
      bookingId: booking.id,
      bookingDate: booking.date,
      read: false
    };
    this.notifications.unshift(newNotif);
    this.updateNotificationBadge();
    this.renderNotificationsList();

    // 4. Exibir o Card Flutuante de Alerta no Painel
    this.showNewBookingAlertModal(booking);
  }

  showNewBookingAlertModal(booking) {
    const alertEl = document.getElementById('newBookingAlertToast');
    if (!alertEl) return;

    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
      this.alertTimeout = null;
    }

    const [y, m, d] = (booking.date || '').split('-');
    const formattedDate = (d && m && y) ? `${d}/${m}/${y}` : booking.date;

    let payBadge = 'Pagamento no Local';
    let badgeClass = 'badge-warning';
    if (booking.paymentMethod === 'PIX') {
      payBadge = 'Pix Online';
      badgeClass = 'badge-success';
    } else if (booking.paymentMethod === 'CARTAO_CREDITO') {
      payBadge = 'Cartão de Crédito';
      badgeClass = 'badge-success';
    } else if (booking.paymentMethod === 'CARTAO_DEBITO') {
      payBadge = 'Cartão de Débito';
      badgeClass = 'badge-success';
    } else if (booking.paymentStatus === 'PAGO') {
      payBadge = 'Pago';
      badgeClass = 'badge-success';
    }

    const cleanPhone = (booking.clientPhone || '').replace(/\D/g, '');

    alertEl.innerHTML = `
      <div class="alert-toast-header">
        <div class="alert-toast-header-left">
          <div class="alert-bell-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>
          <span class="alert-toast-title">Novo Agendamento Recebido!</span>
        </div>
        <button class="alert-toast-close" onclick="window.app.closeNewBookingAlert()" title="Fechar aviso">&times;</button>
      </div>
      <div class="alert-toast-body">
        <div class="alert-toast-client-row">
          <span class="alert-toast-client-name">${booking.clientName}</span>
          <span class="badge ${badgeClass}">${payBadge}</span>
        </div>
        <div class="alert-toast-details-box">
          <div style="display:flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <strong>${booking.serviceNames}</strong>
          </div>
          <div style="color:var(--color-brand-700); font-weight:700; display:flex; align-items:center; gap:6px; margin-top:4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>${formattedDate} às ${booking.time} (${booking.duration || 60} min)</span>
          </div>
          <div style="color:var(--color-text-700); display:flex; align-items:center; gap:6px; margin-top:4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <span>Total: <strong>R$ ${(booking.totalPrice || 0).toFixed(2)}</strong></span>
          </div>
          ${booking.clientPhone ? `<div style="color:var(--color-text-500); font-size:12px; display:flex; align-items:center; gap:6px; margin-top:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg><span>${booking.clientPhone}</span></div>` : ''}
        </div>
        <div class="alert-toast-actions">
          <button class="btn-primary" style="flex:1; height:36px; font-size:12px; display:inline-flex; align-items:center; justify-content:center; gap:6px;" onclick="window.app.goToBookingInAgenda('${booking.date}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Ver na Agenda</span>
          </button>
          ${cleanPhone ? `
            <a class="btn-pill" style="height:36px; font-size:12px; background:#25d366; color:#ffffff; border:none; display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:0 12px; text-decoration:none; font-weight:700;" href="https://wa.me/55${cleanPhone}" target="_blank">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.772.82 2.79.82 3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.767-5.766zm9.969 5.766c0 5.485-4.464 9.948-9.95 9.948-1.688 0-3.273-.426-4.665-1.173l-5.385 1.411 1.439-5.253c-.848-1.455-1.339-3.14-1.339-4.933 0-5.485 4.464-9.949 9.95-9.949 5.486 0 9.95 4.464 9.95 9.949z"/></svg>
              <span>WhatsApp</span>
            </a>
          ` : ''}
        </div>
      </div>
    `;

    alertEl.classList.add('active');

    // Fechar automaticamente após 20 segundos se a profissional não interagir
    this.alertTimeout = setTimeout(() => {
      this.closeNewBookingAlert();
    }, 20000);
  }

  closeNewBookingAlert() {
    const alertEl = document.getElementById('newBookingAlertToast');
    if (alertEl) {
      alertEl.classList.remove('active');
    }
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
      this.alertTimeout = null;
    }
  }

  goToBookingInAgenda(dateStr) {
    this.closeNewBookingAlert();
    this.switchView('admin');
    this.showAdminTab('agenda');
    if (window.calendarEngine && typeof window.calendarEngine.goToDate === 'function') {
      window.calendarEngine.goToDate(dateStr);
    }
    this.showToast('Exibindo agendamento na agenda!', 'success');
  }

  simulateNewBookingNotification() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const testBooking = {
      id: 'SIM-' + Date.now().toString().slice(-4),
      clientName: 'Fernanda Silveira',
      clientPhone: '11998765432',
      clientEmail: 'fernanda@exemplo.com',
      serviceNames: 'Alongamento em Fibra de Vidro + Esmaltação em Gel',
      date: todayStr,
      time: '14:30',
      duration: 120,
      totalPrice: 175.00,
      paymentMethod: 'PIX',
      paymentStatus: 'PAGO'
    };

    this.triggerNewBookingAlert(testBooking, true);
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
  window.app.init();
});
