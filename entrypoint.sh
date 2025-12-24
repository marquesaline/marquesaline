#!/bin/bash
set -e

echo "Installing Ruby dependencies..."
bundle install

echo "Starting Jekyll with live reload..."
bundle exec jekyll serve \
  --host 0.0.0.0 \
  --livereload \
  --force_polling \
  --incremental \
  --trace