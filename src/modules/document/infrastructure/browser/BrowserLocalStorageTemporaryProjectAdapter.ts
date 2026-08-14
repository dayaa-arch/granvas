import type { TemporaryProjectStoragePort } from '@/modules/document/application/ports/TemporaryProjectStoragePort'

export const TEMPORARY_PROJECT_STORAGE_KEY = 'granvas:temporary-project:v1'

type BrowserStorage = Readonly<{
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}>

export class BrowserLocalStorageTemporaryProjectAdapter
  implements TemporaryProjectStoragePort
{
  private readonly getStorage: () => BrowserStorage
  private readonly key: string

  constructor(
    getStorage: () => BrowserStorage,
    key = TEMPORARY_PROJECT_STORAGE_KEY,
  ) {
    this.getStorage = getStorage
    this.key = key
  }

  read(): string | null {
    return this.getStorage().getItem(this.key)
  }

  write(value: string): void {
    this.getStorage().setItem(this.key, value)
  }

  remove(): void {
    this.getStorage().removeItem(this.key)
  }
}
