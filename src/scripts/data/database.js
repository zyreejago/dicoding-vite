import { openDB } from 'idb';

const DATABASE_NAME = 'story-app-db';
const DATABASE_VERSION = 2; // Update version
const OBJECT_STORE_NAME = 'stories';
const FAVORITES_STORE_NAME = 'favorites'; // Store baru

const openDatabase = async () => {
  return openDB(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database, oldVersion, newVersion) {
      // Buat object store jika belum ada
      if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
        database.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
        console.log(`Object store ${OBJECT_STORE_NAME} berhasil dibuat`);
      }
      
      // Tambah store untuk favorit
      if (!database.objectStoreNames.contains(FAVORITES_STORE_NAME)) {
        database.createObjectStore(FAVORITES_STORE_NAME, { keyPath: 'id' });
        console.log(`Object store ${FAVORITES_STORE_NAME} berhasil dibuat`);
      }
    },
  });
};

const StoryIdb = {
  // Mendapatkan semua cerita dari IndexedDB
  async getStories() {
    const db = await openDatabase();
    return db.getAll(OBJECT_STORE_NAME);
  },

  // Mendapatkan cerita berdasarkan ID
  async getStoryById(id) {
    const db = await openDatabase();
    return db.get(OBJECT_STORE_NAME, id);
  },

  // Menyimpan cerita ke IndexedDB
  async saveStory(story) {
    const db = await openDatabase();
    return db.put(OBJECT_STORE_NAME, story);
  },

  // Menyimpan banyak cerita sekaligus
  async saveStories(stories) {
    const db = await openDatabase();
    const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OBJECT_STORE_NAME);
    
    await Promise.all(stories.map(story => store.put(story)));
    await tx.done;
    
    return true;
  },

  // Menghapus cerita dari IndexedDB
  async deleteStory(id) {
    const db = await openDatabase();
    return db.delete(OBJECT_STORE_NAME, id);
  },
  
  // FITUR FAVORIT - MENAMPILKAN
  async getFavorites() {
    const db = await openDatabase();
    return db.getAll(FAVORITES_STORE_NAME);
  },
  
  // FITUR FAVORIT - MENYIMPAN
  async addToFavorites(story) {
    const db = await openDatabase();
    return db.put(FAVORITES_STORE_NAME, story);
  },
  
  // FITUR FAVORIT - MENGHAPUS
  async removeFromFavorites(id) {
    const db = await openDatabase();
    return db.delete(FAVORITES_STORE_NAME, id);
  },
  
  // Cek apakah story ada di favorit
  async isFavorite(id) {
    const db = await openDatabase();
    const story = await db.get(FAVORITES_STORE_NAME, id);
    return !!story;
  }
};

export default StoryIdb;