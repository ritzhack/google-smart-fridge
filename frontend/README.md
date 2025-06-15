# SmartFridge Frontend

A modern React application for the SmartFridge project, built with TypeScript, Vite, and Radix UI.

## 🚀 Features

- **Modern UI**: Built with Radix UI components and Tailwind CSS
- **Type Safety**: Full TypeScript implementation
- **Fast Development**: Vite for quick development and hot module replacement
- **Code Quality**: ESLint and TypeScript for code quality and type checking
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## 🛠️ Tech Stack

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI
- **Styling**: Tailwind CSS
- **State Management**: React Hooks and Context
- **Code Quality**: ESLint with TypeScript support

## 📦 Installation

```bash
# Install dependencies
pnpm install
# Or with npm: npm install
# Or with yarn: yarn install
```

## 🚀 Development

```bash
# Start development server
pnpm dev
# Or with npm: npm run dev
# Or with yarn: yarn dev
```

The development server will start at `http://localhost:3000`

> **Note:** This frontend expects the backend API to be running at `http://localhost:5001` by default. Make sure to start the backend server as described in the main README.

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions and configurations
├── public/                 # Static assets
├── index.html             # Entry HTML file
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json           # Project dependencies and scripts
```

## 🔧 Configuration

### TypeScript

The project uses TypeScript for type safety. Configuration is split into two files:

- `tsconfig.json`: Base TypeScript configuration
- `tsconfig.app.json`: Application-specific TypeScript configuration

### ESLint

The project uses ESLint with TypeScript support. Configuration is in `eslint.config.js`:

```js
import react from 'eslint-plugin-react'

export default tseslint.config({
  settings: { react: { version: '18.3' } },
  plugins: {
    react,
  },
  rules: {
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

### Tailwind CSS

The project uses Tailwind CSS for styling. Configuration is in `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## 📦 Building for Production

```bash
# Build for production
pnpm build
# Or with npm: npm run build
# Or with yarn: yarn build
```

The build output will be in the `dist` directory.

## 🔍 Code Quality

The project uses ESLint for code quality. To run the linter:

```bash
# Run linter
pnpm lint
# Or with npm: npm run lint
# Or with yarn: yarn lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

This project is licensed under the Apache License - see the [LICENSE](../LICENSE) file for details.
