#!/bin/bash
set -e

# Set npm configuration for Vercel environment
export NPM_CONFIG_LEGACY_PEER_DEPS=true
export NPM_CONFIG_STRICT_PEER_DEPENDENCIES=false
export NPM_CONFIG_AUTO_INSTALL_PEERS=true

# Install dependencies with legacy peer deps
npm install --legacy-peer-deps --no-audit --no-fund

# Build the project
npm run build 