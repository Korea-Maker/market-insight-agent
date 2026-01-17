# Contributing to QuantBoard V1

Thank you for considering contributing to QuantBoard V1! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors. Be kind, professional, and constructive in all interactions.

---

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/market-insight-agent.git
   cd market-insight-agent
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/market-insight-agent.git
   ```
4. **Follow the development setup** in [docs/guides/DEVELOPMENT.md](./docs/guides/DEVELOPMENT.md)

---

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug Fixes**: Fix issues or bugs in the codebase
- **New Features**: Add new functionality or enhancements
- **Documentation**: Improve or add documentation
- **Tests**: Add or improve test coverage
- **Performance**: Optimize performance bottlenecks
- **Refactoring**: Improve code quality without changing functionality

### What to Work On

- Check the [GitHub Issues](https://github.com/your-repo/issues) for open issues
- Look for issues labeled `good first issue` or `help wanted`
- Propose new features by opening an issue first

---

## Development Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker and Docker Compose
- Git

### Setup Steps

1. **Backend setup**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp env.example .env
   docker-compose up -d
   ```

2. **Frontend setup**:
   ```bash
   cd frontend
   npm install
   ```

3. **Run development servers**:
   ```bash
   # Terminal 1 - Backend
   cd backend && python main.py

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

**For detailed setup instructions, see [DEVELOPMENT.md](./docs/guides/DEVELOPMENT.md).**

---

## Coding Standards

### Python (Backend)

- Follow **PEP 8** style guide
- Use **Black** formatter (line length: 88)
- Include **type hints** for all functions
- Write **docstrings** for public functions (Google style)
- Use **async/await** for I/O operations

**Example:**
```python
async def fetch_news(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
) -> NewsListResponse:
    """
    Fetch news articles with pagination.

    Args:
        skip: Number of items to skip
        limit: Maximum number of items to return
        db: Database session dependency

    Returns:
        NewsListResponse with total count and items
    """
    # Implementation
    pass
```

### TypeScript (Frontend)

- Use **TypeScript strict mode**
- No `any` types (use `unknown` if needed)
- Prefer **functional components**
- Use **React Server Components** when possible
- Follow **shadcn/ui** patterns for UI components

**Example:**
```typescript
interface PriceCardProps {
  symbol: string;
  price: number;
  change24h: number;
}

export const PriceCard: FC<PriceCardProps> = ({
  symbol,
  price,
  change24h,
}) => {
  // Implementation
};
```

### State Management

- Use **Zustand** for global state (Redux is prohibited)
- Use **selective subscriptions** for performance
- Keep stores focused and modular

**Example:**
```typescript
export const usePriceStore = create<PriceState>((set) => ({
  currentPrice: null,
  updatePrice: (price) => set({ currentPrice: price }),
}));

// In component - selective subscription
const currentPrice = usePriceStore((state) => state.currentPrice);
```

### General Rules

- **No mock data** - always use real Binance API integration
- **Minimize 'use client'** - prefer Next.js server components
- **Write tests** for new features
- **Update documentation** when changing APIs

---

## Commit Guidelines

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body> (optional)

<footer> (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or tooling changes
- `perf`: Performance improvements

**Examples:**
```bash
feat(api): add pagination to news endpoint
fix(websocket): handle reconnection on network error
docs(readme): update installation instructions
refactor(store): simplify price store logic
test(candles): add unit tests for candle parser
```

### Commit Best Practices

- Write clear, descriptive commit messages
- Keep commits atomic (one logical change per commit)
- Reference issue numbers when applicable: `fix(api): resolve #123`
- Separate subject from body with a blank line
- Use imperative mood: "add feature" not "added feature"

---

## Pull Request Process

### Before Submitting

1. **Ensure your code works**:
   - Test locally (backend + frontend)
   - Run linters: `npm run lint` (frontend), `black .` (backend)
   - Ensure no console errors

2. **Update documentation**:
   - Update README if you changed setup steps
   - Update API docs if you changed endpoints
   - Add comments for complex logic

3. **Write tests** (if applicable):
   - Add unit tests for new functions
   - Add integration tests for new endpoints

4. **Sync with upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Submitting a Pull Request

1. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub**:
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch

3. **Fill out PR template**:

   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Refactoring

   ## Testing
   How did you test these changes?

   ## Screenshots (if applicable)
   Add screenshots for UI changes

   ## Checklist
   - [ ] Code follows project standards
   - [ ] Self-reviewed the code
   - [ ] Added/updated documentation
   - [ ] Added tests (if applicable)
   - [ ] All tests pass
   - [ ] No console warnings/errors
   ```

4. **Respond to feedback**:
   - Address review comments promptly
   - Push updates to the same branch
   - Resolve conversations when addressed

### PR Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, maintainers will merge
4. Your contribution will be credited in release notes

---

## Reporting Issues

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Verify the issue** on the latest version
3. **Gather information**:
   - Operating system
   - Node.js and Python versions
   - Browser (for frontend issues)
   - Relevant logs or error messages

### Issue Template

Use the following template when reporting bugs:

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Screenshots
If applicable, add screenshots

## Environment
- OS: [e.g., Windows 11, macOS 13]
- Node.js: [e.g., v18.17.0]
- Python: [e.g., 3.11.5]
- Browser: [e.g., Chrome 120]

## Additional Context
Any other relevant information
```

### Feature Requests

For feature requests, include:

- **Problem**: What problem does this solve?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other solutions you considered
- **Use Case**: Real-world example of usage

---

## Development Workflow

### Branching Strategy

```bash
main              # Production-ready code
  └── develop     # Integration branch (if used)
      ├── feature/your-feature
      ├── fix/bug-name
      └── docs/documentation-update
```

### Workflow Steps

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes** and commit regularly:
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

3. **Keep branch updated**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

4. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

---

## Code Review Guidelines

### For Contributors

- **Be open to feedback** - reviewers are here to help
- **Ask questions** if something is unclear
- **Explain your decisions** in code comments or PR description

### For Reviewers

- **Be respectful and constructive**
- **Focus on the code**, not the person
- **Explain why** when requesting changes
- **Acknowledge good work**
- **Approve when ready**, don't let perfect be the enemy of good

---

## Testing Guidelines

### Backend Tests

```python
# tests/test_news.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_news():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/news?limit=10")

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) <= 10
```

### Frontend Tests

```typescript
// components/PriceCard/PriceCard.test.tsx
import { render, screen } from '@testing-library/react';
import { PriceCard } from './PriceCard';

describe('PriceCard', () => {
  it('renders correctly', () => {
    render(<PriceCard symbol="BTCUSDT" price={42500} change24h={2.5} />);
    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
  });
});
```

---

## Getting Help

If you need help or have questions:

- **Documentation**: Check [docs/](./docs/) folder
- **Issues**: Search or create a GitHub issue
- **Discussions**: Use GitHub Discussions for general questions
- **Email**: Contact maintainers (if provided)

---

## Recognition

Contributors will be recognized in:
- **CONTRIBUTORS.md**: List of all contributors
- **Release Notes**: Specific contributions mentioned
- **GitHub**: Automatic attribution in commits

---

## License

By contributing to QuantBoard V1, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to QuantBoard V1! Your efforts help make this project better for everyone.
