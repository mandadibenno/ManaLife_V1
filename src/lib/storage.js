// Safe wrappers around Web Storage. Private windows and some WebViews throw on access.

export function readLocal(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null) return fallback
    try {
      return JSON.parse(raw)
    } catch {
      return raw // plain strings written by V1 (e.g. the last active room id)
    }
  } catch {
    return fallback
  }
}

export function writeLocal(key, value) {
  try {
    if (value === undefined || value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — non-critical preference */
  }
}

export function readSession(key) {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeSession(key, value) {
  try {
    if (value == null) window.sessionStorage.removeItem(key)
    else window.sessionStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}
