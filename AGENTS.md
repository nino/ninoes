# OpenCode Configuration

## Build/Test/Lint Commands

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn typecheck` - Run TypeScript type checking
- `yarn lint` - Run ESLint
- `yarn lint:fix` - Fix ESLint issues automatically
- `yarn format` - Format code with Prettier

## Code Style Guidelines

- **TypeScript**: All functions must have explicit return type annotations
- **Imports**: Use `type` imports for types (`import { type User } from "..."`), group by external/internal
- **Naming**: camelCase for variables/functions, PascalCase for components/types, UPPER_CASE for constants
- **Components**: Export as named functions with explicit return type `JSX.Element`
- **Error Handling**: Use try/catch blocks, log errors with `console.error`
- **Arrays**: Use generic syntax `Array<T>` not `T[]` (enforced by ESLint)
- **Quotes**: Use HTML entities for curly quotes: `&ldquo;` `&rdquo;` `&lsquo;` `&rsquo;`
- **Async**: Use `void` for fire-and-forget promises, handle floating promises
- **Nullish**: Prefer nullish coalescing (`??`) and optional chaining (`?.`)
- **Type Assertions**: Use `as` syntax, avoid object literal assertions
- **React APIs:** Use `import React from "react";` and spell out React APIs like `React.useState` instead of importing individual React APIs.
