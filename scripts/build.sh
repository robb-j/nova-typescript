#!/usr/bin/env bash

# Ensure the build fails if TypeScript fails
set -e

# Install development dependencies
npm install --no-audit

# Install extension dependencies for development
npm --prefix TypeScript.novaextension install --no-audit

# Build TypeScript into JavaScript after linting
npx tsc
