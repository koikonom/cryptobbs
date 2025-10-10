import { cookieStorage, createConfig, createStorage, http } from 'wagmi'
import {  hoodi } from 'wagmi/chains'

export function getConfig() {
  return createConfig({
    chains: [hoodi],
    connectors: [
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [hoodi.id]: http(),
    },
  })
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>
  }
}
