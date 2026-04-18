/**
 * MODERN SLIDING SIDEBAR NAVIGATION
 * Advanced sliding sidebar with smooth animations and interactions
 */

class SlidingSidebar {
  constructor() {
    this.isOpen = false;
    this.sidebar = null;
    this.toggle = null;
    this.overlay = null;
    this.init();
  }

  init() {
    this.createSidebar();
    this.createToggle();
    this.createOverlay();
    this.attachEventListeners();
    this.setupKeyboardShortcuts();
    this.setupTouchGestures();
  }

  createSidebar() {
    // Check if sidebar already exists
    if (document.getElementById('sliding-sidebar')) {
      this.sidebar = document.getElementById('sliding-sidebar');
      return;
    }

    const sidebar = document.createElement('div');
    sidebar.id = 'sliding-sidebar';
    sidebar.className = 'sliding-sidebar';
    sidebar.innerHTML = `
      <!-- Sidebar Header -->
      <div class="sliding-sidebar-header">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">🚀</div>
          <div class="sidebar-logo-text">Spendly</div>
        </div>
        
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">JD</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">John Doe</div>
            <div class="sidebar-user-role">Team Admin</div>
          </div>
        </div>
      </div>

      <!-- Sidebar Navigation -->
      <nav class="sidebar-nav">
        <div class="sidebar-nav-section">
          <div class="sidebar-nav-title">Main</div>
          <ul class="sidebar-nav-list">
            <li class="sidebar-nav-item">
              <a href="/dashboard" class="sidebar-nav-link active">
                <i class="fas fa-home sidebar-nav-icon"></i>
                <span class="sidebar-nav-text">Dashboard</span>
              </a>
            </li>
            <li class="sidebar-nav-item">
              <a href="/expenses" class="sidebar-nav-link">
                <i class="fas fa-receipt sidebar-nav-icon"></i>
                <span class="sidebar-nav-text">Expenses</span>
                <span class="sidebar-nav-badge">3</span>
              </a>
            </li>
            <li class="sidebar-nav-item">
              <a href="/analytics" class="sidebar-nav-link">
                <i class="fas fa-chart-line sidebar-nav-icon"></i>
                <span class="sidebar-nav-text">Analytics</span>
              </a>
            </li>
            <li class="sidebar-nav-item">
              <a href="/recurring" class="sidebar-nav-link">
                <i class="fas fa-sync sidebar-nav-icon"></i>
                <span class="sidebar-nav-text">Recurring</span>
              </a>
            </li>
          </ul>
        </div>

        <div class="sidebar-nav-section">
          <div class="sidebar-nav-title">Team</div>
          <ul class="sidebar-nav-list">
            <li class="sidebar-nav-item">
              <a href="/team" class="sidebar-nav-link">
                <i class="fas fa-users sidebar-nav-icon"></i>
                <span class="sidebar-nav-text">Team Members</span>
                <span class="sidebar-nav-badge">12</span>
              </a>
            </li>
            <li class="sidebar-nav-item">
              <a href="/settings" class="sidebar-nav-link">
                <i class="fas fa-cog sidebar-nav-icon"></i>
                <span class="sidebar-nav-text">Settings</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Quick Actions -->
      <div class="sidebar-quick-actions">
        <div class="sidebar-quick-actions-title">Quick Actions</div>
        <div class="sidebar-quick-actions-grid">
          <a href="/expenses/add" class="sidebar-quick-action">
            <i class="fas fa-plus sidebar-quick-action-icon"></i>
            <div class="sidebar-quick-action-text">Add Expense</div>
          </a>
          <a href="/recurring/add" class="sidebar-quick-action">
            <i class="fas fa-sync sidebar-quick-action-icon"></i>
            <div class="sidebar-quick-action-text">Add Recurring</div>
          </a>
          <a href="/team/invite" class="sidebar-quick-action">
            <i class="fas fa-user-plus sidebar-quick-action-icon"></i>
            <div class="sidebar-quick-action-text">Invite Member</div>
          </a>
          <a href="/export" class="sidebar-quick-action">
            <i class="fas fa-download sidebar-quick-action-icon"></i>
            <div class="sidebar-quick-action-text">Export Data</div>
          </a>
        </div>
      </div>

      <!-- Sidebar Footer -->
      <div class="sidebar-footer">
        <a href="/logout" class="sidebar-footer-button">
          <i class="fas fa-sign-out-alt mr-2"></i>
          Sign Out
        </a>
      </div>
    `;

    document.body.appendChild(sidebar);
    this.sidebar = sidebar;
  }

  createToggle() {
    // Check if toggle already exists
    if (document.getElementById('sidebar-toggle')) {
      this.toggle = document.getElementById('sidebar-toggle');
      return;
    }

    const toggle = document.createElement('button');
    toggle.id = 'sidebar-toggle';
    toggle.className = 'sidebar-toggle';
    toggle.innerHTML = `
      <div class="hamburger-icon">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;

    document.body.appendChild(toggle);
    this.toggle = toggle;
  }

  createOverlay() {
    // Check if overlay already exists
    if (document.getElementById('sidebar-overlay')) {
      this.overlay = document.getElementById('sidebar-overlay');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';

    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  attachEventListeners() {
    // Toggle button click
    if (this.toggle) {
      this.toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleSidebar();
      });
    }

    // Overlay click
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeSidebar();
      });
    }

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeSidebar();
      }
    });

    // Update active navigation item
    this.updateActiveNav();

    // Handle navigation clicks
    this.attachNavigationListeners();
  }

  attachNavigationListeners() {
    const navLinks = document.querySelectorAll('.sidebar-nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // Remove active class from all links
        navLinks.forEach(l => l.classList.remove('active'));
        
        // Add active class to clicked link
        link.classList.add('active');
        
        // Close sidebar on mobile after navigation
        if (window.innerWidth <= 768) {
          setTimeout(() => {
            this.closeSidebar();
          }, 300);
        }
      });
    });
  }

  updateActiveNav() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar-nav-link');
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === currentPath) {
        link.classList.add('active');
      }
    });
  }

  toggleSidebar() {
    if (this.isOpen) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  }

  openSidebar() {
    this.isOpen = true;
    
    if (this.sidebar) {
      this.sidebar.classList.add('active');
    }
    
    if (this.toggle) {
      this.toggle.classList.add('active');
    }
    
    if (this.overlay) {
      this.overlay.classList.add('active');
    }

    // Add body class to prevent scrolling
    document.body.style.overflow = 'hidden';
    
    // Trigger animation for nav items
    this.animateNavItems();
    
    // Focus management
    this.trapFocus();
  }

  closeSidebar() {
    this.isOpen = false;
    
    if (this.sidebar) {
      this.sidebar.classList.remove('active');
    }
    
    if (this.toggle) {
      this.toggle.classList.remove('active');
    }
    
    if (this.overlay) {
      this.overlay.classList.remove('active');
    }

    // Restore body scrolling
    document.body.style.overflow = '';
    
    // Remove focus trap
    this.removeFocusTrap();
  }

  animateNavItems() {
    const navItems = document.querySelectorAll('.sidebar-nav-item');
    navItems.forEach((item, index) => {
      item.style.animation = 'none';
      item.style.opacity = '0';
      item.style.transform = 'translateX(-20px)';
      
      setTimeout(() => {
        item.style.animation = `slideInFromLeft 0.5s ease-out ${index * 0.1}s forwards`;
      }, 50);
    });
  }

  setupKeyboardShortcuts() {
    // Ctrl/Cmd + B to toggle sidebar
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.toggleSidebar();
      }
    });

    // Ctrl/Cmd + K for quick search (if implemented)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Focus search input if exists
        const searchInput = document.querySelector('input[type="search"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    });
  }

  setupTouchGestures() {
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe(touchStartX, touchEndX);
    });
  }

  handleSwipe(startX, endX) {
    const swipeThreshold = 50;
    const diff = startX - endX;

    // Swipe from left edge to open sidebar
    if (startX <= 50 && diff < -swipeThreshold && !this.isOpen) {
      this.openSidebar();
    }
    
    // Swipe right to close sidebar
    if (diff > swipeThreshold && this.isOpen) {
      this.closeSidebar();
    }
  }

  trapFocus() {
    const focusableElements = this.sidebar.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      
      this.sidebar.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      });
    }
  }

  removeFocusTrap() {
    // Remove event listener when sidebar is closed
    if (this.sidebar) {
      this.sidebar.removeEventListener('keydown', this.handleTabKey);
    }
  }

  // Public methods
  isOpenSidebar() {
    return this.isOpen;
  }

  forceClose() {
    this.closeSidebar();
  }

  forceOpen() {
    this.openSidebar();
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.slidingSidebar = new SlidingSidebar();
});

// Export for potential external use
window.SlidingSidebar = SlidingSidebar;
window.toggleSidebar = () => {
  if (window.slidingSidebar) {
    window.slidingSidebar.toggleSidebar();
  }
};

// Handle window resize
window.addEventListener('resize', () => {
  if (window.innerWidth > 768 && window.slidingSidebar && window.slidingSidebar.isOpenSidebar()) {
    window.slidingSidebar.closeSidebar();
  }
});

// Handle page navigation
window.addEventListener('popstate', () => {
  if (window.slidingSidebar) {
    window.slidingSidebar.updateActiveNav();
  }
});
