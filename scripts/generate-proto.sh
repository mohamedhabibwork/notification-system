#!/bin/bash

# Script to generate TypeScript files from Proto definitions
# Requires protoc and ts-proto plugin

set -e

echo "🔧 Generating TypeScript from Proto definitions..."

# Check if protoc is installed
if ! command -v protoc &> /dev/null; then
    echo "❌ protoc not found. Please install Protocol Buffers compiler."
    echo "   macOS: brew install protobuf"
    echo "   Linux: apt-get install protobuf-compiler"
    exit 1
fi

# Check if ts-proto is installed
if [ ! -f "node_modules/.bin/protoc-gen-ts_proto" ]; then
    echo "❌ ts-proto not found. Installing..."
    npm install --save-dev ts-proto
fi

# Create output directory
mkdir -p src/grpc/generated

# Generate TypeScript files
protoc \
  --plugin=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=./src/grpc/generated \
  --ts_proto_opt=nestJs=true \
  --ts_proto_opt=addGrpcMetadata=true \
  --ts_proto_opt=addNestjsRestParameter=true \
  --ts_proto_opt=outputServices=grpc-js \
  --proto_path=./proto \
  ./proto/*.proto

echo "✅ Proto generation complete! Files generated in src/grpc/generated/"
