export const saveToHistory = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("Storage error", e);
  }
};

export const loadFromHistory = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

export const clearHistory = (key) => {
  localStorage.removeItem(key);
};