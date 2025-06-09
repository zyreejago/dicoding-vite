import StoryIdb from '../data/database.js';

export class StoryModel {
  constructor() {
    this.baseUrl = 'https://story-api.dicoding.dev/v1';
  }
  async saveStoriesToIndexedDB(stories) {
    try {
      await StoryIdb.saveStories(stories);
      console.log('Berhasil menyimpan cerita ke IndexedDB');
      return true;
    } catch (error) {
      console.error('Gagal menyimpan cerita ke IndexedDB', error);
      return false;
    }
  }
  
  // Method untuk mengambil cerita dari IndexedDB
  async getStoriesFromIndexedDB() {
    try {
      const stories = await StoryIdb.getStories();
      console.log('Berhasil mengambil cerita dari IndexedDB', stories.length);
      return stories;
    } catch (error) {
      console.error('Gagal mengambil cerita dari IndexedDB', error);
      return [];
    }
  }
  
  // Method untuk menyimpan satu cerita ke IndexedDB
  async saveStoryToIndexedDB(story) {
    try {
      await StoryIdb.saveStory(story);
      console.log('Berhasil menyimpan satu cerita ke IndexedDB');
      return true;
    } catch (error) {
      console.error('Gagal menyimpan satu cerita ke IndexedDB', error);
      return false;
    }
  }
  
  // Method untuk menghapus cerita dari IndexedDB
  async deleteStoryFromIndexedDB(id) {
    try {
      await StoryIdb.deleteStory(id);
      console.log('Berhasil menghapus cerita dari IndexedDB');
      return true;
    } catch (error) {
      console.error('Gagal menghapus cerita dari IndexedDB', error);
      return false;
    }
  }
    // Method untuk menghapus cerita dari API
    async deleteStory(id) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Anda harus login terlebih dahulu');
        }
  
        const response = await fetch(`${this.baseUrl}/stories/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        if (!response.ok) {
          const responseJson = await response.json();
          if (response.status === 401) {
            throw new Error('Sesi Anda telah berakhir. Silakan login kembali');
          } else if (responseJson.message) {
            throw new Error(responseJson.message);
          } else {
            throw new Error('Gagal menghapus cerita');
          }
        }
  
        return true;
      } catch (error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Koneksi internet bermasalah. Silakan coba lagi');
        }
        throw error;
      }
    }
  
    // Method untuk mengambil cerita dari IndexedDB berdasarkan ID
    async getStoryById(id) {
      try {
        const story = await StoryIdb.getStoryById(id);
        return story;
      } catch (error) {
        console.error('Gagal mengambil cerita dari IndexedDB', error);
        throw error;
      }
    }

  async getStories(page = 1, size = 10, location = 0) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Anda harus login terlebih dahulu');
      }

      const response = await fetch(
        `${this.baseUrl}/stories?page=${page}&size=${size}&location=${location}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const responseJson = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sesi Anda telah berakhir. Silakan login kembali');
        }
        if (responseJson.message) {
          throw new Error(responseJson.message);
        }
        throw new Error('Gagal mengambil data cerita');
      }

      if (responseJson.error) {
        throw new Error(responseJson.message || 'Gagal mengambil data cerita');
      }

      return responseJson.listStory;
    } catch (error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Koneksi internet bermasalah. Silakan coba lagi');
      }
      throw error;
    }
  }

  async addStory(formData) {
    try {
      // Validasi token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Anda harus login terlebih dahulu');
      }

      // Validasi file foto
      const photo = formData.get('photo');
      if (!photo || photo.size === 0) {
        throw new Error('Foto harus diunggah');
      }

      if (photo.size > 1000000) { // 1MB dalam bytes
        throw new Error('Ukuran foto maksimal 1MB');
      }

      if (!photo.type.startsWith('image/')) {
        throw new Error('File harus berupa gambar');
      }

      // Validasi deskripsi
      const description = formData.get('description');
      if (!description || description.trim().length === 0) {
        throw new Error('Deskripsi harus diisi');
      }

      const response = await fetch(`${this.baseUrl}/stories`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const responseJson = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sesi Anda telah berakhir. Silakan login kembali');
        } else if (response.status === 413) {
          throw new Error('Ukuran file terlalu besar');
        } else if (responseJson.message) {
          throw new Error(responseJson.message);
        } else {
          throw new Error('Gagal menambahkan cerita. Silakan coba lagi');
        }
      }

      if (responseJson.error) {
        throw new Error(responseJson.message || 'Gagal menambahkan cerita');
      }

      return responseJson;
    } catch (error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Koneksi internet bermasalah. Silakan coba lagi');
      }
      throw error;
    }
  }

  async login(email, password) {
    try {
      // Validasi input
      if (!email || !password) {
        throw new Error('Email dan password harus diisi');
      }

      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('Format email tidak valid');
      }

      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const responseJson = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('Email atau password salah');
        } else if (response.status === 401) {
          throw new Error('Email atau password salah');
        } else if (responseJson.message) {
          throw new Error(responseJson.message);
        } else {
          throw new Error('Login gagal. Silakan coba lagi');
        }
      }

      if (responseJson.error) {
        throw new Error(responseJson.message || 'Login gagal');
      }

      return responseJson.loginResult;
    } catch (error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Koneksi internet bermasalah. Silakan coba lagi');
      }
      throw error;
    }
  }

  async register(name, email, password) {
    try {
      // Validasi input sebelum mengirim ke API
      if (!name || !email || !password) {
        throw new Error('Nama, email, dan password harus diisi');
      }

      if (name.length < 3) {
        throw new Error('Nama minimal 3 karakter');
      }

      if (password.length < 8) {
        throw new Error('Password minimal 8 karakter');
      }

      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('Format email tidak valid');
      }

      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const responseJson = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          if (responseJson.message) {
            throw new Error(responseJson.message);
          }
          throw new Error('Data registrasi tidak valid');
        } else if (response.status === 401) {
          throw new Error('Email sudah terdaftar');
        } else {
          throw new Error('Registrasi gagal. Silakan coba lagi');
        }
      }

      if (responseJson.error) {
        throw new Error(responseJson.message || 'Registrasi gagal');
      }

      return responseJson;
    } catch (error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Koneksi internet bermasalah. Silakan coba lagi');
      }
      throw error;
    }
  }

  async addStoryGuest(formData) {
    try {
      // Validasi file foto
      const photo = formData.get('photo');
      if (!photo || photo.size === 0) {
        throw new Error('Foto harus diunggah');
      }

      if (photo.size > 1000000) { // 1MB dalam bytes
        throw new Error('Ukuran foto maksimal 1MB');
      }

      if (!photo.type.startsWith('image/')) {
        throw new Error('File harus berupa gambar');
      }

      // Validasi deskripsi
      const description = formData.get('description');
      if (!description || description.trim().length === 0) {
        throw new Error('Deskripsi harus diisi');
      }

      const response = await fetch(`${this.baseUrl}/stories/guest`, {
        method: 'POST',
        body: formData,
      });

      const responseJson = await response.json();

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Ukuran file terlalu besar');
        } else if (responseJson.message) {
          throw new Error(responseJson.message);
        } else {
          throw new Error('Gagal menambahkan cerita. Silakan coba lagi');
        }
      }

      if (responseJson.error) {
        throw new Error(responseJson.message || 'Gagal menambahkan cerita');
      }

      return responseJson;
    } catch (error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Koneksi internet bermasalah. Silakan coba lagi');
      }
      throw error;
    }
  }
  // Method untuk mengambil cerita dari IndexedDB berdasarkan ID
async getStoryById(id) {
  try {
    const story = await StoryIdb.getStoryById(id);
    return story;
  } catch (error) {
    console.error('Gagal mengambil cerita dari IndexedDB', error);
    throw error;
  }
}
async deleteStory(id) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Anda harus login terlebih dahulu');
    }

    const response = await fetch(`${this.baseUrl}/stories/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const responseJson = await response.json();
      if (response.status === 401) {
        throw new Error('Sesi Anda telah berakhir. Silakan login kembali');
      } else if (responseJson.message) {
        throw new Error(responseJson.message);
      } else {
        throw new Error('Gagal menghapus cerita');
      }
    }

    return true;
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Koneksi internet bermasalah. Silakan coba lagi');
    }
    throw error;
  }
}
  // Add a fallback method for testing
async loginWithFallback(email, password) {
  try {
    return await this.login(email, password);
  } catch (error) {
    console.warn('API login failed, using demo mode:', error.message);
    // Return a mock login result for testing
    return {
      userId: 'demo-user-123',
      name: 'Demo User',
      token: 'demo-token-' + Date.now()
    };
  }
}

async registerWithFallback(name, email, password) {
  try {
    return await this.register(name, email, password);
  } catch (error) {
    console.warn('API register failed, using demo mode:', error.message);
    // Return success for demo purposes
    return { message: 'Demo registration successful' };
  }
}
  async getStoryDetail(id) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Anda harus login terlebih dahulu');
      }

      const response = await fetch(`${this.baseUrl}/stories/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseJson = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sesi Anda telah berakhir. Silakan login kembali');
        } else if (response.status === 404) {
          throw new Error('Cerita tidak ditemukan');
        } else if (responseJson.message) {
          throw new Error(responseJson.message);
        } else {
          throw new Error('Gagal mengambil detail cerita');
        }
      }

      if (responseJson.error) {
        throw new Error(responseJson.message || 'Gagal mengambil detail cerita');
      }

      return responseJson.story;
    } catch (error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Koneksi internet bermasalah. Silakan coba lagi');
      }
      throw error;
    }
  }

  async subscribeNotification(subscriptionDataForApi) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Anda harus login terlebih dahulu');
      }

      // Data sudah diformat di presenter sesuai Request Body API
      // Validasi dasar: pastikan endpoint ada
      if (!subscriptionDataForApi || !subscriptionDataForApi.endpoint) {
          console.error('Invalid subscription data received in model (missing endpoint):', subscriptionDataForApi); // Debug log
          throw new Error('Data langganan notifikasi tidak valid (endpoint hilang).');
      }

      console.log('Sending subscription data to API:', subscriptionDataForApi); // Debug log

      const response = await fetch(`${this.baseUrl}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subscriptionDataForApi),
      });

      const responseJson = await response.json();
      console.log('API Response:', responseJson); // Debug log

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sesi Anda telah berakhir. Silakan login kembali');
        } else if (responseJson.message) {
          throw new Error(responseJson.message);
        } else {
          throw new Error('Gagal berlangganan notifikasi');
        }
      }

      if (responseJson.error) {
        throw new Error(responseJson.message || 'Gagal berlangganan notifikasi');
      }

      return responseJson;
    } catch (error) {
      console.error('Subscription API error in Model:', error); // Debug log
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Koneksi internet bermasalah. Silakan coba lagi');
      }
      // Jangan tampilkan pesan error internal service ke user
      if (error.message.includes('Failed due to internal service error')) {
         throw new Error('Gagal mengaktifkan notifikasi. Silakan coba lagi nanti.');
      }
      throw error;
    }
  }

  async unsubscribeNotification(endpoint) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Anda harus login terlebih dahulu');
      }

      const response = await fetch(`${this.baseUrl}/notifications/subscribe`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint }),
      });

      const responseJson = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sesi Anda telah berakhir. Silakan login kembali');
        } else if (responseJson.message) {
          throw new Error(responseJson.message);
        } else {
          throw new Error('Gagal berhenti berlangganan notifikasi');
        }
      }

      if (responseJson.error) {
        throw new Error(responseJson.message || 'Gagal berhenti berlangganan notifikasi');
      }

      return responseJson;
    } catch (error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Koneksi internet bermasalah. Silakan coba lagi');
      }
      throw error;
    }
  }
}