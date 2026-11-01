/**
 * Agende-me — Auth Manager (Sistema de Login da Manicure & Usuário Definitivo)
 * Gerencia autenticação, controle de sessão, criação de acesso definitivo e bloqueio do painel.
 */

class AuthManager {
  constructor() {
    this.storageKey = 'agendeme_session_v1';
    this.session = this.loadSession();
    this.passwordVisible = false;
    this.registerPasswordVisible = false;
    this.currentTab = 'login'; // 'login' ou 'register'
  }

  loadSession() {
    try {
      const local = localStorage.getItem(this.storageKey);
      if (local) return JSON.parse(local);

      const session = sessionStorage.getItem(this.storageKey);
      if (session) return JSON.parse(session);
    } catch (e) {
      console.warn('Erro ao carregar sessão:', e);
    }
    return null;
  }

  init() {
    this.setupEventListeners();
    this.updateUserInterface();
  }

  isAuthenticated() {
    return !!(this.session && this.session.email);
  }

  setupEventListeners() {
    // 1. Form de Login Existente
    const formLogin = document.getElementById('manicureLoginForm');
    if (formLogin) {
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLoginSubmit();
      });
    }

    // 2. Form de Criação de Acesso Definitivo
    const formRegister = document.getElementById('manicureRegisterForm');
    if (formRegister) {
      formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRegisterDefinitiveSubmit();
      });
    }

    // 3. Toggle de visibilidade da senha no login
    const btnEye = document.getElementById('btnTogglePassword');
    if (btnEye) {
      btnEye.addEventListener('click', () => this.togglePasswordVisibility('login'));
    }

    // 4. Toggle de visibilidade da senha no cadastro definitivo
    const btnEyeReg = document.getElementById('btnToggleRegisterPassword');
    if (btnEyeReg) {
      btnEyeReg.addEventListener('click', () => this.togglePasswordVisibility('register'));
    }

    // 5. Botão de acesso rápido demonstração
    const btnDemo = document.getElementById('btnQuickDemoLogin');
    if (btnDemo) {
      btnDemo.addEventListener('click', () => this.quickLoginDemo());
    }

    // 6. Link esqueceu a senha
    const btnForgot = document.getElementById('btnForgotPassword');
    if (btnForgot) {
      btnForgot.addEventListener('click', () => this.openForgotPasswordModal());
    }
  }

  // Alternar entre aba "Já tenho Acesso" e "Criar Acesso Definitivo"
  switchAuthTab(tabName) {
    this.currentTab = tabName;
    const tabLoginBtn = document.getElementById('tabBtnLogin');
    const tabRegisterBtn = document.getElementById('tabBtnRegister');
    const panelLogin = document.getElementById('panelAuthLogin');
    const panelRegister = document.getElementById('panelAuthRegister');
    const errorAlert = document.getElementById('loginErrorAlert');

    if (errorAlert) errorAlert.style.display = 'none';

    if (tabName === 'register') {
      if (tabLoginBtn) tabLoginBtn.classList.remove('active');
      if (tabRegisterBtn) tabRegisterBtn.classList.add('active');
      if (panelLogin) panelLogin.style.display = 'none';
      if (panelRegister) panelRegister.style.display = 'block';
    } else {
      if (tabLoginBtn) tabLoginBtn.classList.add('active');
      if (tabRegisterBtn) tabRegisterBtn.classList.remove('active');
      if (panelLogin) panelLogin.style.display = 'block';
      if (panelRegister) panelRegister.style.display = 'none';
    }
  }

  // Submissão do Login
  handleLoginSubmit() {
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPassword');
    const rememberChk = document.getElementById('loginRemember');
    const errorAlert = document.getElementById('loginErrorAlert');
    const btnSubmit = document.getElementById('btnLoginSubmit');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passInput ? passInput.value.trim() : '';
    const remember = rememberChk ? rememberChk.checked : true;

    if (!email || !password) {
      this.showLoginError('Informe seu e-mail ou WhatsApp e sua senha de acesso.');
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="spinner" style="width:18px; height:18px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite; display:inline-block;"></span> Entrando...`;
    }

    setTimeout(() => {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span>Entrar no Painel</span> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
      }

      const matchResult = this.validateCredentials(email, password);

      if (matchResult.valid) {
        if (errorAlert) errorAlert.style.display = 'none';

        const settings = window.dataManager ? window.dataManager.getSettings() : {};
        const manicureName = matchResult.userName || settings.manicureName || 'Bela Souza';

        this.session = {
          email: matchResult.userEmail || email,
          name: manicureName,
          role: 'Nail Designer',
          loggedAt: new Date().toISOString()
        };

        const sessionStr = JSON.stringify(this.session);
        if (remember) {
          localStorage.setItem(this.storageKey, sessionStr);
        } else {
          sessionStorage.setItem(this.storageKey, sessionStr);
        }

        this.updateUserInterface();

        if (window.soundAlertManager) {
          window.soundAlertManager.playChime();
        }

        if (window.app) {
          window.app.switchView('admin');
          window.app.showToast(`Bem-vinda de volta, ${manicureName}! Painel liberado.`, 'success');
        }
      } else {
        const settings = window.dataManager ? window.dataManager.getSettings() : {};
        const isCustom = settings.adminLogin && settings.adminLogin.isCustom;
        if (isCustom) {
          this.showLoginError('E-mail, WhatsApp ou senha incorretos para o seu acesso definitivo.');
        } else {
          this.showLoginError('E-mail ou senha incorretos. Dica demo: manicure@studio.com e senha 123456');
        }
      }
    }, 400);
  }

  // Criação e Registro de Login Definitivo pela Manicure
  handleRegisterDefinitiveSubmit() {
    const nameInput = document.getElementById('registerName');
    const phoneInput = document.getElementById('registerPhone');
    const emailInput = document.getElementById('registerEmail');
    const passInput = document.getElementById('registerPassword');
    const btnSubmit = document.getElementById('btnRegisterSubmit');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim().replace(/\D/g, '') : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passInput ? passInput.value.trim() : '';

    if (!name || !email || !password) {
      this.showLoginError('Preencha seu nome, e-mail e senha para gerar seu acesso definitivo.');
      return;
    }

    if (password.length < 4) {
      this.showLoginError('A senha deve conter pelo menos 4 caracteres.');
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="spinner" style="width:18px; height:18px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite; display:inline-block;"></span> Criando seu acesso definitivo...`;
    }

    setTimeout(() => {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> <span>Criar Meu Acesso e Entrar</span> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
      }

      // Salvar dados no DataManager
      if (window.dataManager) {
        window.dataManager.updateSettings({
          manicureName: name,
          studioName: name.toLowerCase().includes('studio') ? name : `Studio ${name}`,
          whatsappNumber: phone || '11987654321',
          adminLogin: {
            email: email,
            password: password,
            isCustom: true,
            createdAt: new Date().toISOString()
          }
        });
      }

      // Iniciar sessão
      this.session = {
        email: email,
        name: name,
        role: 'Nail Designer',
        loggedAt: new Date().toISOString()
      };

      localStorage.setItem(this.storageKey, JSON.stringify(this.session));
      this.updateUserInterface();

      if (window.soundAlertManager) {
        window.soundAlertManager.playChime();
      }

      if (window.app) {
        window.app.switchView('admin');
        window.app.showToast(`Parabéns, ${name}! Seu login definitivo foi gerado com sucesso.`, 'success');
      }
    }, 450);
  }

  // Validação de Credenciais
  validateCredentials(email, password) {
    const cleanEmail = email.toLowerCase().trim();
    const cleanDigits = email.replace(/\D/g, '');
    const settings = window.dataManager ? window.dataManager.getSettings() : {};
    const adminLogin = settings.adminLogin || {};

    // 1. Verificar credenciais definitivas cadastradas
    if (adminLogin.email && adminLogin.password) {
      const savedEmail = adminLogin.email.toLowerCase().trim();
      const savedPhone = (settings.whatsappNumber || '').replace(/\D/g, '');

      const isEmailMatch = (cleanEmail === savedEmail);
      const isPhoneMatch = (cleanDigits && savedPhone && cleanDigits === savedPhone);

      if ((isEmailMatch || isPhoneMatch) && password === adminLogin.password) {
        return {
          valid: true,
          userName: settings.manicureName || 'Profissional',
          userEmail: adminLogin.email
        };
      }
    }

    // 2. Credenciais de demonstração padrão (manicure@studio.com / 123456 ou 123)
    const demoEmails = ['manicure@studio.com', 'bela@studio.com', 'admin@agendeme.com', 'admin@studio.com'];
    if (demoEmails.includes(cleanEmail) && (password === '123' || password === '123456' || password === 'admin')) {
      return {
        valid: true,
        userName: settings.manicureName || 'Bela Souza',
        userEmail: 'manicure@studio.com'
      };
    }

    // 3. Se ainda não houver credencial personalizada gravada, permite teste com qualquer e-mail com senha >= 4
    if (!adminLogin.isCustom && cleanEmail.includes('@') && password.length >= 4) {
      return {
        valid: true,
        userName: settings.manicureName || 'Bela Souza',
        userEmail: cleanEmail
      };
    }

    return { valid: false };
  }

  showLoginError(message) {
    const errorAlert = document.getElementById('loginErrorAlert');
    const errorText = document.getElementById('loginErrorText');
    if (errorAlert && errorText) {
      errorText.textContent = message;
      errorAlert.style.display = 'flex';
    }
  }

  quickLoginDemo() {
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPassword');
    const errorAlert = document.getElementById('loginErrorAlert');

    if (emailInput) emailInput.value = 'manicure@studio.com';
    if (passInput) passInput.value = '123456';
    if (errorAlert) errorAlert.style.display = 'none';

    this.handleLoginSubmit();
  }

  logout() {
    localStorage.removeItem(this.storageKey);
    sessionStorage.removeItem(this.storageKey);
    this.session = null;

    this.updateUserInterface();

    if (window.app) {
      window.app.switchView('login');
      window.app.showToast('Painel bloqueado. Sessão encerrada com sucesso.', 'info');
    }
  }

  togglePasswordVisibility(context = 'login') {
    if (context === 'register') {
      const passInput = document.getElementById('registerPassword');
      const eyeIcon = document.getElementById('eyeRegisterIconSvg') || document.getElementById('eyeIconRegSvg');
      if (!passInput) return;

      this.registerPasswordVisible = !this.registerPasswordVisible;
      passInput.type = this.registerPasswordVisible ? 'text' : 'password';

      if (eyeIcon) {
        eyeIcon.innerHTML = this.registerPasswordVisible
          ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`
          : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
      }
    } else {
      const passInput = document.getElementById('loginPassword');
      const eyeIcon = document.getElementById('eyeIconSvg');
      if (!passInput) return;

      this.passwordVisible = !this.passwordVisible;
      passInput.type = this.passwordVisible ? 'text' : 'password';

      if (eyeIcon) {
        eyeIcon.innerHTML = this.passwordVisible
          ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`
          : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
      }
    }
  }

  updateUserInterface() {
    const nameEl = document.getElementById('topbarManicureName');
    if (nameEl && this.session && this.session.name) {
      nameEl.textContent = this.session.name;
    }
  }

  openForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    const settings = window.dataManager ? window.dataManager.getSettings() : {};
    const adminLogin = settings.adminLogin || {};
    const hintEl = document.getElementById('forgotPasswordHint');

    if (hintEl) {
      if (adminLogin.isCustom && adminLogin.email) {
        hintEl.innerHTML = `<strong>Seu Login Registrado:</strong> O e-mail de acesso cadastrado é <strong>${adminLogin.email}</strong>.`;
      } else {
        hintEl.innerHTML = `<strong>Acesso Padrão:</strong> E-mail <strong>manicure@studio.com</strong> e senha <strong>123456</strong>.`;
      }
    }

    if (modal) modal.classList.add('open');
  }

  closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.classList.remove('open');
  }

  sendPasswordRecovery() {
    const input = document.getElementById('forgotPasswordInput');
    const val = input ? input.value.trim() : '';

    if (!val) {
      if (window.app) window.app.showToast('Informe seu e-mail ou WhatsApp cadastrado.', 'danger');
      return;
    }

    this.closeForgotPasswordModal();
    if (window.app) {
      window.app.showToast(`Instruções de redefinição enviadas para ${val}!`, 'success');
    }
  }
}

window.authManager = new AuthManager();
