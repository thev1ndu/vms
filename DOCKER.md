# Docker Setup for Agent

This project includes Docker configuration for easy deployment and development.

## Quick Start

1. **Build and run the application:**

   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Application: http://localhost:3000
   - MongoDB: localhost:27017

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb://root:mongoo@localhost:27017/agent-vms?authSource=admin

# Authentication Configuration (Better Auth)
BETTER_AUTH_SECRET=your-secret-key-here-change-this-in-production
BETTER_AUTH_URL=http://localhost:3000

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# Application Configuration
NODE_ENV=development
```

## Docker Commands

### Development

```bash
# Start services
docker-compose up

# Start services in background
docker-compose up -d

# Rebuild and start
docker-compose up --build
```

### Production

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Start production services
docker-compose -f docker-compose.yml up -d
```

### Maintenance

```bash
# View logs
docker-compose logs -f app
docker-compose logs -f mongo

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: This will delete all data)
docker-compose down -v

# Rebuild specific service
docker-compose build app
```

## Services

### MongoDB (mongo)

- **Port:** 27017
- **Username:** root
- **Password:** mongoo
- **Database:** agent-vms
- **Volume:** mongo-data (persistent storage)

### Next.js App (app)

- **Port:** 3000
- **Environment:** Production
- **Dependencies:** MongoDB
- **Build:** Multi-stage Docker build

## File Structure

```
├── Dockerfile              # Next.js app container definition
├── docker-compose.yml      # Multi-service orchestration
├── .dockerignore          # Files to exclude from Docker build
└── next.config.ts         # Next.js configuration (standalone output)
```

## Troubleshooting

### Common Issues

1. **Port conflicts:**

   - Ensure ports 3000 and 27017 are not in use
   - Change ports in docker-compose.yml if needed

2. **MongoDB connection issues:**

   - Check if MongoDB container is running: `docker-compose ps`
   - Verify MONGODB_URI in environment variables

3. **Build failures:**

   - Clear Docker cache: `docker system prune -a`
   - Rebuild without cache: `docker-compose build --no-cache`

4. **Permission issues:**
   - Ensure Docker has proper permissions
   - On Linux: `sudo usermod -aG docker $USER`

### Development vs Production

- **Development:** Use `docker-compose up` for live reloading
- **Production:** Use `docker-compose up -d` for background services
- **Environment:** Set `NODE_ENV=production` for optimized builds

## Security Notes

- Change default MongoDB credentials in production
- Use strong secrets for authentication
- Consider using Docker secrets for sensitive data
- Enable MongoDB authentication in production environments
