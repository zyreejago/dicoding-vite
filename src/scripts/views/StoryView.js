class StoryView {
  
  constructor() {
    this.mainContent = document.querySelector('#mainContent');
    this.skipLink = document.querySelector('.skip-link');
    this.setupSkipLink();
    this.maps = {};
    this.cameraStream = null;
  }
  // Tambahkan method untuk menampilkan tombol offline management
renderOfflineDataManager() {
  const offlineSection = document.createElement('div');
  offlineSection.className = 'offline-manager';
  offlineSection.innerHTML = `
    <h3>Pengelolaan Data Offline</h3>
    <div class="offline-actions">
      <button id="syncButton" class="offline-button">Sinkronisasi Data</button>
      <button id="clearOfflineButton" class="offline-button danger">Hapus Data Offline</button>
    </div>
    <div id="offlineStatus" class="offline-status"></div>
  `;
  
  this.mainContent.appendChild(offlineSection);
}

// Tambahkan method untuk setup handler
setupOfflineManagerHandlers({ onSync, onClear }) {
  const syncButton = document.getElementById('syncButton');
  const clearButton = document.getElementById('clearOfflineButton');
  
  if (syncButton) {
    syncButton.addEventListener('click', async () => {
      if (onSync) await onSync();
    });
  }
  
  if (clearButton) {
    clearButton.addEventListener('click', async () => {
      if (confirm('Apakah Anda yakin ingin menghapus semua data offline?')) {
        if (onClear) await onClear();
      }
    });
  }
}

// Tambahkan method untuk update status
updateOfflineStatus(message, isError = false) {
  const statusElement = document.getElementById('offlineStatus');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `offline-status ${isError ? 'error' : 'success'}`;
  }
}

  setupSkipLink() {
    this.skipLink.addEventListener('click', (event) => {
      event.preventDefault();
      document.querySelector('#mainContent').focus();
    });
  }
  // Tambahkan metode baru ini setelah setupSkipLink()
applyViewTransitionNames() {
  // Set transition name untuk story cards
  const storyCards = document.querySelectorAll('.story-card');
  storyCards.forEach((card, index) => {
    card.style.viewTransitionName = `story-card-${index}`;
  });

  // Set transition name untuk form containers
  const formContainer = document.querySelector('.form-container');
  if (formContainer) {
    formContainer.style.viewTransitionName = 'form-container';
  }

  // Set transition name untuk story detail
  const storyDetail = document.querySelector('.story-detail');
  if (storyDetail) {
    storyDetail.style.viewTransitionName = 'story-detail';
  }

  // Set transition name untuk stories container
  const storiesContainer = document.querySelector('.stories-container');
  if (storiesContainer) {
    storiesContainer.style.viewTransitionName = 'stories-container';
  }
}

  showLoading() {
    this.mainContent.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Memuat cerita...</p>
      </div>
    `;
  }

  showError(message) {
    this.mainContent.innerHTML = `
      <div class="error-container">
        <p class="error-message">${message}</p>
        <button class="back-button" onclick="window.history.back()">Kembali</button>
      </div>
    `;
  }

  updateAuthUI(isLoggedIn) {
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const logoutButton = document.getElementById('logoutButton');
    const addStoryLink = document.querySelector('a[href="#/add"]');

    if (isLoggedIn) {
      loginLink.style.display = 'none';
      registerLink.style.display = 'none';
      logoutButton.style.display = 'block';
      addStoryLink.style.display = 'block';
      this.renderNotificationButton();
    } else {
      loginLink.style.display = 'block';
      registerLink.style.display = 'block';
      logoutButton.style.display = 'none';
      addStoryLink.style.display = 'none';
    }
  }

  renderStories(stories) {
    this.mainContent.innerHTML = `
      <div class="stories-container">
        <h2>Daftar Cerita</h2>
        <div id="storiesMap" class="map-container"></div>
        <div class="stories-grid">
          ${stories.map(story => this.createStoryCard(story)).join('')}
        </div>
      </div>
    `;
  
    // Apply transition names setelah render
    setTimeout(() => this.applyViewTransitionNames(), 0);
  
    const storyCards = this.mainContent.querySelectorAll('.story-card');
    storyCards.forEach(card => {
      card.addEventListener('click', () => {
        const storyId = card.dataset.id;
        // Store clicked card untuk smooth transition
        sessionStorage.setItem('selectedStoryCard', card.style.viewTransitionName);
        window.location.hash = `/story/${storyId}`;
      });
    });
  
    // Event listener untuk tombol simpan story
    const saveButtons = this.mainContent.querySelectorAll('.save-story-btn');
    saveButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation();
        const storyId = button.dataset.storyId;
        const story = stories.find(s => s.id === storyId);
        
        if (story) {
          // Panggil method untuk menyimpan story
          if (this.presenter && this.presenter.saveStoryToIndexedDB) {
            const success = await this.presenter.saveStoryToIndexedDB(story);
            if (success) {
              button.innerHTML = '<i class="fas fa-check"></i> Tersimpan';
              button.disabled = true;
              button.classList.add('saved');
            } else {
              alert('Gagal menyimpan story');
            }
          }
        }
      });
    });
  }

  createStoryCard(story) {
    return `
      <article class="story-card" data-id="${story.id}">
        <img src="${story.photoUrl}" alt="${story.description}" class="story-image">
        <div class="story-content">
          <h3>${story.name}</h3>
          <p>${story.description}</p>
          <p class="story-date">${new Date(story.createdAt).toLocaleDateString('id-ID')}</p>
          ${story.lat && story.lon ? `
            <div class="story-location">
              <span class="location-icon">📍</span>
              <span>Lokasi: ${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}</span>
            </div>
          ` : ''}
          <div class="story-actions">
            <button class="save-story-btn" data-story-id="${story.id}" onclick="event.stopPropagation()">
              <i class="fas fa-save"></i> Simpan Story
            </button>
          </div>
        </div>
      </article>
    `;
  }

  initializeStoriesMap(stories) {
    const mapContainer = document.getElementById('storiesMap');
    if (!mapContainer) return;

    const map = L.map('storiesMap').setView([-2.5489, 118.0149], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    this.maps.storiesMap = map;

    const markers = [];
    stories.forEach(story => {
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon])
          .addTo(map)
          .bindPopup(`
            <div class="map-popup">
              <h4>${story.name}</h4>
              <p>${story.description.substring(0, 50)}${story.description.length > 50 ? '...' : ''}</p>
              <a href="#/story/${story.id}">Lihat detail</a>
            </div>
          `);
        markers.push(marker);
      }
    });

    if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  initializeStoryDetailMap(story) {
    if (!story.lat || !story.lon) {
      console.log('Story tidak memiliki data lokasi');
      return;
    }

    setTimeout(() => {
      let mapContainer = document.getElementById('storyDetailMap');
      console.log('Map container ditemukan:', mapContainer);
      
      if (!mapContainer) {
        console.log('Container peta tidak ditemukan');
        return;
      }
      
      console.log('Container dimensions:', mapContainer.offsetWidth, mapContainer.offsetHeight);
      
      if (!window.L) {
        console.error('Leaflet library tidak tersedia');
        return;
      }
      
      try {
        mapContainer.style.height = '300px';
        mapContainer.style.width = '100%';
        mapContainer.style.position = 'relative';
        mapContainer.style.zIndex = '1';
        
        const map = L.map('storyDetailMap').setView([story.lat, story.lon], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        this.maps.storyDetailMap = map;

        L.marker([story.lat, story.lon])
          .addTo(map)
          .bindPopup(`
            <div class="map-popup">
              <h4>${story.name}</h4>
              <p>${story.description.substring(0, 50)}${story.description.length > 50 ? '...' : ''}</p>
            </div>
          `)
          .openPopup();
          
        setTimeout(() => {
          map.invalidateSize();
          console.log('Map invalidateSize dipanggil');
        }, 100);
      } catch (error) {
        console.error('Error saat inisialisasi peta:', error);
      }
    }, 300);
  }

  initializeFormMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    const map = L.map('map').setView([-6.2088, 106.8456], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    this.maps.formMap = map;
    this.formMapMarker = null;

    // Handle map click untuk mendapatkan koordinat
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      document.getElementById('lat').value = lat;
      document.getElementById('lon').value = lng;
      document.getElementById('locationDisplay').textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;

      if (this.formMapMarker) {
        this.formMapMarker.setLatLng([lat, lng]);
      } else {
        this.formMapMarker = L.marker([lat, lng]).addTo(map);
      }
    });

    // Tombol untuk mendapatkan lokasi saat ini - PERBAIKAN
    const getCurrentLocationBtn = document.getElementById('getCurrentLocation');
    if (getCurrentLocationBtn) {
      getCurrentLocationBtn.addEventListener('click', () => {
        this.getCurrentLocation(map);
      });
    }
  }

  // Fungsi baru untuk menangani geolocation dengan error handling yang lebih baik
  getCurrentLocation(map) {
    const getCurrentLocationBtn = document.getElementById('getCurrentLocation');
    const locationDisplay = document.getElementById('locationDisplay');
    
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung oleh browser ini.');
      return;
    }

    // Update UI
    getCurrentLocationBtn.disabled = true;
    getCurrentLocationBtn.textContent = 'Mendapatkan lokasi...';
    locationDisplay.textContent = 'Sedang mencari lokasi...';

    // Options untuk geolocation dengan akurasi tinggi
    const options = {
      enableHighAccuracy: true,
      timeout: 30000, // 30 detik timeout (lebih lama)
      maximumAge: 0 // Selalu minta posisi baru
    };

    // Coba reset izin geolocation dengan meminta ulang
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(permissionStatus => {
          console.log('Status izin geolocation:', permissionStatus.state);
          
          // Tambahkan listener untuk perubahan status izin
          permissionStatus.onchange = () => {
            console.log('Izin geolocation berubah:', permissionStatus.state);
          };
        });
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        console.log('Lokasi berhasil didapatkan:', lat, lng, 'akurasi:', accuracy);
        
        // Update peta dan form
        map.setView([lat, lng], 15);
        document.getElementById('lat').value = lat;
        document.getElementById('lon').value = lng;
        
        // Update display dengan info akurasi
        locationDisplay.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)} (±${Math.round(accuracy)}m)`;
        
        // Update marker
        if (this.formMapMarker) {
          this.formMapMarker.setLatLng([lat, lng]);
        } else {
          this.formMapMarker = L.marker([lat, lng]).addTo(map);
        }
        
        // Reset button
        getCurrentLocationBtn.disabled = false;
        getCurrentLocationBtn.textContent = '📍 Lokasi Saya';
        
        // Show success message
        this.showLocationSuccess();
      },
      (error) => {
        console.error('Geolocation error:', error.code, error.message);
        
        let errorMessage = '';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Izin lokasi ditolak. Silakan aktifkan izin lokasi di pengaturan browser dan refresh halaman.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informasi lokasi tidak tersedia. Pastikan GPS aktif dan Anda berada di area dengan sinyal yang baik.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Waktu habis saat mencari lokasi. Coba lagi atau pilih lokasi secara manual di peta.';
            break;
          default:
            errorMessage = 'Terjadi kesalahan saat mendapatkan lokasi. Silakan coba lagi.';
            break;
        }
        
        // Update UI
        locationDisplay.textContent = 'Gagal mendapatkan lokasi - klik pada peta untuk memilih lokasi';
        getCurrentLocationBtn.disabled = false;
        getCurrentLocationBtn.textContent = '📍 Coba Lagi';
        
        // Show detailed error
        this.showLocationError(errorMessage);
      },
      options
    );
  }

  // Fungsi untuk menampilkan pesan sukses
  showLocationSuccess() {
    const successDiv = document.createElement('div');
    successDiv.className = 'location-success';
    successDiv.innerHTML = '✅ Lokasi berhasil didapatkan!';
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 1000;
      font-size: 14px;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 3000);
  }

  // Fungsi untuk menampilkan pesan error yang lebih informatif
  showLocationError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'location-error';
    errorDiv.innerHTML = `
      <div style="margin-bottom: 10px;">❌ ${message}</div>
      <div style="font-size: 12px; opacity: 0.8;">
        Tips:
        <ul style="margin: 5px 0; padding-left: 15px;">
          <li>Pastikan GPS/Location Services aktif di perangkat</li>
          <li>Berikan izin lokasi saat browser meminta</li>
          <li>Coba refresh halaman dan izinkan akses lokasi</li>
          <li>Atau pilih lokasi secara manual dengan klik pada peta</li>
        </ul>
      </div>
    `;
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 1000;
      font-size: 14px;
      max-width: 300px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 5px;
      right: 10px;
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
    `;
    closeBtn.onclick = () => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    };
    
    errorDiv.appendChild(closeBtn);
    document.body.appendChild(errorDiv);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 10000);
  }

  renderAddStoryForm() {
    this.mainContent.innerHTML = `
      <div class="add-story-container">
        <h2>Tambah Cerita Baru</h2>
        <div class="story-type-toggle">
          <button class="toggle-button active" data-type="user">Sebagai User</button>
          <button class="toggle-button" data-type="guest">Sebagai Tamu</button>
        </div>
        <form id="addStoryForm" class="add-story-form">
          <div class="form-group">
            <label for="description">Deskripsi</label>
            <textarea id="description" name="description" required placeholder="Ceritakan pengalaman Anda..."></textarea>
          </div>
          
          <div class="form-group">
            <label>Foto</label>
            <div class="photo-input-container">
              <div class="photo-input-buttons">
                <button type="button" id="cameraButton" class="camera-button">
                  📷 Ambil dengan Kamera
                </button>
                <button type="button" id="fileButton" class="file-button">
                  📁 Pilih dari File
                </button>
              </div>
              <input type="file" id="photo" name="photo" accept="image/*" style="display: none;">
            </div>
            
            <!-- Camera Preview Container -->
            <div id="cameraContainer" class="camera-container" style="display: none;">
              <video id="cameraPreview" class="camera-preview" autoplay playsinline></video>
              <div class="camera-controls">
                <button type="button" id="captureButton" class="capture-button">📸 Ambil Foto</button>
                <button type="button" id="closeCameraButton" class="close-camera-button">❌ Tutup Kamera</button>
              </div>
            </div>
            
            <!-- Photo Preview -->
            <div id="photoPreview" class="photo-preview"></div>
          </div>

          <div class="form-group">
            <label>Lokasi</label>
            <div class="location-controls">
              <button type="button" id="getCurrentLocation" class="location-button">
                📍 Lokasi Saya
              </button>
              <button type="button" id="resetLocationPermission" class="location-button">
                🔄 Reset Izin Lokasi
              </button>
              <span id="locationDisplay" class="location-display">Klik pada peta atau gunakan lokasi saat ini</span>
            </div>
            <p class="location-instruction">Klik pada peta untuk menentukan lokasi cerita Anda</p>
            <div id="map" class="map-container"></div>
            <input type="hidden" id="lat" name="lat">
            <input type="hidden" id="lon" name="lon">
          </div>

          <button type="submit" class="submit-button">Tambah Cerita</button>
        </form>
      </div>
    `;
  }

  setupAddStoryFormHandlers({ onPhotoChange, onSubmit }) {
    const form = document.getElementById('addStoryForm');
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photoPreview');
    const toggleButtons = document.querySelectorAll('.toggle-button');
    const cameraButton = document.getElementById('cameraButton');
    const fileButton = document.getElementById('fileButton');
    const cameraContainer = document.getElementById('cameraContainer');
    const cameraPreview = document.getElementById('cameraPreview');
    const captureButton = document.getElementById('captureButton');
    const closeCameraButton = document.getElementById('closeCameraButton');
    
    let isGuestMode = false;
    let currentPhotoFile = null;

    // Handle file button click
    fileButton.addEventListener('click', () => {
      photoInput.click();
    });
    const resetLocationPermissionBtn = document.getElementById('resetLocationPermission');
    if (resetLocationPermissionBtn) {
      resetLocationPermissionBtn.addEventListener('click', () => {
        this.resetLocationPermission();
      });
    }
    

    // Handle camera button click
    cameraButton.addEventListener('click', async () => {
      try {
        // Stop existing stream if any
        if (this.cameraStream) {
          this.cameraStream.getTracks().forEach(track => track.stop());
        }

        // Request camera access
        this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment' // Use back camera if available
          } 
        });
        
        cameraPreview.srcObject = this.cameraStream;
        cameraContainer.style.display = 'block';
        
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
      }
    });

    
    // Handle capture button click
    captureButton.addEventListener('click', () => {
      const canvas = document.createElement('canvas');
      canvas.width = cameraPreview.videoWidth;
      canvas.height = cameraPreview.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        // Create file from blob
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        currentPhotoFile = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (event) => {
          photoPreview.innerHTML = `
            <img src="${event.target.result}" alt="Preview" class="preview-image">
            <p class="preview-info">Foto dari kamera (${(file.size / 1024).toFixed(1)} KB)</p>
          `;
        };
        reader.readAsDataURL(file);
        
        // Close camera
        this.closeCameraStream();
        cameraContainer.style.display = 'none';
        
        if (onPhotoChange) onPhotoChange(file);
      }, 'image/jpeg', 0.8);
    });

    // Handle close camera button
    closeCameraButton.addEventListener('click', () => {
      this.closeCameraStream();
      cameraContainer.style.display = 'none';
    });

    // Handle photo file input change
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      currentPhotoFile = file;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        photoPreview.innerHTML = `
          <img src="${event.target.result}" alt="Preview" class="preview-image">
          <p class="preview-info">Foto dari file (${(file.size / 1024).toFixed(1)} KB)</p>
        `;
      };
      reader.readAsDataURL(file);
      
      if (onPhotoChange) onPhotoChange(file);
    });

    // Handle form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Validate required fields
      const description = document.getElementById('description').value.trim();
      const lat = document.getElementById('lat').value;
      const lon = document.getElementById('lon').value;
      
      if (!description) {
        alert('Deskripsi harus diisi!');
        return;
      }
      
      if (!currentPhotoFile) {
        alert('Foto harus dipilih!');
        return;
      }
      
      if (!lat || !lon) {
        alert('Lokasi harus dipilih! Klik pada peta atau gunakan tombol "Lokasi Saya".');
        return;
      }
      
      // Create FormData
      const formData = new FormData();
      formData.append('description', description);
      formData.append('photo', currentPhotoFile);
      formData.append('lat', lat);
      formData.append('lon', lon);
      
      if (onSubmit) onSubmit(formData, isGuestMode);
    });

    // Handle toggle buttons
    toggleButtons.forEach(button => {
      button.addEventListener('click', () => {
        toggleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        isGuestMode = button.dataset.type === 'guest';
      });
    });
  }

  closeCameraStream() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
  }
  resetLocationPermission() {
    // Tampilkan instruksi untuk reset izin lokasi
    const instructionsDiv = document.createElement('div');
    instructionsDiv.className = 'location-instructions';
    instructionsDiv.innerHTML = `
      <div style="text-align: left; padding: 15px;">
        <h3>Cara Reset Izin Lokasi:</h3>
        <ol style="padding-left: 20px;">
          <li>Klik ikon kunci/info di address bar browser</li>
          <li>Pilih "Izin Situs" atau "Site Settings"</li>
          <li>Cari pengaturan "Lokasi" dan ubah ke "Izinkan"</li>
          <li>Refresh halaman ini</li>
        </ol>
        <p>Atau buka pengaturan browser:</p>
        <ul style="padding-left: 20px;">
          <li>Chrome: chrome://settings/content/location</li>
          <li>Safari: Preferensi > Privasi > Layanan Lokasi</li>
          <li>Firefox: about:preferences#privacy > Izin > Lokasi</li>
        </ul>
        <button id="closeInstructions" style="margin-top: 10px; padding: 5px 10px;">Tutup</button>
      </div>
    `;
    instructionsDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      z-index: 1000;
      max-width: 90%;
      width: 400px;
    `;
    
    document.body.appendChild(instructionsDiv);
    
    document.getElementById('closeInstructions').addEventListener('click', () => {
      document.body.removeChild(instructionsDiv);
    });
  }

  renderLoginForm() {
    this.mainContent.innerHTML = `
      <div class="auth-container">
        <h2>Masuk</h2>
        <form id="loginForm" class="auth-form">
          <div class="form-group">
            <label for="loginEmail">Email</label>
            <input type="email" id="loginEmail" name="email" required>
          </div>
  
          <div class="form-group">
            <label for="loginPassword">Password</label>
            <input type="password" id="loginPassword" name="password" required>
          </div>
  
          <div class="error-message"></div>
  
          <button type="submit" class="submit-button">Masuk</button>
        </form>
      </div>
    `;
  }

  setupLogoutHandler(onLogout) {
    const logoutBtn = document.querySelector('#logoutButton');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (onLogout) onLogout();
      });
    }
  }

renderRegisterForm() {
  this.mainContent.innerHTML = `
    <div class="auth-container">
      <h2>Daftar Akun Baru</h2>
      <form id="registerForm" class="auth-form">
        <div class="form-group">
          <label for="registerName">Nama</label>
          <input type="text" id="registerName" name="name" required>
        </div>
        <div class="form-group">
          <label for="registerEmail">Email</label>
          <input type="email" id="registerEmail" name="email" required>
        </div>
        <div class="form-group">
          <label for="registerPassword">Password</label>
          <input type="password" id="registerPassword" name="password" required>
          <small>Password minimal 8 karakter</small>
        </div>
        
        <div class="error-message"></div>
        
        <button type="submit" class="submit-button">Daftar</button>
      </form>
      <p class="auth-link">Sudah punya akun? <a href="#/login">Masuk di sini</a></p>
    </div>
  `;
  setTimeout(() => this.applyViewTransitionNames(), 0);
}

setupLoginFormHandler(onSubmit) {
  const form = document.querySelector('#loginForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.querySelector('#loginEmail').value;
      const password = document.querySelector('#loginPassword').value;
      if (onSubmit) await onSubmit(email, password);
    });
  }
}

setupRegisterFormHandler(onSubmit) {
  const form = document.querySelector('#registerForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.querySelector('#registerName').value;
      const email = document.querySelector('#registerEmail').value;
      const password = document.querySelector('#registerPassword').value;
      if (onSubmit) await onSubmit(name, email, password);
    });
  }
}

setupNotificationButtonHandler(onToggle) {
  const button = document.querySelector('#notificationButton');
  if (button) {
    // Hapus event listener yang ada sebelum menambahkan yang baru
    const existingHandler = button._notificationHandler;
    if (existingHandler) {
      button.removeEventListener('click', existingHandler);
    }
    
    // Buat handler baru dan simpan referensinya
    const newHandler = async (e) => {
      e.preventDefault();
      if (onToggle) await onToggle();
    };
    
    button._notificationHandler = newHandler;
    button.addEventListener('click', newHandler);
  }
}


  

renderStoryDetail(story) {
  this.mainContent.innerHTML = `
    <div class="story-detail-container">
      <div class="story-detail" style="view-transition-name: story-detail">
        <img src="${story.photoUrl}" alt="${story.description}" class="story-detail-image">
        <div class="story-detail-content">
          <h2>${story.name}</h2>
          <p class="story-description">${story.description}</p>
          <p class="story-date">Dibuat pada: ${new Date(story.createdAt).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</p>
          ${story.lat && story.lon ? `
            <div class="story-detail-location">
              <h3>Lokasi</h3>
              <p>Koordinat: ${story.lat.toFixed(6)}, ${story.lon.toFixed(6)}</p>
              <div id="storyDetailMap" class="map-container"></div>
            </div>
          ` : ''}
        </div>
      </div>
      <button class="back-button" onclick="window.history.back()">← Kembali ke Daftar Cerita</button>
    </div>
  `;

  // Apply transition names
  setTimeout(() => this.applyViewTransitionNames(), 0);
}

  renderNotificationButton() {
    const navMenu = document.querySelector('.nav-menu');
    const notificationButton = document.createElement('button');
    notificationButton.id = 'notificationButton';
    notificationButton.className = 'nav-button';
    notificationButton.innerHTML = `
      <i class="fas fa-bell"></i>
      <span>Aktifkan Notifikasi</span>
    `;
    navMenu.insertBefore(notificationButton, navMenu.lastElementChild);
  }

  updateNotificationButton(isSubscribed) {
    console.log('Updating notification button state:', isSubscribed);
    const button = document.getElementById('notificationButton');
    if (button) {
      button.innerHTML = `
        <i class="fas fa-bell${isSubscribed ? '' : '-slash'}"></i>
        <span>${isSubscribed ? 'Nonaktifkan' : 'Aktifkan'} Notifikasi</span>
      `;
    }
  }

  showNotificationPermissionDialog() {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'notification-dialog';
      dialog.innerHTML = `
        <div class="notification-dialog-content">
          <h3>Aktifkan Notifikasi</h3>
          <p>Dapatkan notifikasi ketika ada cerita baru</p>
          <div class="notification-dialog-buttons">
            <button class="notification-dialog-button allow">Aktifkan</button>
            <button class="notification-dialog-button deny">Nanti</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const allowButton = dialog.querySelector('.allow');
      const denyButton = dialog.querySelector('.deny');

      allowButton.addEventListener('click', () => {
        document.body.removeChild(dialog);
        resolve(true);
      });

      denyButton.addEventListener('click', () => {
        document.body.removeChild(dialog);
        resolve(false);
      });
    });
  }

  checkLeafletAvailability() {
    if (typeof L === 'undefined') {
      console.error('Leaflet library tidak tersedia!');
      const leafletScript = document.createElement('script');
      leafletScript.src = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js';
      document.head.appendChild(leafletScript);
      
      const leafletCSS = document.createElement('link');
      leafletCSS.rel = 'stylesheet';
      leafletCSS.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
      document.head.appendChild(leafletCSS);
      
      return false;
    }
    return true;
  }
}

export { StoryView };