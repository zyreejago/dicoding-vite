import StoryIdb from '../data/database.js';

export class StoryPresenter {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.currentPage = 1;
    this.setupEventListeners();
    this.checkAuth();
    
    // Periksa dukungan View Transition API
    this.supportsViewTransition = !!document.startViewTransition;
    this.transitionDirection = 'forward';
    this.previousHash = '/';
  }

  setupEventListeners() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }

  checkAuth() {
    const token = localStorage.getItem('token');
    
    if (token) {
      this.view.updateAuthUI(true);
      this.setupNotifications();
    } else {
      this.view.updateAuthUI(false);
    }

    this.view.setupLogoutHandler(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.checkAuth();
      this.navigateWithTransition('/login');
    });
  }

  navigateWithTransition(path, direction = 'forward') {
    this.transitionDirection = direction;
    
    if (this.supportsViewTransition) {
      document.documentElement.setAttribute('data-transition-direction', direction);
      
      document.startViewTransition(() => {
        window.location.hash = path;
      }).finished.then(() => {
        document.documentElement.removeAttribute('data-transition-direction');
      }).catch(() => {
        document.documentElement.removeAttribute('data-transition-direction');
      });
    } else {
      window.location.hash = path;
    }
  }

  async handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const token = localStorage.getItem('token');
    
    if (hash === '/' && !token) {
      this.navigateWithTransition('/login');
      return;
    }
    
    const isBackNavigation = this.isBackNavigation(hash);
    this.transitionDirection = isBackNavigation ? 'backward' : 'forward';
    
    if (this.supportsViewTransition) {
      document.documentElement.setAttribute('data-transition-direction', this.transitionDirection);
      
      document.startViewTransition(async () => {
        await this.renderPage(hash);
      }).finished.then(() => {
        document.documentElement.removeAttribute('data-transition-direction');
      }).catch(() => {
        document.documentElement.removeAttribute('data-transition-direction');
      });
    } else {
      await this.renderPage(hash);
    }
  }

  isBackNavigation(currentHash) {
    const previousHash = this.previousHash || '/';
    this.previousHash = currentHash;
    
    if (currentHash === '/' && previousHash.startsWith('/story/')) {
      return true;
    }
    if (currentHash === '/' && ['/add', '/login', '/register'].includes(previousHash)) {
      return true;
    }
    return false;
  }

  async renderPage(hash) {
    switch (hash) {
      case '/':
        await this.renderStories();
        break;
      case '/add':
        this.view.renderAddStoryForm();
        this.setupAddStoryForm();
        break;
      case '/login':
        this.view.renderLoginForm();
        this.setupLoginForm();
        break;
      case '/register':
        this.view.renderRegisterForm();
        this.setupRegisterForm();
        break;
      case '/saved':
        await this.renderSavedStoriesPage();
        break;
      default:
        if (hash.startsWith('/story/')) {
          const storyId = hash.split('/')[2];
          await this.renderStoryDetail(storyId);
        } else {
          this.view.showError('Halaman tidak ditemukan');
        }
    }
  }

  // Method baru untuk menyimpan story individual
  async saveStoryToIndexedDB(story) {
    try {
      const success = await this.model.saveStoryToIndexedDB(story);
      if (success) {
        console.log('Story berhasil disimpan ke IndexedDB');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error menyimpan story ke IndexedDB:', error);
      return false;
    }
  }

  async renderStories() {
    try {
      this.view.showLoading();
      
      let stories = [];
      
      // Coba ambil dari API
      try {
        stories = await this.model.getStories(this.currentPage, 10, 1);
        console.log('Berhasil mengambil cerita dari API');
        
        // HAPUS auto-save ke IndexedDB - biarkan user yang memilih
        // await this.model.saveStoriesToIndexedDB(stories);
      } catch (error) {
        console.log('Gagal mengambil dari API, mencoba IndexedDB');
        stories = await this.model.getStoriesFromIndexedDB();
      }
      
      if (stories.length > 0) {
        this.view.renderStories(stories);
        // Set presenter reference di view untuk tombol simpan
        this.view.presenter = this;
        this.view.initializeStoriesMap(stories);
      } else {
        this.view.showError('Tidak ada cerita yang tersedia');
      }
    } catch (error) {
      console.error('Error rendering stories:', error);
      this.view.showError('Gagal memuat cerita');
    }
  }

  async renderStoryDetail(id) {
    try {
      this.view.showLoading();
      
      let story;
      
      // Coba ambil dari API
      try {
        story = await this.model.getStoryDetail(id);
        console.log('Berhasil mengambil detail cerita dari API');
        
        // Simpan ke IndexedDB hanya untuk detail yang dibuka
        await this.model.saveStoryToIndexedDB(story);
      } catch (error) {
        console.log('Gagal mengambil detail dari API, mencoba IndexedDB');
        story = await this.model.getStoryById(id);
      }
      
      if (story) {
        this.view.renderStoryDetail(story);
        if (story.lat && story.lon) {
          setTimeout(() => {
            this.view.initializeStoryDetailMap(story);
          }, 300);
        }
      } else {
        this.view.showError('Cerita tidak ditemukan');
      }
    } catch (error) {
      console.error('Error rendering story detail:', error);
      this.view.showError('Gagal memuat detail cerita');
    }
  }

  async deleteStory(id) {
    try {
      await this.model.deleteStory(id);
      await this.model.deleteStoryFromIndexedDB(id);
      this.renderStories();
      return true;
    } catch (error) {
      console.error('Error deleting story:', error);
      this.view.showError('Gagal menghapus cerita');
      return false;
    }
  }

  setupAddStoryForm() {
    this.view.initializeFormMap();
    
    this.view.setupAddStoryFormHandlers({
      onPhotoChange: (file) => {
        if (file.size > 1000000) {
          this.view.showError('Ukuran file terlalu besar. Maksimal 1MB');
          return false;
        }
        return true;
      },
      onSubmit: async (formData, isGuestMode) => {
        try {
          if (isGuestMode) {
            await this.model.addStoryGuest(formData);
            this.view.showError('Cerita berhasil ditambahkan sebagai tamu');
            setTimeout(() => {
              this.navigateWithTransition('/');
            }, 2000);
          } else {
            await this.model.addStory(formData);
            this.navigateWithTransition('/');
          }
        } catch (error) {
          this.view.showError(error.message);
        }
      }
    });
  }

  setupLoginForm() {
    this.view.setupLoginFormHandler(async (email, password) => {
      try {
        const result = await this.model.login(email, password);
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result));
        this.checkAuth();
        this.navigateWithTransition('/');
      } catch (error) {
        this.view.showError(error.message);
      }
    });
  }

  setupRegisterForm() {
    this.view.setupRegisterFormHandler(async (name, email, password) => {
      try {
        if (!name || !email || !password) {
          throw new Error('Semua field harus diisi');
        }

        if (password.length < 8) {
          throw new Error('Password minimal 8 karakter');
        }

        if (!email.includes('@') || !email.includes('.')) {
          throw new Error('Format email tidak valid');
        }

        await this.model.register(name, email, password);
        this.navigateWithTransition('/login');
        return { success: true };
      } catch (error) {
        return { success: false, message: error.message };
      }
    });
  }

  async checkAndRefreshSubscription(registration) {
    try {
      const subscription = await registration.pushManager.getSubscription();
      console.log('Checking subscription status:', subscription);
      
      if (subscription) {
        const response = await fetch(`${this.model.baseUrl}/notifications/subscribe`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          console.log('Subscription invalid, refreshing...');
          await subscription.unsubscribe();
          this.view.updateNotificationButton(false);
          return;
        }
        
        this.view.updateNotificationButton(true);
      } else {
        this.view.updateNotificationButton(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      this.view.updateNotificationButton(false);
    }
  }

  async setupNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered successfully:', registration);
  
        const notificationButton = document.getElementById('notificationButton');
        if (!notificationButton) {
          console.error('Notification button not found in DOM');
          return;
        }
        
        console.log('Found notification button:', notificationButton);
        
        await this.checkAndRefreshSubscription(registration);
        
        this.view.setupNotificationButtonHandler(async () => {
          console.log('Notification button clicked');
          try {
            const subscription = await registration.pushManager.getSubscription();
            console.log('Current subscription on button click:', subscription);
            
            if (subscription) {
              console.log('Attempting to unsubscribe...');
              await this.model.unsubscribeNotification(subscription.endpoint);
              await subscription.unsubscribe();
              this.view.updateNotificationButton(false);
              console.log('Successfully unsubscribed from notifications.');
            } else {
              console.log('Attempting to subscribe...');
              
              const permission = await Notification.requestPermission();
              console.log('Notification permission status:', permission);
              
              if (permission === 'granted') {
                try {
                  console.log('User allowed notifications, attempting to subscribe...');
                  const vapidKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
                  const vapidKeyArray = this.urlBase64ToUint8Array(vapidKey);
                  console.log('VAPID key converted successfully');

                  const newSubscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: vapidKeyArray
                  });
                  
                  console.log('New subscription created:', newSubscription);

                  const p256dhBuffer = newSubscription.getKey('p256dh');
                  const authBuffer = newSubscription.getKey('auth');

                  if (!p256dhBuffer || !authBuffer) {
                    console.error('Missing subscription keys:', { p256dh: !!p256dhBuffer, auth: !!authBuffer });
                    this.view.showError('Gagal mendapatkan kunci langganan notifikasi dari browser.');
                    return;
                  }

                  const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(p256dhBuffer)));
                  const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(authBuffer)));

                  const subscriptionDataForApi = {
                    endpoint: newSubscription.endpoint,
                    keys: {
                      p256dh: p256dh,
                      auth: auth
                    }
                  };

                  console.log('Sending subscription data to API:', subscriptionDataForApi);
                  await this.model.subscribeNotification(subscriptionDataForApi);
                  this.view.updateNotificationButton(true);
                  console.log('Successfully subscribed to notifications.');

                } catch (subscribeError) {
                  console.error('Error during subscription:', subscribeError);
                  this.view.showError('Gagal mengaktifkan notifikasi. Pastikan browser mendukung dan coba lagi.');
                }
              } else {
                console.log('User denied notification permission');
                this.view.showError('Izin notifikasi ditolak. Silakan aktifkan notifikasi di pengaturan browser.');
              }
            }
          } catch (error) {
            console.error('Notification button click error:', error);
            this.view.showError(error.message || 'Gagal mengatur notifikasi. Silakan coba lagi nanti.');
          }
        });
        
        console.log('Notification button click listener added');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  urlBase64ToUint8Array(base64String) {
    try {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch (error) {
      console.error('Error decoding base64 string for VAPID key:', base64String, error);
      throw new Error('Gagal mendekode VAPID key. Pastikan key valid.');
    }
  }

  // Method untuk menampilkan halaman saved stories - PINDAHKAN KE DALAM CLASS
  async renderSavedStoriesPage() {
    try {
      const savedStories = await StoryIdb.getStories();
      this.view.renderSavedStoriesPage(savedStories);
      
      // Setup delete handler
      this.view.setupDeleteSavedHandler(async (storyId) => {
        await StoryIdb.deleteStory(storyId);
        this.view.showSuccess('Cerita berhasil dihapus dari data tersimpan');
        // Refresh halaman
        await this.renderSavedStoriesPage();
      });
    } catch (error) {
      this.view.showError('Gagal memuat data tersimpan');
    }
  }
}
