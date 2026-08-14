export interface TemporaryProjectStoragePort {
  read(): string | null
  write(value: string): void
  remove(): void
}
