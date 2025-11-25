# Emircan Erdemci - Personal Portfolio

This is a modern, responsive personal portfolio website built with **Astro**, **React**, and **Tailwind CSS**. It features a clean design, dark/light mode support, internationalization (i18n), and interactive UI components.

## Features

-   **Framework**: Built with [Astro](https://astro.build/) for top-notch performance.
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first styling.
-   **UI Components**: [shadcn/ui](https://ui.shadcn.com/) components for a polished look.
-   **Internationalization**: Multi-language support (English & Turkish) with automatic language detection.
-   **Dark Mode**: System-aware dark/light mode toggler with smooth transitions.
-   **Animations**:
    -   `AuroraText` for gradient text effects.
    -   `AnimatedGlow` for background ambiance.
    -   `Highlighter` for emphasizing key text.
-   **Interactivity**:
    -   `CompanyHoverCard` for previewing external links.
    -   Responsive layout with a "responsive-first" approach.

## Tech Stack

-   **Astro**: Static Site Generator & Framework
-   **React**: UI Library for interactive components
-   **Tailwind CSS**: CSS Framework
-   **Framer Motion**: Animation Library
-   **Lucide React**: Icon Set
-   **TypeScript**: Type Safety

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   npm, yarn, pnpm, or bun

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/Emircyn/emircyn.git
    cd emircyn
    ```

2.  Install dependencies:

    ```bash
    npm install
    # or
    bun install
    ```

3.  Start the development server:

    ```bash
    npm run dev
    # or
    bun dev
    ```

4.  Open your browser and navigate to `http://localhost:4321`.

## Building for Production

To create a production build:

```bash
npm run build
# or
bun run build
```

The output will be in the `dist/` directory.

## Project Structure

```
src/
├── assets/         # Images and static assets
├── components/     # Reusable UI components
│   ├── ui/         # shadcn/ui components
│   └── ...         # Custom components (Hero, CompanyHoverCard, etc.)
├── i18n/           # Translation files and utilities
├── layouts/        # Page layouts
├── pages/          # Astro pages and routing
└── styles/         # Global styles
```

## License

This project is open source and available under the [MIT License](LICENSE).
