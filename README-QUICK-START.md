# Legacy Code AI Refactor - Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your settings (optional)
# The system works with default settings
```

### 3. Start the Application
```bash
node start.js
```

The application will start at: **http://localhost:3001**

## 🔐 Default Credentials

Since this is your first time running the application, you'll need to create an account:

1. Navigate to http://localhost:3001
2. You'll be redirected to the login page
3. Click "Register" to create a new account
4. Fill in your details:
   - Name: Your name
   - Email: Your email address
   - Password: At least 8 characters with uppercase, lowercase, number, and special character
   - Organization (optional): Your company/organization name

## ✨ Features

- **JWT Authentication**: Secure login system with refresh tokens
- **Multi-language Support**: JavaScript, TypeScript, PHP, Java, Python
- **AI-Powered Refactoring**: Intelligent code modernization suggestions
- **Real-time Progress**: Live updates via WebSocket
- **Code Review Workflow**: Built-in approval system
- **Works Without MongoDB**: Falls back to in-memory storage if MongoDB is not available

## 🛠️ Optional: MongoDB Setup

The application works without MongoDB, but for production use with data persistence:

1. Install MongoDB: https://www.mongodb.com/try/download/community
2. Start MongoDB: `mongod`
3. The application will automatically connect

## 📝 Configuration

### Environment Variables

Key settings in `.env`:

- `PORT`: Server port (default: 3001)
- `JWT_SECRET`: Secret for JWT tokens (change in production!)
- `MONGODB_URL`: MongoDB connection string (optional)
- `ALLOWED_ORIGINS`: CORS origins for production

### Security Settings

For production deployment:
1. Change all secret keys in `.env`
2. Set `NODE_ENV=production`
3. Configure `ALLOWED_ORIGINS` to your domain
4. Enable HTTPS (required for production)

## 🔍 Health Check

Check if the server is running properly:
```bash
curl http://localhost:3001/health
```

## 📚 API Documentation

Once running, API documentation is available at:
- http://localhost:3001/api-docs (coming soon)

## 🐛 Troubleshooting

### "Internal Server Error" on first load
- This usually means dependencies aren't installed. Run `npm install`

### "Cannot connect to MongoDB"
- This is normal if MongoDB isn't installed. The app works without it.
- To use MongoDB, install and start it first.

### "Port already in use"
- Change the port in `.env` file: `PORT=3002`

### Authentication Issues
- Clear your browser's localStorage: Open DevTools → Application → Local Storage → Clear

## 🎯 Next Steps

1. Create your account
2. Click "New Project" to upload legacy code files
3. Run analysis to get AI-powered refactoring suggestions
4. Review and apply the suggested improvements
5. Download your modernized code

## 📧 Support

For issues or questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: [Full docs](./README.md)

---

**Note**: This is a development setup. For production deployment, please review the security settings and follow best practices for Node.js applications.