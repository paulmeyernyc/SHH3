#!/bin/bash
# Smart Health Hub Startup Script
echo "Starting Smart Health Hub..."
npm install --omit=dev
NODE_ENV=production npm start
