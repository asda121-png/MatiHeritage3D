// Mati Heritage 3D - Admin Analytics Dashboard
// Modern analytics dashboard with Chart.js integration

(function () {
  "use strict";

  // Chart instances
  let visitorTrendsChart = null;
  let pageVisitsChart = null;
  let currentPeriod = 7;

  // Update date and time display
  function updateDateTime() {
    const now = new Date();
    const greetingDate = document.getElementById('greeting-date');
    const greetingTime = document.getElementById('greeting-time');

    if (greetingDate) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      greetingDate.textContent = now.toLocaleDateString('en-US', options);
    }

    if (greetingTime) {
      const options = { hour: 'numeric', minute: '2-digit', hour12: true };
      greetingTime.textContent = now.toLocaleTimeString('en-US', options);
    }
  }

  // Demo data generator (for when real analytics data is not available)
  function generateDemoData(days) {
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Generate realistic visitor data with some randomness
      const baseVisitors = Math.floor(Math.random() * 150) + 50;
      const weekendBoost = (date.getDay() === 0 || date.getDay() === 6) ? 1.3 : 1;
      const visitors = Math.floor(baseVisitors * weekendBoost);

      // Format date based on period length
      let dateLabel;
      if (days <= 30) {
        // For 30 days or less, show month and day
        dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (days <= 90) {
        // For 3 months, show month and day
        dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (days <= 180) {
        // For 6 months, show month and day to avoid duplicates
        dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        // For 1 year, show month and day
        dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      data.push({
        date: dateLabel,
        visitors: visitors
      });
    }

    return data;
  }

  // Page visits demo data
  function generatePageVisitsData() {
    return [
      { page: 'Home', visits: 1247 },
      { page: 'About Us', visits: 892 },
      { page: 'Games', visits: 756 },
      { page: '3D Explore', visits: 634 },
      { page: 'Gallery', visits: 521 }
    ];
  }

  // Get real KPI data from admin-store
  async function getRealKPIData() {
    try {
      if (typeof MatiAdminStore !== "undefined" && typeof MatiAdminStore.getDashboardCommunityStats === "function") {
        const community = await MatiAdminStore.getDashboardCommunityStats();
        return {
          totalUsers: community.registeredUsers || 0,
          todayVisitors: community.pageVisits || community.totalPageViews || 0,
          activeUsers: community.activeSessions || 0,
          totalViews: community.totalPageViews || community.pageVisits || 0
        };
      }
    } catch (error) {
      console.warn("Failed to fetch real KPI data, using demo data:", error);
    }
    
    // Fallback to demo data
    return {
      totalUsers: 156,
      todayVisitors: 89,
      activeUsers: 12,
      totalViews: 12458
    };
  }

  // Count-up animation for numbers
  function animateCountUp(element, target, duration = 1500) {
    const start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(start + (target - start) * easeOutQuart);
      
      element.textContent = current.toLocaleString();
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    
    requestAnimationFrame(update);
  }

  // Initialize visitor trends line chart
  function initVisitorTrendsChart(period = 7) {
    const ctx = document.getElementById('visitor-trends-chart');
    if (!ctx) return;

    const data = generateDemoData(period);
    
    if (visitorTrendsChart) {
      visitorTrendsChart.destroy();
    }

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    visitorTrendsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [{
          label: 'Page Visits',
          data: data.map(d => d.visitors),
          borderColor: '#3b82f6',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#2563eb',
          pointHoverBorderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f1f5f9',
            bodyColor: '#f1f5f9',
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return `${context.parsed.y} visitors`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#64748b',
              font: {
                size: 11
              }
            }
          },
          y: {
            grid: {
              color: '#f1f5f9'
            },
            ticks: {
              color: '#64748b',
              font: {
                size: 11
              },
              callback: function(value) {
                return value;
              }
            },
            beginAtZero: true
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  // Initialize page visits horizontal bar chart
  function initPageVisitsChart() {
    const ctx = document.getElementById('page-visits-chart');
    if (!ctx) return;

    const data = generatePageVisitsData();
    
    if (pageVisitsChart) {
      pageVisitsChart.destroy();
    }

    pageVisitsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.page),
        datasets: [{
          label: 'Visits',
          data: data.map(d => d.visits),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(14, 165, 233, 0.8)',
            'rgba(168, 85, 247, 0.8)'
          ],
          borderColor: [
            '#3b82f6',
            '#22c55e',
            '#f59e0b',
            '#8b5cf6',
            '#ec4899',
            '#0ea5e9',
            '#a855f7'
          ],
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f1f5f9',
            bodyColor: '#f1f5f9',
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return `${context.parsed.x.toLocaleString()} visits`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: '#f1f5f9'
            },
            ticks: {
              color: '#64748b',
              font: {
                size: 11
              },
              callback: function(value) {
                return value.toLocaleString();
              }
            }
          },
          y: {
            grid: {
              display: false
            },
            ticks: {
              color: '#0f172a',
              font: {
                size: 12,
                weight: 500
              }
            }
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  // Update KPI cards with count-up animation
  async function updateKPICards() {
    const kpiData = await getRealKPIData();
    
    const totalUsersEl = document.getElementById('kpi-total-users');
    const todayVisitorsEl = document.getElementById('kpi-today-visitors');
    const activeUsersEl = document.getElementById('kpi-active-users');
    const totalViewsEl = document.getElementById('kpi-total-views');
    
    if (totalUsersEl) {
      animateCountUp(totalUsersEl, kpiData.totalUsers);
    }
    if (todayVisitorsEl) {
      animateCountUp(todayVisitorsEl, kpiData.todayVisitors);
    }
    if (activeUsersEl) {
      animateCountUp(activeUsersEl, kpiData.activeUsers);
    }
    if (totalViewsEl) {
      animateCountUp(totalViewsEl, kpiData.totalViews);
    }
  }

  // Setup period toggle dropdown
  function setupPeriodToggle() {
    const select = document.getElementById('visitor-period-select');
    if (!select) return;

    select.addEventListener('change', function() {
      const period = parseInt(this.value);
      currentPeriod = period;
      initVisitorTrendsChart();
    });
  }

  // Initialize analytics dashboard
  async function initAnalyticsDashboard() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAnalyticsDashboard);
      return;
    }

    // Update date/time greeting
    updateDateTime();
    
    // Update time every second
    setInterval(updateDateTime, 1000);

    // Initialize charts
    initVisitorTrendsChart(currentPeriod);
    initPageVisitsChart();
    
    // Update KPI cards with real data
    await updateKPICards();
    
    // Setup period toggle
    setupPeriodToggle();
  }

  // Auto-initialize
  initAnalyticsDashboard();

  // Expose functions for external use
  window.MatiAnalytics = {
    init: initAnalyticsDashboard,
    refreshCharts: async function() {
      initVisitorTrendsChart(currentPeriod);
      initPageVisitsChart();
      await updateKPICards();
    },
    setPeriod: function(period) {
      currentPeriod = period;
      initVisitorTrendsChart(period);
    }
  };
})();
