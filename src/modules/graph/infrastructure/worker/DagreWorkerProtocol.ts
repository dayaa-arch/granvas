import type {
  GraphLayoutInputDto,
  PositionedGraphDto,
} from '@/modules/graph/application/GraphApplication'

export type DagreWorkerRequest = Readonly<{
  requestId: number
  input: GraphLayoutInputDto
}>

export type DagreWorkerResponse =
  | Readonly<{
      requestId: number
      status: 'success'
      output: PositionedGraphDto
    }>
  | Readonly<{
      requestId: number
      status: 'failure'
      message: string
    }>
