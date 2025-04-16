# Smart Health Hub

## Deployment Instructions

1. Upload all files in this folder to your server
2. Run the following commands:

```bash
# Install dependencies
npm install --omit=dev

# Start the server
NODE_ENV=production npm start
```

Or simply run the startup script:

```bash
./start.sh
```

The server will start on port 3000 by default.
You can customize the port by setting the PORT environment variable.

## Features

- Comprehensive healthcare interoperability platform
- FHIR R4 compatible
- Advanced security features
- Specialized portals for different stakeholders
