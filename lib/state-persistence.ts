"use client"

interface StorageOptions {
  key: string
  defaultValue?: any
  serialize?: (value: any) => string
  deserialize?: (value: string) => any
}

export class StatePersistence {
  private static instance: StatePersistence
  private storage: Storage | null = null

  private constructor() {
    if (typeof window !== "undefined") {
      this.storage = window.localStorage
    }
  }

  static getInstance(): StatePersistence {
    if (!StatePersistence.instance) {
      StatePersistence.instance = new StatePersistence()
    }
    return StatePersistence.instance
  }

  save(key: string, value: any): void {
    if (!this.storage) return

    try {
      const serialized = JSON.stringify(value)
      this.storage.setItem(key, serialized)
    } catch (error) {
      console.error(`Error saving to localStorage with key "${key}":`, error)
    }
  }

  load<T>(key: string, defaultValue?: T): T | null {
    if (!this.storage) return defaultValue || null

    try {
      const item = this.storage.getItem(key)
      if (item === null) return defaultValue || null

      return JSON.parse(item) as T
    } catch (error) {
      console.error(`Error loading from localStorage with key "${key}":`, error)
      return defaultValue || null
    }
  }

  remove(key: string): void {
    if (!this.storage) return
    this.storage.removeItem(key)
  }

  clear(): void {
    if (!this.storage) return
    this.storage.clear()
  }

  // Batch operations for better performance
  saveBatch(items: Record<string, any>): void {
    Object.entries(items).forEach(([key, value]) => {
      this.save(key, value)
    })
  }

  loadBatch<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {}
    keys.forEach((key) => {
      result[key] = this.load<T>(key)
    })
    return result
  }
}

export const statePersistence = StatePersistence.getInstance()
