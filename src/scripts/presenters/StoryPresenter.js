export class StoryPresenter {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.currentPage = 1;
    this.setupEventListeners();
    this.checkAuth();
    
    // Periksa dukungan View Transition API
    this.supportsViewTransition = !!document.startViewTransition;
    this.transitionDirection = 'forward'; // Tambahkan ini
    this.previousHash = '/'; // Tambahkan ini untuk tracking navigasi
  }

  setupEventListeners() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }

  checkAuth() {
    const token = localStorage.getItem('token');
    
    // Perbaikan arsitektur MVP: memindahkan manipulasi DOM ke View
    if (token) {
      this.view.updateAuthUI(true);
      // Setup notifications after rendering the button
      this.setupNotifications();
    } else {
      this.view.updateAuthUI(false);
    }

    // Setup logout event handler
    this.view.setupLogoutHandler(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.checkAuth();
      this.navigateWithTransition('/login');
    });
  }

  // Metode baru untuk navigasi dengan transisi
  navigateWithTransition(path, direction = 'forward') {
    this.transitionDirection = direction;
    
    if (this.supportsViewTransition) {
      // Set CSS class untuk arah transisi
      document.documentElement.setAttribute('data-transition-direction', direction);
      
      document.startViewTransition(() => {
        window.location.hash = path;
      }).finished.then(() => {
        // Cleanup setelah transisi selesai
        document.documentElement.removeAttribute('data-transition-direction');
      }).catch(() => {
        // Fallback jika transisi gagal
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
    
    // Tentukan arah transisi berdasarkan navigasi
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

  // TAMBAHKAN METODE INI DI SINI (setelah handleRoute, sebelum renderPage)
  isBackNavigation(currentHash) {
    const previousHash = this.previousHash || '/';
    this.previousHash = currentHash;
    
    // Logic untuk mendeteksi navigasi mundur
    if (currentHash === '/' && previousHash.startsWith('/story/')) {
      return true;
    }
    if (currentHash === '/' && ['/add', '/login', '/register'].includes(previousHash)) {
      return true;
    }
    return false;
  }

  // Metode baru untuk memisahkan rendering halaman
  

  // Metode baru untuk memisahkan rendering halaman
  async renderPage(hash) {
    switch (hash) {
      case '/':
        await this.renderStories(); // Ubah dari this.showStories()
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
      default:
        if (hash.startsWith('/story/')) {
          const storyId = hash.split('/')[2];
          await this.renderStoryDetail(storyId); // Ubah dari this.showStoryDetail(storyId)
        } else {
          this.view.showError('Halaman tidak ditemukan');
        }
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
        
        // Simpan ke IndexedDB untuk penggunaan offline 
        await this.model.saveStoriesToIndexedDB(stories); 
      } catch (error) { 
        console.log('Gagal mengambil dari API, mencoba IndexedDB'); 
        // Jika gagal, ambil dari IndexedDB 
        stories = await this.model.getStoriesFromIndexedDB(); 
      } 
      
      if (stories.length > 0) { 
        this.view.renderStories(stories); 
        // Inisialisasi peta untuk menampilkan lokasi cerita 
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
        
        // Simpan ke IndexedDB 
        await this.model.saveStoryToIndexedDB(story); 
      } catch (error) { 
        console.log('Gagal mengambil detail dari API, mencoba IndexedDB'); 
        // Jika gagal, ambil dari IndexedDB 
        story = await this.model.getStoryById(id); 
      } 
      
      if (story) { 
        this.view.renderStoryDetail(story); 
        // Inisialisasi peta untuk detail cerita jika memiliki lokasi 
        if (story.lat && story.lon) { 
          // Gunakan setTimeout untuk memastikan DOM sudah siap 
          setTimeout(() => { 
            this.view.initializeStoryDetailMap(story); 
          }, 300); // Tambah waktu tunggu menjadi 300ms 
        } 
      } else { 
        this.view.showError('Cerita tidak ditemukan'); 
      } 
    } catch (error) { 
      console.error('Error rendering story detail:', error); 
      this.view.showError('Gagal memuat detail cerita'); 
    } 
  }
    // Tambahkan method untuk menghapus cerita 
    async deleteStory(id) { 
      try { 
        // Hapus dari API 
        await this.model.deleteStory(id); 
        
        // Hapus juga dari IndexedDB 
        await this.model.deleteStoryFromIndexedDB(id); 
        
        // Refresh tampilan 
        this.renderStories(); 
        
        return true; 
      } catch (error) { 
        console.error('Error deleting story:', error); 
        this.view.showError('Gagal menghapus cerita'); 
        return false; 
      } 
    }
  setupAddStoryForm() {
    // Inisialisasi peta untuk form tambah cerita
    this.view.initializeFormMap();
    
    // Setup event handlers untuk form
    this.view.setupAddStoryFormHandlers({
      onPhotoChange: (file) => {
        if (file.size > 1000000) { // 1MB limit
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
        // Validasi input
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
        // Verify subscription is still valid
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
        // Register service worker
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/'
        });
        console.log('Service Worker registered successfully:', registration);

        const notificationButton = document.getElementById('notificationButton');
        if (!notificationButton) {
          console.error('Notification button not found in DOM');
          return;
        }
        
        console.log('Found notification button:', notificationButton);
        
        // Check and refresh subscription status
        await this.checkAndRefreshSubscription(registration);
        
        // Add click listener to the button
        this.view.setupNotificationButtonHandler(async () => {
          console.log('Notification button clicked');
          try {
            const subscription = await registration.pushManager.getSubscription();
            console.log('Current subscription on button click:', subscription);
            
            if (subscription) {
              // Unsubscribe
              console.log('Attempting to unsubscribe...');
              await this.model.unsubscribeNotification(subscription.endpoint);
              await subscription.unsubscribe();
              this.view.updateNotificationButton(false);
              console.log('Successfully unsubscribed from notifications.');
            } else {
              // Subscribe
              console.log('Attempting to subscribe...');
              
              // Request notification permission first
              const permission = await Notification.requestPermission();
              console.log('Notification permission status:', permission);
              
              if (permission === 'granted') {
                try {
                  console.log('User allowed notifications, attempting to subscribe...');
                  // Convert VAPID key to Uint8Array
                  const vapidKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
                  const vapidKeyArray = this.urlBase64ToUint8Array(vapidKey);
                  console.log('VAPID key converted successfully');

                  const newSubscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: vapidKeyArray
                  });
                  
                  console.log('New subscription created:', newSubscription);

                  // Extract keys
                  const p256dhBuffer = newSubscription.getKey('p256dh');
                  const authBuffer = newSubscription.getKey('auth');

                  if (!p256dhBuffer || !authBuffer) {
                    console.error('Missing subscription keys:', { p256dh: !!p256dhBuffer, auth: !!authBuffer });
                    this.view.showError('Gagal mendapatkan kunci langganan notifikasi dari browser.');
                    return;
                  }

                  // Convert ArrayBuffer to base64 string
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

  // Helper function to convert VAPID key
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
}