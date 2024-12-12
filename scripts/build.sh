#!/usr/bin/env bash

# Ensure the build fails if TypeScript fails
set -e

# Install extension dependencies for development
npm --prefix TypeScript.novaextension i --no-audit

# Build TypeScript into JavaScript after linting
npx tsc
