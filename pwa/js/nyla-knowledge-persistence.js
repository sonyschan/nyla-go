/**
 * NYLA Knowledge Persistence Enhancement
 * Provides robust storage with IndexedDB fallback and recovery mechanisms
 */

class NYLAKnowledgePersistence {
  constructor() {
    this.dbName = 'NYLAKnowledgeDB';
    this.dbVersion = 1;
    this.storeName = 'knowledge';
    this.db = null;
    this.isIndexedDBAvailable = this.checkIndexedDBSupport();
  }

  /**
   * Check if IndexedDB is available
   */
  checkIndexedDBSupport() {
    try {
      return 'indexedDB' in window && window.indexedDB !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Initialize IndexedDB
   */
  async initDB() {
    if (!this.isIndexedDBAvailable) return false;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB initialization failed');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Save knowledge data with multiple storage layers
   */
  async saveKnowledge(data) {
    const saveData = {
      ...data,
      id: 'primary',
      timestamp: Date.now(),
      version: 2
    };

    // Try IndexedDB first
    if (this.db) {
      try {
        await this.saveToIndexedDB(saveData);
        console.log('Knowledge saved to IndexedDB');
      } catch (error) {
        console.warn('IndexedDB save failed, falling back to localStorage', error);
      }
    }

    // Always save to localStorage as backup
    try {
      localStorage.setItem('nyla_knowledge_tracker', JSON.stringify(saveData));
      
      // Create dated backup
      const backupKey = `nyla_knowledge_backup_${new Date().toISOString().split('T')[0]}`;
      localStorage.setItem(backupKey, JSON.stringify(saveData));
      
      // Session storage for extra safety (survives page refresh but not browser close)
      sessionStorage.setItem('nyla_knowledge_session', JSON.stringify(saveData));
      
      return true;
    } catch (error) {
      console.error('Failed to save knowledge data', error);
      return false;
    }
  }

  /**
   * Save to IndexedDB
   */
  async saveToIndexedDB(data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load knowledge data with recovery mechanisms
   */
  async loadKnowledge() {
    let data = null;

    // Try IndexedDB first
    if (this.db) {
      try {
        data = await this.loadFromIndexedDB();
        if (data) {
          console.log('Knowledge loaded from IndexedDB');
          return data;
        }
      } catch (error) {
        console.warn('IndexedDB load failed', error);
      }
    }

    // Try localStorage
    try {
      const stored = localStorage.getItem('nyla_knowledge_tracker');
      if (stored) {
        data = JSON.parse(stored);
        console.log('Knowledge loaded from localStorage');
        return data;
      }
    } catch (error) {
      console.warn('localStorage load failed', error);
    }

    // Try session storage
    try {
      const session = sessionStorage.getItem('nyla_knowledge_session');
      if (session) {
        data = JSON.parse(session);
        console.log('Knowledge recovered from session storage');
        return data;
      }
    } catch (error) {
      console.warn('Session storage load failed', error);
    }

    // Try backups
    const backups = this.findBackups();
    for (const backupKey of backups) {
      try {
        const backup = localStorage.getItem(backupKey);
        if (backup) {
          data = JSON.parse(backup);
          console.log(`Knowledge recovered from backup: ${backupKey}`);
          return data;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  /**
   * Load from IndexedDB
   */
  async loadFromIndexedDB() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get('primary');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Find backup keys in localStorage
   */
  findBackups() {
    try {
      const keys = Object.keys(localStorage);
      return keys.filter(k => k.startsWith('nyla_knowledge_backup_')).sort().reverse();
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean old backups (keep last 7 days)
   */
  cleanOldBackups() {
    try {
      const keys = Object.keys(localStorage);
      const backupKeys = keys.filter(k => k.startsWith('nyla_knowledge_backup_'));
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      backupKeys.forEach(key => {
        try {
          const dateStr = key.replace('nyla_knowledge_backup_', '');
          const backupDate = new Date(dateStr).getTime();
          
          if (backupDate < sevenDaysAgo) {
            localStorage.removeItem(key);
            console.log(`Removed old backup: ${key}`);
          }
        } catch (error) {
          // Invalid date format, remove it
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clean old backups:', error);
    }
  }

  /**
   * Get storage usage info
   */
  async getStorageInfo() {
    const info = {
      localStorage: {
        used: 0,
        available: true
      },
      indexedDB: {
        used: 0,
        available: this.isIndexedDBAvailable
      },
      backups: []
    };

    // Check localStorage
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (key.startsWith('nyla_')) {
          totalSize += localStorage[key].length;
        }
      }
      info.localStorage.used = totalSize;
      info.backups = this.findBackups();
    } catch (error) {
      info.localStorage.available = false;
    }

    // Check IndexedDB
    if (this.db && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        info.indexedDB.used = estimate.usage || 0;
        info.indexedDB.quota = estimate.quota || 0;
      } catch (error) {
        // Estimation not available
      }
    }

    return info;
  }
}

// Export for use
window.NYLAKnowledgePersistence = NYLAKnowledgePersistence;