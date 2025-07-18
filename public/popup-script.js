/**
 * PapaPop Universal Popup Script
 * Edge-optimized with optimistic UI patterns
 * Version: 1.0.0
 */

(function() {
  'use strict';

  // Detailed logging system
  const log = {
    info: (message, data = {}) => {
      console.log(`🎯 [PapaPop] ${message}`, data);
    },
    error: (message, error = {}) => {
      console.error(`❌ [PapaPop] ${message}`, error);
    },
    warn: (message, data = {}) => {
      console.warn(`⚠️ [PapaPop] ${message}`, data);
    },
    debug: (message, data = {}) => {
      console.debug(`🔍 [PapaPop] ${message}`, data);
    },
    customer: (message, data = {}) => {
      console.log(`👤 [PapaPop Customer] ${message}`, data);
    }
  };

  // Global configuration
  const CONFIG = {
    API_BASE: 'https://papapop.vercel.app',
    STORAGE_KEY: 'papapop_data',
    RETRY_DELAYS: [1000, 2000, 4000, 8000],
    MAX_RETRIES: 4,
  };

  log.info('Script initialization started');
  log.debug('Environment details', {
    hostname: window.location.hostname,
    href: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  });

  // Utility functions
  const utils = {
    // Generate unique session ID
    generateSessionId() {
      return 'pp_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    },

    // Get or create session ID
    getSessionId() {
      let sessionId = localStorage.getItem('papapop_session_id');
      if (!sessionId) {
        sessionId = this.generateSessionId();
        localStorage.setItem('papapop_session_id', sessionId);
      }
      return sessionId;
    },

    // Detect if running in Shopify admin
    isShopifyAdmin() {
      const isIframe = window.top !== window.self;
      const isShopifyDomain = window.location.hostname.includes('shopify.com');
      const isAdminPath = window.location.pathname.includes('/admin');
      const isAdmin = isIframe || isShopifyDomain || isAdminPath;
      
      log.debug('Admin detection check', {
        isIframe,
        isShopifyDomain,
        isAdminPath,
        isAdmin,
        hostname: window.location.hostname,
        pathname: window.location.pathname
      });
      
      return isAdmin;
    },

    // Get current shop domain
    getShopDomain() {
      return window.Shopify?.shop || window.location.hostname;
    },

    // Device detection
    getDeviceType() {
      if (window.innerWidth <= 768) return 'mobile';
      if (window.innerWidth <= 1024) return 'tablet';
      return 'desktop';
    },

    // Page type detection
    getPageType() {
      const path = window.location.pathname;
      if (path === '/') return 'homepage';
      if (path.includes('/products/')) return 'product';
      if (path.includes('/collections/')) return 'collection';
      if (path.includes('/cart')) return 'cart';
      if (path.includes('/checkout')) return 'checkout';
      return 'other';
    },

    // Debounce function
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // Queue system for background sync
    queueData(type, data) {
      const stored = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '{}');
      if (!stored.queue) stored.queue = [];
      
      stored.queue.push({
        id: this.generateSessionId(),
        type,
        data,
        timestamp: Date.now(),
        retries: 0
      });
      
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(stored));
      this.processQueue();
    },

    // Process queued data
    async processQueue() {
      const stored = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '{}');
      if (!stored.queue || stored.queue.length === 0) return;

      const queue = [...stored.queue];
      stored.queue = [];
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(stored));

      for (const item of queue) {
        try {
          await this.submitData(item.type, item.data);
        } catch (error) {
          // Re-queue with retry logic
          if (item.retries < CONFIG.MAX_RETRIES) {
            item.retries++;
            setTimeout(() => {
              const currentStored = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '{}');
              if (!currentStored.queue) currentStored.queue = [];
              currentStored.queue.push(item);
              localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(currentStored));
              this.processQueue();
            }, CONFIG.RETRY_DELAYS[item.retries - 1] || 8000);
          }
        }
      }
    },

    // Submit data to API
    async submitData(type, data) {
      const endpoints = {
        'quiz-response': '/api/submit-quiz-response',
        'email-capture': '/api/capture-email',
        'analytics': '/api/track-event'
      };

      const response = await fetch(CONFIG.API_BASE + endpoints[type], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    }
  };

  // Popup Manager
  class PopupManager {
    constructor() {
      this.configs = [];
      this.activePopups = new Map();
      this.sessionData = {};
      this.triggers = {
        delay: new Set(),
        scroll: new Set(),
        exit: new Set()
      };
      this.init();
    }

    async init() {
      log.info('PopupManager initialization started');
      
      // Don't run in Shopify admin
      if (utils.isShopifyAdmin()) {
        log.warn('Skipping popup initialization - running in admin environment');
        return;
      }

      log.customer('PapaPop is loading on your store!');
      
      // Load popup configurations
      log.info('Loading popup configurations...');
      await this.loadConfigs();
      
      // Set up triggers
      log.info('Setting up popup triggers...');
      this.setupTriggers();
      
      // Start queue processing
      log.info('Starting background sync queue processing...');
      utils.processQueue();
      
      log.info('PopupManager initialization completed successfully');
    }

    async loadConfigs() {
      try {
        const shop = utils.getShopDomain();
        log.info('Fetching popup configurations', { shop });
        
        const url = `${CONFIG.API_BASE}/api/popup-config?shop=${shop}`;
        log.debug('Making API request', { url });
        
        const response = await fetch(url);
        log.debug('API response received', { 
          status: response.status, 
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        const data = await response.json();
        log.debug('API response data', data);
        
        if (data.success) {
          this.configs = data.configs;
          log.info('Popup configurations loaded successfully', { 
            count: this.configs.length,
            configs: this.configs.map(c => ({ id: c.id, title: c.title, triggerType: c.triggerType }))
          });
          
          this.filterApplicablePopups();
        } else {
          log.warn('API returned unsuccessful response', data);
        }
      } catch (error) {
        log.error('Failed to load popup configs', error);
      }
    }

    filterApplicablePopups() {
      const deviceType = utils.getDeviceType();
      const pageType = utils.getPageType();
      
      log.info('Filtering applicable popups', {
        deviceType,
        pageType,
        totalConfigs: this.configs.length
      });
      
      const originalConfigs = [...this.configs];
      
      this.configs = this.configs.filter(config => {
        const deviceMatch = !config.targetDevices || config.targetDevices.length === 0 || config.targetDevices.includes(deviceType);
        const pageMatch = !config.targetPages || config.targetPages.length === 0 || config.targetPages.includes(pageType);
        
        // Session repeat logic
        let sessionMatch = true;
        if (!config.repeatInSession) {
          const viewCount = this.getPopupViewCount(config.id);
          sessionMatch = viewCount < config.maxViewsPerSession;
        }
        
        const shouldShow = deviceMatch && pageMatch && sessionMatch;
        
        log.debug('Popup filtering check', {
          popupId: config.id,
          title: config.title,
          deviceMatch,
          pageMatch,
          sessionMatch,
          shouldShow,
          targetDevices: config.targetDevices,
          targetPages: config.targetPages,
          viewCount: this.getPopupViewCount(config.id),
          maxViews: config.maxViewsPerSession
        });
        
        return shouldShow;
      });
      
      log.info('Popup filtering completed', {
        originalCount: originalConfigs.length,
        filteredCount: this.configs.length,
        applicablePopups: this.configs.map(c => ({ id: c.id, title: c.title, triggerType: c.triggerType }))
      });
      
      if (this.configs.length === 0) {
        log.customer('No popups are configured to show on this page');
      } else {
        log.customer(`Found ${this.configs.length} popup(s) that may show on this page`);
      }
    }

    getPopupViewCount(popupId) {
      const key = `papapop_views_${popupId}`;
      return parseInt(sessionStorage.getItem(key) || '0', 10);
    }

    incrementPopupViewCount(popupId) {
      const key = `papapop_views_${popupId}`;
      const count = this.getPopupViewCount(popupId) + 1;
      sessionStorage.setItem(key, count.toString());
    }

    setupTriggers() {
      log.info('Setting up popup triggers', {
        totalConfigs: this.configs.length,
        triggerTypes: this.configs.map(c => c.triggerType)
      });
      
      this.configs.forEach(config => {
        log.debug('Setting up trigger', {
          popupId: config.id,
          title: config.title,
          triggerType: config.triggerType,
          triggerValue: config.triggerValue
        });
        
        switch (config.triggerType) {
          case 'delay':
            this.triggers.delay.add(config);
            const delay = config.triggerValue * 1000;
            log.customer(`Popup "${config.title}" will show in ${config.triggerValue} seconds`);
            setTimeout(() => {
              log.info('Delay trigger fired', { popupId: config.id, title: config.title });
              this.showPopup(config);
            }, delay);
            break;
          case 'scroll':
            this.triggers.scroll.add(config);
            log.customer(`Popup "${config.title}" will show when you scroll ${config.triggerValue}% down the page`);
            break;
          case 'exit':
            this.triggers.exit.add(config);
            log.customer(`Popup "${config.title}" will show when you try to leave the page`);
            break;
        }
      });

      // Set up scroll listener
      if (this.triggers.scroll.size > 0) {
        log.info('Setting up scroll listener', { scrollTriggersCount: this.triggers.scroll.size });
        window.addEventListener('scroll', utils.debounce(() => {
          this.checkScrollTriggers();
        }, 100));
      }

      // Set up exit intent listener
      if (this.triggers.exit.size > 0) {
        log.info('Setting up exit intent listener', { exitTriggersCount: this.triggers.exit.size });
        document.addEventListener('mouseleave', (e) => {
          if (e.clientY <= 0) {
            log.debug('Exit intent detected', { clientY: e.clientY });
            this.checkExitTriggers();
          }
        });
      }
    }

    checkScrollTriggers() {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      
      log.debug('Checking scroll triggers', {
        scrollPercent: scrollPercent.toFixed(2),
        scrollY: window.scrollY,
        bodyHeight: document.body.scrollHeight,
        windowHeight: window.innerHeight,
        activePopups: Array.from(this.activePopups.keys())
      });
      
      this.triggers.scroll.forEach(config => {
        if (scrollPercent >= config.triggerValue && !this.activePopups.has(config.id)) {
          log.info('Scroll trigger activated', {
            popupId: config.id,
            title: config.title,
            scrollPercent: scrollPercent.toFixed(2),
            targetPercent: config.triggerValue
          });
          this.showPopup(config);
        }
      });
    }

    checkExitTriggers() {
      log.info('Checking exit triggers', {
        exitTriggersCount: this.triggers.exit.size,
        activePopups: Array.from(this.activePopups.keys())
      });
      
      this.triggers.exit.forEach(config => {
        if (!this.activePopups.has(config.id)) {
          log.info('Exit trigger activated', {
            popupId: config.id,
            title: config.title
          });
          this.showPopup(config);
        }
      });
    }

    showPopup(config) {
      if (this.activePopups.has(config.id)) {
        log.debug('Popup already active, skipping', { popupId: config.id });
        return;
      }

      log.info('Showing popup', {
        popupId: config.id,
        title: config.title,
        triggerType: config.triggerType,
        position: config.position
      });
      
      log.customer(`🎉 Popup "${config.title}" is now showing!`);

      // Track view
      this.trackEvent(config.id, 'view');
      this.incrementPopupViewCount(config.id);

      // Create popup instance
      const popup = new PopupRenderer(config, this);
      this.activePopups.set(config.id, popup);
      popup.render();
    }

    closePopup(popupId) {
      const popup = this.activePopups.get(popupId);
      if (popup) {
        log.info('Closing popup', { popupId });
        log.customer('Popup closed');
        popup.destroy();
        this.activePopups.delete(popupId);
      }
    }

    trackEvent(popupId, event, data = {}) {
      const eventData = {
        popupId,
        event,
        sessionId: utils.getSessionId(),
        timestamp: Date.now(),
        pageUrl: window.location.href,
        pageType: utils.getPageType(),
        deviceType: utils.getDeviceType(),
        ...data
      };

      log.debug('Tracking event', eventData);
      
      // Queue for background sync
      utils.queueData('analytics', eventData);
    }
  }

  // Popup Renderer
  class PopupRenderer {
    constructor(config, manager) {
      this.config = config;
      this.manager = manager;
      this.element = null;
      this.currentStep = 0;
      this.userData = {};
    }

    render() {
      log.info('Rendering popup', { 
        popupId: this.config.id,
        title: this.config.title,
        popupType: this.config.popupType
      });
      
      this.createElement();
      this.attachEventListeners();
      this.show();
    }

    createElement() {
      const popup = document.createElement('div');
      popup.className = 'papapop-overlay';
      popup.innerHTML = this.getPopupHTML();
      
      // Apply theme
      this.applyTheme(popup);
      
      // Position popup
      this.applyPosition(popup);
      
      document.body.appendChild(popup);
      this.element = popup;
    }

    getPopupHTML() {
      if (this.config.popupType === 'multi_step' && this.config.steps) {
        return this.getMultiStepHTML();
      }
      return this.getSingleStepHTML();
    }

    getSingleStepHTML() {
      return `
        <div class="papapop-modal">
          <div class="papapop-close" data-action="close">&times;</div>
          <div class="papapop-content">
            <h2 class="papapop-heading">${this.config.heading}</h2>
            ${this.config.description ? `<p class="papapop-description">${this.config.description}</p>` : ''}
            <div class="papapop-form">
              <input type="email" class="papapop-email" placeholder="Enter your email" required>
              <button class="papapop-submit" data-action="submit">${this.config.buttonText}</button>
            </div>
          </div>
        </div>
      `;
    }

    getMultiStepHTML() {
      const steps = this.config.steps || [];
      const currentStepData = steps[this.currentStep];
      
      if (!currentStepData) {
        return this.getSingleStepHTML();
      }

      if (currentStepData.type === 'quiz') {
        return `
          <div class="papapop-modal">
            <div class="papapop-close" data-action="close">&times;</div>
            <div class="papapop-content">
              <div class="papapop-progress">
                <div class="papapop-progress-bar" style="width: ${((this.currentStep + 1) / steps.length) * 100}%"></div>
              </div>
              <h2 class="papapop-heading">${currentStepData.question}</h2>
              <div class="papapop-quiz-options">
                ${currentStepData.options.map((option, index) => `
                  <button class="papapop-quiz-option" data-action="quiz-answer" data-value="${option}" data-index="${index}">
                    ${option}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }

      if (currentStepData.type === 'email') {
        return `
          <div class="papapop-modal">
            <div class="papapop-close" data-action="close">&times;</div>
            <div class="papapop-content">
              <h2 class="papapop-heading">${currentStepData.heading}</h2>
              ${currentStepData.description ? `<p class="papapop-description">${currentStepData.description}</p>` : ''}
              <div class="papapop-form">
                <input type="email" class="papapop-email" placeholder="Enter your email" required>
                <button class="papapop-submit" data-action="submit">${currentStepData.buttonText || 'Submit'}</button>
              </div>
            </div>
          </div>
        `;
      }

      return this.getSingleStepHTML();
    }

    attachEventListeners() {
      if (!this.element) return;

      // Close button
      const closeBtn = this.element.querySelector('[data-action="close"]');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          log.customer('User clicked close button');
          this.manager.trackEvent(this.config.id, 'close');
          this.destroy();
        });
      }

      // Quiz answers
      const quizOptions = this.element.querySelectorAll('[data-action="quiz-answer"]');
      quizOptions.forEach(option => {
        option.addEventListener('click', (e) => {
          const value = e.target.dataset.value;
          log.customer(`User selected quiz answer: "${value}"`);
          this.handleQuizAnswer(value);
        });
      });

      // Submit button
      const submitBtn = this.element.querySelector('[data-action="submit"]');
      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          log.customer('User clicked submit button');
          this.handleSubmit();
        });
      }

      // Email input enter key
      const emailInput = this.element.querySelector('.papapop-email');
      if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            log.customer('User pressed Enter to submit');
            this.handleSubmit();
          }
        });
      }

      // Overlay click to close
      this.element.addEventListener('click', (e) => {
        if (e.target === this.element) {
          log.customer('User clicked outside popup to close');
          this.manager.trackEvent(this.config.id, 'close');
          this.destroy();
        }
      });
    }

    handleQuizAnswer(value) {
      // Store answer with optimistic UI
      const steps = this.config.steps || [];
      const currentStepData = steps[this.currentStep];
      
      log.info('Processing quiz answer', {
        popupId: this.config.id,
        currentStep: this.currentStep,
        totalSteps: steps.length,
        question: currentStepData.question,
        answer: value
      });
      
      if (!this.userData.quizAnswers) {
        this.userData.quizAnswers = [];
      }
      
      this.userData.quizAnswers.push({
        questionId: currentStepData.id || this.currentStep,
        question: currentStepData.question,
        answer: value,
        stepOrder: this.currentStep
      });

      // Queue quiz response for background sync
      utils.queueData('quiz-response', {
        popupId: this.config.id,
        sessionId: utils.getSessionId(),
        questionId: currentStepData.id || this.currentStep,
        question: currentStepData.question,
        selectedAnswers: [value],
        responseTime: null,
        stepOrder: this.currentStep,
        timestamp: Date.now()
      });

      // Track interaction
      this.manager.trackEvent(this.config.id, 'interaction', {
        stepNumber: this.currentStep,
        action: 'quiz_answer',
        value: value
      });

      // Move to next step immediately (optimistic UI)
      this.currentStep++;
      log.customer(`Moving to step ${this.currentStep + 1} of ${steps.length}`);
      this.updateContent();
    }

    handleSubmit() {
      const emailInput = this.element.querySelector('.papapop-email');
      const email = emailInput?.value.trim();

      log.info('Processing email submission', {
        popupId: this.config.id,
        email: email ? email.replace(/./g, '*') : 'empty', // Hide actual email for privacy
        hasEmail: !!email
      });

      if (!email || !this.isValidEmail(email)) {
        log.customer('Invalid email address entered');
        this.showError('Please enter a valid email address');
        return;
      }

      log.customer('Email submitted successfully! 🎉');
      // Show success immediately (optimistic UI)
      this.showSuccess();

      // Queue email capture for background sync
      utils.queueData('email-capture', {
        popupId: this.config.id,
        sessionId: utils.getSessionId(),
        email: email,
        firstName: null,
        lastName: null,
        quizData: this.userData.quizAnswers || null,
        discountGiven: this.config.discountCode,
        timestamp: Date.now()
      });

      // Track conversion
      this.manager.trackEvent(this.config.id, 'conversion', {
        stepNumber: this.currentStep,
        email: email,
        hasQuizData: !!(this.userData.quizAnswers && this.userData.quizAnswers.length > 0)
      });

      // Auto-close after success
      setTimeout(() => {
        this.destroy();
      }, 3000);
    }

    updateContent() {
      if (!this.element) return;

      const modal = this.element.querySelector('.papapop-modal');
      if (modal) {
        modal.innerHTML = this.getPopupHTML().match(/<div class="papapop-modal">([\s\S]*?)<\/div>/)[1];
        this.attachEventListeners();
      }
    }

    showSuccess() {
      const content = this.element.querySelector('.papapop-content');
      if (content) {
        content.innerHTML = `
          <div class="papapop-success">
            <div class="papapop-success-icon">✓</div>
            <h2>Thank you!</h2>
            <p>Your response has been recorded.</p>
            ${this.config.discountCode ? `<p class="papapop-discount">Use code: <strong>${this.config.discountCode}</strong></p>` : ''}
          </div>
        `;
      }
    }

    showError(message) {
      const existing = this.element.querySelector('.papapop-error');
      if (existing) existing.remove();

      const error = document.createElement('div');
      error.className = 'papapop-error';
      error.textContent = message;
      
      const content = this.element.querySelector('.papapop-content');
      if (content) {
        content.insertBefore(error, content.firstChild);
      }

      setTimeout(() => {
        error.remove();
      }, 5000);
    }

    isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    applyTheme(element) {
      const theme = this.config.theme || {};
      const modal = element.querySelector('.papapop-modal');
      
      if (modal && theme.backgroundColor) {
        modal.style.backgroundColor = theme.backgroundColor;
      }
      
      if (theme.textColor) {
        element.style.color = theme.textColor;
      }
    }

    applyPosition(element) {
      element.className = `papapop-overlay papapop-${this.config.position}`;
    }

    show() {
      if (this.element) {
        this.element.style.display = 'flex';
        // Trigger reflow for animation
        this.element.offsetHeight;
        this.element.classList.add('papapop-show');
      }
    }

    destroy() {
      if (this.element) {
        this.element.classList.add('papapop-hide');
        setTimeout(() => {
          if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
          }
        }, 300);
      }
    }
  }

  // CSS Injection
  function injectCSS() {
    const css = `
      .papapop-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .papapop-overlay.papapop-show {
        opacity: 1;
      }

      .papapop-overlay.papapop-hide {
        opacity: 0;
      }

      .papapop-modal {
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }

      .papapop-show .papapop-modal {
        transform: scale(1);
      }

      .papapop-hide .papapop-modal {
        transform: scale(0.9);
      }

      .papapop-close {
        position: absolute;
        top: 12px;
        right: 16px;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        line-height: 1;
      }

      .papapop-close:hover {
        color: #000;
      }

      .papapop-progress {
        background: #f0f0f0;
        height: 4px;
        border-radius: 2px;
        margin-bottom: 20px;
      }

      .papapop-progress-bar {
        background: #007cba;
        height: 100%;
        border-radius: 2px;
        transition: width 0.3s ease;
      }

      .papapop-heading {
        margin: 0 0 16px 0;
        color: #333;
        font-size: 24px;
        font-weight: 600;
      }

      .papapop-description {
        margin: 0 0 20px 0;
        color: #666;
        line-height: 1.5;
      }

      .papapop-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .papapop-email {
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;
      }

      .papapop-submit {
        padding: 12px 24px;
        background: #007cba;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        transition: background 0.2s ease;
      }

      .papapop-submit:hover {
        background: #005a87;
      }

      .papapop-quiz-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .papapop-quiz-option {
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s ease;
      }

      .papapop-quiz-option:hover {
        background: #f8f9fa;
        border-color: #007cba;
      }

      .papapop-success {
        text-align: center;
        padding: 20px;
      }

      .papapop-success-icon {
        font-size: 48px;
        color: #28a745;
        margin-bottom: 16px;
      }

      .papapop-discount {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 4px;
        margin-top: 16px;
        border: 1px solid #ddd;
      }

      .papapop-error {
        background: #f8d7da;
        color: #721c24;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 16px;
        border: 1px solid #f5c6cb;
      }

      /* Mobile optimizations */
      @media (max-width: 768px) {
        .papapop-modal {
          width: 95%;
          padding: 20px;
        }
        
        .papapop-heading {
          font-size: 20px;
        }
      }

      /* Position variants */
      .papapop-overlay.papapop-top {
        align-items: flex-start;
        padding-top: 40px;
      }

      .papapop-overlay.papapop-bottom {
        align-items: flex-end;
        padding-bottom: 40px;
      }
    `;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Initialize when DOM is ready
  function init() {
    log.info('Initializing PapaPop system');
    log.debug('DOM ready state', { readyState: document.readyState });
    
    if (document.readyState === 'loading') {
      log.debug('DOM not ready, waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', () => {
        log.info('DOM loaded, starting PapaPop');
        injectCSS();
        new PopupManager();
      });
    } else {
      log.info('DOM already loaded, starting PapaPop immediately');
      injectCSS();
      new PopupManager();
    }
  }

  // Start the system
  log.info('Starting PapaPop script initialization');
  init();

  // Expose for debugging
  window.PapaPop = {
    utils,
    PopupManager,
    CONFIG
  };

})();