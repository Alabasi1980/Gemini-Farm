# Gemini Farm - Game Development Rules & Guidelines

This document serves as the official guide for the development of Gemini Farm. Its purpose is to ensure consistency, maintainability, and high quality throughout the project's lifecycle. All new development should adhere to these rules.

---

## 1. Folder Structure (System-Based Architecture)

To ensure a scalable and maintainable codebase, the project follows a "System-Based" or "Feature-Based" architecture. All code is organized by its functional domain or "system" rather than by its type (e.g., components, services).

### Core Principles:

- **High Cohesion:** All files related to a single feature (e.g., farming, player inventory, market) should reside within the same system folder.
- **Low Coupling:** Systems should be as independent as possible, interacting with each other through well-defined service APIs rather than direct component dependencies.

### Directory Layout:

```
src
├── systems/
│   ├── community/        // Handles leaderboards, social interactions
│   │   ├── components/
│   │   └── services/
│   ├── farm/             // Core farm grid, plots, objects, animals
│   │   ├── components/
│   │   └── services/
│   ├── inventory/        // Player's inventory management UI
│   │   └── ...
│   ├── management/       // Worker management and automation
│   │   └── ...
│   ├── market/           // Dynamic pricing, market events, ticker
│   │   └── ...
│   ├── player/           // Player state (coins, xp) and HUD
│   │   └── ...
│   ├── production/       // Factories, recipes, production chains
│   │   └── ...
│   ├── shop/             // In-game shop for buying items/expansions
│   │   └── ...
│   ├── tasks/            // AI-driven task generation and tracking
│   │   └── ...
│   └── world/            // Global systems like game clock, weather, seasons
│       └── services/
│
├── shared/
│   ├── services/         // Services used by multiple systems (e.g., ItemService)
│   └── types/            // Global type definitions (game.types.ts)
│
├── styles/
│   ├── farm/
│   ├── production/
│   ├── ...               // Other system-specific styles
│   ├── shared.css        // Styles shared across multiple systems
│   └── styles.css        // Main CSS entry point that imports all others
│
└── app.component.ts      // The root component, responsible for layout and navigation
```

### Rules:

1.  **New Features:** When adding a new major feature (e.g., "Guilds"), create a new folder under `src/systems/`.
2.  **Shared Code:** If a piece of logic, a type, or a UI component is needed by **more than two** systems, it should be placed in the `src/shared/` directory. Avoid premature abstraction; keep code within its system until a clear need for sharing arises.
3.  **Cross-System Communication:** A service from one system (e.g., `FarmService`) can be injected into a service or component of another system (e.g., `WorkerService`). This is the primary method of interaction between systems.

---

## 2. Styling (Centralized CSS)

To maintain a consistent look and feel and to simplify theme management, all custom CSS is centralized.

### Core Principles:

- **Single Source of Truth:** All non-Tailwind CSS rules reside within the `src/styles` directory.
- **Global Scope:** All styles are global. Be specific with selectors to avoid unintended side effects. Using component-specific classes is recommended (e.g., `.farm-page-container`).
- **Organization:** Styles are organized into sub-folders that mirror the `systems` directory structure.

### Rules:

1.  **NO Component-Scoped Styles:** Do NOT use the `styles` or `styleUrls` properties in the `@Component` decorator.
2.  **NO Inline `<style>` Blocks:** Do NOT write `<style>` blocks inside component HTML templates.
3.  **File Location:**
    -   Styles specific to one system (e.g., the Farm page) go into the corresponding sub-folder (e.g., `src/styles/farm/farm-page.css`).
    -   Styles that apply to multiple systems should be placed in `src/styles/shared.css`.
4.  **Main Import File:** All new CSS files must be imported into the main `src/styles/styles.css` file to be included in the application.

---

## 3. State Management (Signals)

Angular Signals are the primary tool for state management to ensure a reactive, performant, and maintainable application.

### Core Principles:

- **Single Source of Truth:** State should be held in signals within services (for global/shared state) or components (for local UI state). Avoid duplicating state.
- **Reactivity:** The UI should react automatically to state changes. Avoid manually updating the DOM or component properties.

### Rules:

1.  **Use `signal()` for State:** All mutable state (e.g., player coins, inventory, UI toggles) must be stored in a `signal()`.
2.  **Use `computed()` for Derived Data:** Any data that can be calculated from one or more signals must be a `computed()` signal. Do not manually calculate and store this data in another `signal()`.
    -   *Example:* `currentStorage` is a `computed()` signal derived from the `inventory` signal.
3.  **Use `effect()` for Side Effects:** Use `effect()` for operations that need to react to state changes but don't produce a new value, such as logging, network requests, or updating third-party libraries. Effects should be used sparingly and primarily within services.
4.  **Immutability:** When updating a signal holding an object or array (e.g., using `.update()`), always return a *new* object or array rather than mutating the existing one. This prevents unexpected behavior.

---

## 4. Component Design

Components should be small, efficient, and focused on a single responsibility.

### Rules:

1.  **`OnPush` Change Detection:** All components **must** use `changeDetection: ChangeDetectionStrategy.OnPush`. This is critical for performance in a signal-based application.
2.  **Use `input()` and `output()` Functions:** Prefer the modern `input()` and `output()` functions over the `@Input()` and `@Output()` decorators for better type safety and a cleaner API.
3.  **Single Responsibility:** A component should do one thing well. If a component becomes too large or handles too much logic, break it down into smaller, child components.
4.  **Smart vs. Dumb Components:**
    -   **Smart Components (Pages):** These are top-level components for a route/view. They are responsible for injecting services, fetching data, and passing that data down to child components.
    -   **Dumb Components (UI):** These are reusable UI elements. They receive all their data via `input()`s and emit events via `output()`s. They should not inject services directly.
5.  **No Logic in Templates:** Keep templates as simple as possible. Complex logic, calculations, or data transformations should be handled in the component's class, typically using `computed()` signals.

---

## 5. Documentation

**Up-to-Date Documentation:** All design and architecture documents (files in `src/docs/`) **must** be updated to reflect any changes made to the game mechanics, systems, or architecture. This ensures that the documentation remains a reliable single source of truth for the project's current state.
