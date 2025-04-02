# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Development: `npm run dev` - Starts the Vite development server
- Build: `npm run build` - TypeScript build and Vite bundle
- Lint: `npm run lint` - Run ESLint on all files
- Preview: `npm run preview` - Preview the production build locally

## Code Style Guidelines

- **TypeScript**: Use strict typing with explicit type annotations for function parameters and returns
- **Imports**: Group imports by external libraries first, then internal modules
- **Component Structure**: React functional components with explicit React.FC<Props> typing
- **Naming**: 
  - camelCase for variables, functions
  - PascalCase for components, interfaces, and types
  - ALL_CAPS for constants
- **State Management**: Use React hooks (useState, useEffect, useMemo, useCallback)
- **Error Handling**: Use console.warn/error for non-critical errors, throw for critical issues
- **Comments**: Document complex calculations and physics logic
- **Units**: Always specify units in variable names (e.g., velocityMPH, targetX_m)