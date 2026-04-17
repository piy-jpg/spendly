/**
 * MODERN DARK MODE TOGGLE
 * Advanced dark mode functionality with smooth transitions
 */

class DarkModeManager {
  constructor() {
    this.isDarkMode = false;
    this.init();
  }

  init() {
    // Check for saved preference
    this.savedTheme = localStorage.getItem('spendly-theme') || 'light';
    this.isDarkMode = this.savedTheme === 'dark';
    
    // Apply initial theme
    this.applyTheme();
    
    // Create and append toggle button
    this.createToggleButton();
    
    // Listen for system theme changes
    this.listenForSystemTheme();
    
    // Add keyboard shortcut
    this.addKeyboardShortcut();
  }

  createToggleButton() {
    // Check if button already exists
    if (document.getElementById('dark-mode-toggle')) {
      return;
    }

    const button = document.createElement('button');
    button.id = 'dark-mode-toggle';
    button.className = 'dark-mode-toggle';
    button.innerHTML = `
      <span class="toggle-icon">
        ${this.isDarkMode ? '🌙' : '🌙'}
      </span>
      <span class="toggle-label">
        ${this.isDarkMode ? 'Light' : 'Dark'}
      </span>
    `;
    
    // Add styles
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      background: ${this.isDarkMode ? '#1a1a2a' : '#ffffff'};
      color: ${this.isDarkMode ? '#ffffff' : '#1a1a2a'};
      border: 2px solid ${this.isDarkMode ? '#374151' : '#e5e7eb'};
      border-radius: 50px;
      padding: 12px 16px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
    `;

    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.25)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    // Add click handler
    button.addEventListener('click', () => {
      this.toggleTheme();
      this.addRippleEffect(button);
    });

    // Append to body
    document.body.appendChild(button);
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    this.saveTheme();
    this.updateToggleButton();
    this.addTransitionEffect();
  }

  applyTheme() {
    const root = document.documentElement;
    
    if (this.isDarkMode) {
      root.classList.add('dark-mode');
      root.style.setProperty('--bg-primary', 'rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--bg-secondary', 'rgba(0, 0, 0, 0.05)');
      root.style.setProperty('--text-primary', 'rgba(255, 255, 255, 0.9)');
      root.style.setProperty('--text-secondary', 'rgba(255, 255, 255, 0.7)');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.2)');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)');
    } else {
      root.classList.remove('dark-mode');
      root.style.setProperty('--bg-primary', 'rgba(255, 255, 255, 0.1)');
      root.style.setProperty('--bg-secondary', 'rgba(255, 255, 255, 0.05)');
      root.style.setProperty('--text-primary', 'rgba(0, 0, 0, 0.9)');
      root.style.setProperty('--text-secondary', 'rgba(0, 0, 0, 0.7)');
      root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.2)');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
    }
  }

  saveTheme() {
    localStorage.setItem('spendly-theme', this.isDarkMode ? 'dark' : 'light');
  }

  updateToggleButton() {
    const button = document.getElementById('dark-mode-toggle');
    if (!button) return;

    button.innerHTML = `
      <span class="toggle-icon">
        ${this.isDarkMode ? '🌙' : '🌙'}
      </span>
      <span class="toggle-label">
        ${this.isDarkMode ? 'Light' : 'Dark'}
      </span>
    `;

    button.style.background = this.isDarkMode ? '#1a1a2a' : '#ffffff';
    button.style.color = this.isDarkMode ? '#ffffff' : '#1a1a2a';
    button.style.borderColor = this.isDarkMode ? '#374151' : '#e5e7eb';
  }

  addTransitionEffect() {
    // Add smooth transition overlay
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent);
      z-index: 9998;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    document.body.appendChild(overlay);
    
    // Fade in
    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 10);

    // Fade out
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 300);
    }, 300);
  }

  addRippleEffect(element) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.6);
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
    `;

    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = rect.left + rect.width / 2 - size / 2 + 'px';
    ripple.style.top = rect.top + rect.height / 2 - size / 2 + 'px';

    element.appendChild(ripple);

    setTimeout(() => {
      ripple.style.transform = 'scale(4)';
      ripple.style.opacity = '0';
    }, 10);

    setTimeout(() => {
      if (element.contains(ripple)) {
        element.removeChild(ripple);
      }
    }, 600);
  }

  listenForSystemTheme() {
    // Listen for system theme changes
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      darkModeQuery.addListener((e) => {
        // Only auto-switch if user hasn't manually set preference
        if (!localStorage.getItem('spendly-theme-manual')) {
          const systemPrefersDark = e.matches;
          if (systemPrefersDark !== this.isDarkMode) {
            this.isDarkMode = systemPrefersDark;
            this.applyTheme();
            this.updateToggleButton();
          }
        }
      });

      // Initial check
      const systemPrefersDark = darkModeQuery.matches;
      if (!localStorage.getItem('spendly-theme-manual') && systemPrefersDark !== this.isDarkMode) {
        this.isDarkMode = systemPrefersDark;
        this.applyTheme();
        this.updateToggleButton();
      }
    }
  }

  addKeyboardShortcut() {
    // Add keyboard shortcut (Ctrl/Cmd + Shift + D)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleTheme();
        this.showNotification('Theme toggled');
      }
    });
  }

  showNotification(message) {
    // Create a modern notification
    const notification = document.createElement('div');
    notification.className = 'theme-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">🎨</span>
        <span class="notification-text">${message}</span>
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${this.isDarkMode ? '#374151' : '#ffffff'};
      color: ${this.isDarkMode ? '#ffffff' : '#1a1a2a'};
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideIn 0.3s ease-out;
      backdrop-filter: blur(10px);
      border: 1px solid ${this.isDarkMode ? '#4b5563' : '#e5e7eb'};
    `;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Add CSS styles for dark mode
const darkModeStyles = `
  .dark-mode-toggle {
    animation: fadeIn 0.5s ease-out;
  }

  .dark-mode-toggle:hover {
    transform: scale(1.05) translateY(-2px);
  }

  .toggle-icon {
    font-size: 18px;
    transition: transform 0.3s ease;
  }

  .toggle-label {
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .theme-transition-overlay {
    backdrop-filter: blur(2px);
  }

  .ripple-effect {
    animation: ripple 0.6s ease-out;
  }

  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }

  .theme-notification {
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
  }

  .notification-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .notification-icon {
    font-size: 16px;
  }

  .notification-text {
    font-weight: 500;
  }

  /* Dark mode specific styles */
  .dark-mode {
    color-scheme: dark;
  }

  .dark-mode .card-modern {
    background: rgba(0, 0, 0, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .dark-mode .button-modern {
    background: linear-gradient(135deg, #4c1d95 0%, #1a1a2e 100%);
  }

  .dark-mode .input-modern {
    background: rgba(0, 0, 0, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
  }

  .dark-mode .table-modern {
    background: rgba(0, 0, 0, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .dark-mode .nav-modern {
    background: rgba(0, 0, 0, 0.95);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = darkModeStyles;
document.head.appendChild(styleSheet);

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  new DarkModeManager();
});

// Export for potential external use
window.DarkModeManager = DarkModeManager;
window.toggleDarkMode = () => {
  if (window.darkModeManager) {
    window.darkModeManager.toggleTheme();
  }
};
