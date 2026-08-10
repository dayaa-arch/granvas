export type GranvasApplication = Readonly<{
  productName: 'Granvas'
  version: '0.1'
}>

export function createApplication(): GranvasApplication {
  return Object.freeze({
    productName: 'Granvas',
    version: '0.1',
  })
}
