#!/bin/bash
set -e

echo "Install Ruby dependencies."
bundle install

echo "Starting Jekyll..."
bundle exec jekyll serve --host 0.0.0.0 --livereload
