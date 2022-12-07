#!/bin/bash

# 'set -e' tells the shell to exit if any of the foreground command fails,
# i.e. exits with a non-zero status.
set -eu

# Initialize array of PIDs for the background jobs that we're about to launch.
pids=()

# Build all example projects in `examples` directory
# Usage: ./scripts/build-examples.bash

# Build all examples
for example in $(ls examples); do
   # Ignore files
    if [ ! -d "examples/$example" ]; then
        continue
    fi

  # Run a command in the background. We expect this command to fail.
  # We're spawning a new shell for it using (...)
  (
    echo "Building example: $example"
    cd "examples/$example"
    yarn install
    yarn build
  )&

  # Add the PID of this background job to the array.
  pids+=($!)
done

# Wait until all background jobs are done.
for pid in "${pids[@]}"; do
  wait "$pid"
done