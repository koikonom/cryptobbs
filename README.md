### This part is written by a human :D 

This is a hackathon project I wrote on my spare time. It was fun but it's far from doing anything useful.

Challenges:
 * Waku is very interesting, does what it says on the tin, but there is a huge gap between what the examples online say and what the current iteration of the SDK does. Also the async nature of the protocol makes decent UX a challenge, which is expected.
 * Time.
 * I don't know a lot of js/react/css/ts/etc so cursor wrote most of this. The only code I wrote was to figure out how the waku sdk works and then I just told the agent to use that as a basis for the rest.

 Surprises:
 * After getting waku to work I expected swarm to be a similarly bumpy experience. I was pleasantly surprised to see it worked out of the box.

Anything below this line is not written by a human
---


# CryptoBBS

A decentralized bulletin board system (BBS) built with Web3 technologies, featuring real-time chat and threaded forums. CryptoBBS combines the nostalgic aesthetic of classic terminal-based BBS systems with modern decentralized infrastructure.

## Overview

CryptoBBS is a fully decentralized communication platform that provides:
- **Real-time Chat**: Instant messaging using Waku protocol for peer-to-peer communication
- **Forum Threads**: Threaded discussions with content stored on Swarm
- **Web3 Authentication**: Wallet-based identity using RainbowKit
- **Retro Aesthetic**: Classic green-on-black terminal UI

## Architecture

### Core Technologies

- **Frontend**: Next.js 14 with React 18 and TypeScript
- **Web3 Stack**:
  - Wagmi for Ethereum interactions
  - RainbowKit for wallet connections
  - Viem for blockchain utilities
- **Decentralized Infrastructure**:
  - [Waku SDK](https://waku.org/) - Peer-to-peer messaging protocol for real-time communication
  - [Swarm](https://www.ethswarm.org/) - Decentralized storage for forum content
- **Data Serialization**: Protocol Buffers for efficient message encoding

### Key Components

#### Services

1. **WakuService** ([src/services/wakuService.ts](src/services/wakuService.ts))
   - Manages Waku light node connections
   - Handles multiple content topics (chat, forum threads)
   - Provides reliable message delivery using ReliableChannel
   - Implements message deduplication
   - Dynamic topic initialization for thread-specific channels

2. **SwarmService** ([src/services/swarmService.ts](src/services/swarmService.ts))
   - Uploads and downloads content to/from Swarm network
   - Uses public Swarm gateway for testing
   - Provides content-addressable storage for forum messages

3. **Cache Services**:
   - **threadCache** - Local caching of forum thread metadata
   - **messageCache** - Caches forum messages and their Swarm content

#### Hooks

1. **useWaku** ([src/hooks/useWaku.ts](src/hooks/useWaku.ts))
   - Central hook for Waku connectivity
   - Manages connection state and peer count
   - Provides message sending and subscription APIs
   - Handles dynamic topic initialization

2. **useChat** ([src/hooks/useChat.ts](src/hooks/useChat.ts))
   - Real-time chat functionality
   - Message deduplication
   - Wallet-based username display

3. **useForum** ([src/hooks/useForum.ts](src/hooks/useForum.ts))
   - Forum thread management
   - Thread creation with Swarm content storage
   - Thread list synchronization via Waku

4. **useThread** ([src/hooks/useThread.ts](src/hooks/useThread.ts))
   - Individual thread message handling
   - Fetches content from Swarm on message receipt
   - Supports threaded replies
   - Message posting with content upload

#### Data Flow

**Chat Messages:**
```
User Input → useChat → useWaku → WakuService → Waku Network
                                                       ↓
User Display ← useChat ← useWaku ← WakuService ← Waku Network
```

**Forum Posts:**
```
User Input → useForum/useThread → SwarmService → Swarm (content)
                ↓
           useWaku → WakuService → Waku Network (metadata)
                                         ↓
User Display ← useThread ← WakuService ← Waku Network (metadata)
                ↓
           SwarmService ← Swarm (content)
```

### Message Formats

**Chat Message (Protobuf)**:
```protobuf
message ChatMessage {
  uint64 timestamp = 1;
  string username = 2;
  string message = 3;
}
```

**Forum Thread (Protobuf)**:
```protobuf
message ThreadPacket {
  string id = 1;
  string name = 2;
  uint64 createdAt = 3;
  uint64 updatedAt = 4;
  string createdBy = 5;
}
```

**Forum Message (Protobuf)**:
```protobuf
message MessagePacket {
  string id = 1;
  string threadId = 2;
  uint64 createdAt = 3;
  string createdBy = 4;
  string inReplyTo = 5;
  string subject = 6;
  string contentRef = 7;  // Swarm reference
}
```

### Content Topics

- `/cryptobbs/1/chat/proto` - Real-time chat messages
- `/cryptobbs/1/forum/proto` - Forum thread metadata
- `/cryptobbs/1/forum{threadId}/proto` - Thread-specific messages (dynamic)

## Features

### Real-time Chat
- Instant peer-to-peer messaging
- Wallet address-based identity
- Message persistence through Waku network
- Automatic message deduplication
- Live peer count display

### Forum System
- Create threaded discussions
- Store message content on Swarm (decentralized storage)
- Message metadata synchronized via Waku
- Reply threading with visual indentation
- Optional subject lines
- Automatic thread sorting by update time

### Web3 Integration
- Connect wallet using RainbowKit
- Ethereum wallet-based authentication
- Sepolia testnet support
- No backend server required

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Ethereum wallet (MetaMask, WalletConnect, etc.)

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. **Connect Wallet**: Click the connect button in the header to connect your Ethereum wallet
2. **Wait for Connection**: The status indicator shows when Waku is connected
3. **Chat**: Navigate to the Chat section for real-time messaging
4. **Forum**: Create threads and post messages in the Forum section

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home page
│   ├── chat/page.tsx         # Chat page
│   ├── forum/page.tsx        # Forum list page
│   ├── forum/[threadId]/page.tsx  # Thread view page
│   ├── layout.tsx            # Root layout with providers
│   ├── providers.tsx         # Wagmi/RainbowKit providers
│   └── globals.css           # Terminal-style CSS
├── components/
│   ├── Header.tsx            # App header with wallet connect
│   ├── Sidebar.tsx           # Navigation sidebar
│   ├── Footer.tsx            # App footer
│   ├── ChatContainer.tsx     # Chat UI
│   ├── ForumThreadList.tsx   # Forum thread list
│   └── ThreadView.tsx        # Thread message view
├── hooks/
│   ├── useWaku.ts           # Waku connectivity hook
│   ├── useChat.ts           # Chat functionality hook
│   ├── useForum.ts          # Forum management hook
│   └── useThread.ts         # Thread-specific hook
├── services/
│   ├── wakuService.ts       # Waku protocol service
│   ├── swarmService.ts      # Swarm storage service
│   ├── messageCache.ts      # Message caching
│   └── threadCache.ts       # Thread caching
└── wagmi.ts                 # Wagmi configuration
```

## Development

### Scripts

```bash
# Development server with hot reload
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

### Configuration

- **Wagmi Config** ([src/wagmi.ts](src/wagmi.ts)) - Configure chains and connectors
- **Waku Topics** - Defined in hooks ([src/hooks/useWaku.ts](src/hooks/useWaku.ts))
- **Swarm Gateway** - Public gateway URL in [src/services/swarmService.ts](src/services/swarmService.ts)

## Technical Details

### Message Deduplication

The system implements multiple layers of deduplication:
1. SHA-256 hashing of message content in WakuService
2. Reference-based tracking in individual hooks
3. Cache validation before UI updates

### Content Addressable Storage

Forum message content is stored on Swarm using content-addressing:
- Content is uploaded to Swarm and returns a reference hash
- Reference is included in the Waku message metadata
- Content is fetched on-demand when displaying messages
- Content references are cached locally for performance

### Peer-to-Peer Messaging

Waku provides censorship-resistant messaging:
- Light node implementation for browser compatibility
- Uses Filter and LightPush protocols
- Connects to default bootstrap nodes
- Automatic peer discovery and management

### Performance Optimizations

- Local caching of threads and messages
- Lazy content loading from Swarm
- Message deduplication at multiple levels
- Efficient Protobuf serialization
- Dynamic topic initialization

## Limitations & Known Issues

- Uses public Swarm gateway (may have rate limits)
- Waku connection requires peer discovery (may take time)
- Limited to Sepolia testnet
- No message encryption (visible to network participants)
- No spam protection mechanisms

## Future Enhancements

- [ ] End-to-end encrypted private messages
- [ ] Reputation/moderation system
- [ ] Message editing and deletion
- [ ] Rich text formatting
- [ ] File attachments via Swarm
- [ ] ENS name resolution
- [ ] Multi-chain support
- [ ] Mobile responsive design improvements
- [ ] Notification system

## Contributing

This is an ETHGlobal hackathon project. Contributions, issues, and feature requests are welcome!

## License

[MIT](LICENSE)

## Acknowledgments

- Built with [Waku](https://waku.org/) for decentralized messaging
- Storage powered by [Swarm](https://www.ethswarm.org/)
- Wallet integration via [RainbowKit](https://www.rainbowkit.com/)
- Created for ETHGlobal hackathon

---

**Note**: This project is a prototype/proof-of-concept demonstrating decentralized communication infrastructure. Use on testnets only.
