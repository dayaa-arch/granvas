import type {
  PickedProjectFileDto,
  ProjectFilePickerPort,
} from '@/modules/transfer/application/TransferApplication'

export type ProjectFileInputFactory = () => HTMLInputElement

export class BrowserProjectFilePickerAdapter implements ProjectFilePickerPort {
  readonly #createInput: ProjectFileInputFactory

  constructor(
    createInput: ProjectFileInputFactory = () => document.createElement('input'),
  ) {
    this.#createInput = createInput
  }

  pickProjectFile(): Promise<PickedProjectFileDto | null> {
    const input = this.#createInput()
    input.type = 'file'
    input.accept = '.granvas,text/plain'
    input.multiple = false

    return new Promise((resolve) => {
      let settled = false

      const finish = (result: PickedProjectFileDto | null) => {
        if (settled) {
          return
        }

        settled = true
        input.removeEventListener('change', handleChange)
        input.removeEventListener('cancel', handleCancel)
        resolve(result)
      }

      const handleChange = () => {
        const file = input.files?.item(0)

        if (!file) {
          finish(null)
          return
        }

        finish(
          Object.freeze({
            name: file.name,
            size: file.size,
            async readBytes() {
              return new Uint8Array(await file.arrayBuffer())
            },
          }),
        )
      }

      const handleCancel = () => finish(null)
      input.addEventListener('change', handleChange)
      input.addEventListener('cancel', handleCancel)
      input.click()
    })
  }
}
