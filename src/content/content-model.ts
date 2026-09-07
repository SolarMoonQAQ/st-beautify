export type ContentNode =
    | {
          kind: 'dialogue'
          data: {
              speaker: string
              content: string
          }
      }
    | {
          kind: 'thought'
          data: {
              speaker: string
              content: string
          }
      }
    | {
          kind: 'native-dom'
          data: {
              node: Node
          }
      }
