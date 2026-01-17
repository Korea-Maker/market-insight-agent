# QuantBoard V1 Documentation

Welcome to the QuantBoard V1 documentation. This directory contains comprehensive guides and references for developers, contributors, and users.

## Documentation Structure

### 📚 Getting Started

- **[Main README](../README.md)**: Project overview, quick start, and basic setup
- **[Korean README](../README.ko.md)**: 한국어 프로젝트 문서

### 🔌 API Documentation

- **[API Reference](./api/README.md)**: Complete REST and WebSocket API documentation
  - REST endpoints (candles, news, health)
  - WebSocket streaming (real-time prices)
  - Request/response examples
  - Error handling
  - Client code examples (TypeScript, Python, JavaScript)

### 🏗️ Architecture Documentation

- **[System Design](./architecture/SYSTEM_DESIGN.md)**: Detailed architecture documentation
  - High-level system overview
  - Component diagrams
  - Data flow diagrams
  - Backend architecture (FastAPI, Redis, PostgreSQL)
  - Frontend architecture (Next.js, React, Zustand)
  - Database schema
  - WebSocket communication patterns
  - Scalability considerations
  - Security guidelines

### 📖 Developer Guides

- **[Development Guide](./guides/DEVELOPMENT.md)**: Complete development setup and workflow
  - Environment setup
  - Project structure
  - Code standards (Python & TypeScript)
  - Development workflow
  - Testing guidelines
  - Debugging tips
  - Common tasks
  - Best practices
  - Troubleshooting

### 🤝 Contributing

- **[Contributing Guide](../CONTRIBUTING.md)**: How to contribute to the project
  - Code of conduct
  - Development workflow
  - Coding standards
  - Commit guidelines
  - Pull request process
  - Issue reporting

---

## Quick Links

### For New Developers

1. Start with the [Main README](../README.md) for project overview
2. Follow the [Development Guide](./guides/DEVELOPMENT.md) for setup
3. Review [Code Standards](./guides/DEVELOPMENT.md#code-standards)
4. Check [API Documentation](./api/README.md) for endpoint details

### For API Users

1. Review [API Reference](./api/README.md)
2. Check example code for your language
3. Test endpoints using Swagger UI: http://localhost:8000/docs

### For Contributors

1. Read [Contributing Guide](../CONTRIBUTING.md)
2. Understand [System Architecture](./architecture/SYSTEM_DESIGN.md)
3. Follow [Development Workflow](./guides/DEVELOPMENT.md#development-workflow)
4. Submit PRs following guidelines

### For Deploying

1. Review [Production Checklist](../README.md#deployment)
2. Understand [Security Guidelines](./architecture/SYSTEM_DESIGN.md#security)
3. Configure environment variables properly
4. Set up monitoring and logging

---

## Documentation by Topic

### Real-Time Features

- [WebSocket API](./api/README.md#websocket-api)
- [Redis Architecture](./architecture/SYSTEM_DESIGN.md#redis-architecture)
- [Connection Management](./architecture/SYSTEM_DESIGN.md#websocket-communication)
- [Frontend WebSocket Hook](./guides/DEVELOPMENT.md#websocket-hook)

### Data Collection

- [Binance Integration](./architecture/SYSTEM_DESIGN.md#data-flow)
- [News Collection](./architecture/SYSTEM_DESIGN.md#news-collection--delivery-flow)
- [Background Services](./architecture/SYSTEM_DESIGN.md#backend-architecture)

### Database

- [Database Schema](./architecture/SYSTEM_DESIGN.md#database-schema)
- [SQLAlchemy Patterns](./architecture/SYSTEM_DESIGN.md#async-database-pattern)
- [Migrations](./guides/DEVELOPMENT.md#database-migrations)

### Frontend Development

- [Next.js App Router](./architecture/SYSTEM_DESIGN.md#nextjs-app-router-structure)
- [Zustand State Management](./architecture/SYSTEM_DESIGN.md#zustand-state-management)
- [Component Patterns](./guides/DEVELOPMENT.md#typescriptreact-frontend)
- [React Server Components](./guides/DEVELOPMENT.md#best-practices)

### Backend Development

- [FastAPI Patterns](./architecture/SYSTEM_DESIGN.md#fastapi-application-lifecycle)
- [Async Programming](./guides/DEVELOPMENT.md#python-backend)
- [API Routes](./guides/DEVELOPMENT.md#adding-a-new-api-endpoint)
- [Error Handling](./api/README.md#error-handling)

---

## Common Tasks

### Setting Up Development Environment

```bash
# Clone repository
git clone <repository-url>
cd market-insight-agent

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env
docker-compose up -d
python main.py

# Frontend setup (in new terminal)
cd frontend
npm install
npm run dev
```

**See [Development Guide](./guides/DEVELOPMENT.md) for details.**

### Testing APIs

**Using curl:**
```bash
# Health check
curl http://localhost:8000/health

# Get candles
curl "http://localhost:8000/api/candles?symbol=BTCUSDT&interval=1m&limit=10"

# Get news
curl "http://localhost:8000/api/news?limit=5"
```

**Using Swagger UI:**
- Open http://localhost:8000/docs
- Try out endpoints interactively

**See [API Documentation](./api/README.md) for all endpoints.**

### Adding a New Feature

1. Create feature branch: `git checkout -b feature/my-feature`
2. Add backend endpoint (if needed): [Guide](./guides/DEVELOPMENT.md#adding-a-new-api-endpoint)
3. Add frontend component (if needed): [Guide](./guides/DEVELOPMENT.md#adding-a-new-component)
4. Test thoroughly
5. Commit and push: `git commit -m "feat: add my feature"`
6. Open pull request: [Guide](../CONTRIBUTING.md#pull-request-process)

### Debugging Issues

**Backend:**
- Check logs: `docker-compose logs -f`
- Enable debug logging in code
- Use VS Code debugger: [Guide](./guides/DEVELOPMENT.md#backend-debugging)

**Frontend:**
- Check browser console
- Use React DevTools
- Add console.log statements: [Guide](./guides/DEVELOPMENT.md#frontend-debugging)

**See [Troubleshooting](./guides/DEVELOPMENT.md#troubleshooting) for common issues.**

---

## Video Tutorials (Coming Soon)

- Setting up development environment
- Understanding the architecture
- Building a new feature end-to-end
- Deploying to production

---

## Changelog & Releases

- **Version 1.0.0** (Current)
  - Initial release
  - Real-time price streaming
  - News collection and display
  - Historical candle data
  - Dark theme support

---

## Getting Help

### Where to Ask Questions

- **General Questions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/your-repo/issues)
- **Feature Requests**: [GitHub Issues](https://github.com/your-repo/issues)
- **Security Issues**: Email maintainers directly

### Before Asking

1. Search existing issues and discussions
2. Check documentation thoroughly
3. Review troubleshooting guides
4. Verify you're using the latest version

### When Reporting Issues

Include:
- Operating system and version
- Python and Node.js versions
- Full error messages and stack traces
- Steps to reproduce
- Expected vs actual behavior

**See [Issue Template](../CONTRIBUTING.md#reporting-issues)**

---

## Contributing to Documentation

Documentation improvements are always welcome!

### How to Contribute

1. Fork the repository
2. Edit documentation files (Markdown)
3. Submit pull request
4. Follow [Contributing Guidelines](../CONTRIBUTING.md)

### Documentation Standards

- Use clear, concise language
- Include code examples where applicable
- Add diagrams for complex concepts
- Test all code snippets
- Keep formatting consistent

---

## Additional Resources

### External Documentation

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Binance API Documentation](https://binance-docs.github.io/apidocs/spot/en/)

### Related Projects

- [lightweight-charts](https://github.com/tradingview/lightweight-charts)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## Documentation Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| Main README | ✅ Complete | 2024-01-17 |
| Korean README | ✅ Complete | 2024-01-17 |
| API Documentation | ✅ Complete | 2024-01-17 |
| System Design | ✅ Complete | 2024-01-17 |
| Development Guide | ✅ Complete | 2024-01-17 |
| Contributing Guide | ✅ Complete | 2024-01-17 |
| Deployment Guide | 🚧 Planned | - |
| Testing Guide | 🚧 Planned | - |
| Performance Guide | 🚧 Planned | - |

---

**Have questions or suggestions for documentation? [Open an issue](https://github.com/your-repo/issues) or submit a pull request!**

---

**Last Updated:** 2024-01-17
