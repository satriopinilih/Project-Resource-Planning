# Project Resource Planning

A full-stack monorepo for project resource planning.

## Tech Stack

| Layer    | Technology              |
| -------- | ----------------------- |
| Frontend | Next.js 16 + TypeScript |
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

## 🧠 Development Workflow & AI Guidelines

To ensure smooth collaboration and prevent technical issues like database synchronization errors, please follow these rules:

### 1. Database Migrations (EF Core)
- **Immutability**: Never rename, edit, or delete a migration file that has already been pushed to the `main` branch.
- **Additive Changes**: Always create a NEW migration for any schema changes:
  ```bash
  cd apps/backend/backend
  dotnet ef migrations add <DescriptiveName>
  ```
- **Sync Issues**: If you encounter `relation "TableName" already exists` after a `pull`, it means the migration IDs have changed. **Solution**: Drop your local database (`dotnet ef database drop -f`) and run the app again to recreate it.

### 2. AI Interaction (Coder/Vibe Code)
- **Follow the Rules**: When using AI for coding (e.g., Cursor, Gemini, Claude), ensure it respects the **Immutability** rule for migrations.
- **Prompting**: If asking AI to change the database, explicitly tell it to: *"Add a new migration instead of editing existing ones."*
- **Context**: Keep this `README.md` or a `context.md` file updated so the AI understands the project boundaries.