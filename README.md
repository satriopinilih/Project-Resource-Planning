# Project Resource Planning

A full-stack monorepo for project resource planning.

## Tech Stack

| Layer    | Technology              |
| -------- | ----------------------- |
| Frontend | Next.js 15 + TypeScript |
| Backend  | C# .NET 10 Web API      |
| Monorepo | npm workspaces          |

## Project Structure

```
Project-Resource-Planning/
├── apps/
│   ├── frontend/          # Next.js application
│   │   ├── src/
│   │   │   ├── app/       # App Router pages & layouts
│   │   │   └── ...
│   │   ├── public/        # Static assets
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── backend/           # .NET Web API
│       ├── Controllers/   # API controllers
│       ├── Program.cs     # Application entry point
│       ├── Backend.csproj
│       └── Backend.slnx
│
├── package.json           # Root workspace config & scripts
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **.NET SDK** ≥ 10.0
- **npm** ≥ 9

### Installation

```bash
# Install all dependencies (frontend + root dev tools)
npm install
```

### Development

```bash
# Run both frontend and backend concurrently
npm run dev

# Or run individually:
npm run dev:frontend   # http://localhost:3000
npm run dev:backend    # http://localhost:5000 (HTTP) / https://localhost:5001 (HTTPS)
```

### Build

```bash
npm run build:frontend   # Build Next.js for production
npm run build:backend    # Build .NET project
```

### Lint

```bash
npm run lint:frontend    # Run ESLint on the frontend
```