#!/bin/bash
set -e

echo "Install Ruby dependencies."
bundle install

echo "Install Node dependencies."
npm install

echo "Compile Tailwind CSS..."
npm run build:css

echo "Starting Tailwind in watch mode..."
npm run watch:css &

echo "Starting Jekyll..."
bundle exec jekyll serve --host 0.0.0.0 --livereload