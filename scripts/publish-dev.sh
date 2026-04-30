#!/bin/bash
set -e

# Script to publish development versions of packages
# Usage: ./scripts/publish-dev.sh

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Publishing development packages...${NC}"

SHORT_HASH=$(git rev-parse --short=8 HEAD)

# Check if VERSION_SUFFIX is provided (manual workflow)
if [ -n "$VERSION_SUFFIX" ]; then
  echo -e "${BLUE}Using manual version suffix:${NC} $VERSION_SUFFIX"
  DEV_TAG="dev-${VERSION_SUFFIX}"
  # Append 8-character hash from git commit
  VERSION_ID="${VERSION_SUFFIX}.${SHORT_HASH}"
else
  # Auto mode: use only short hash
  DEV_TAG="dev"
  VERSION_ID="${SHORT_HASH}"
fi

echo -e "${BLUE}Tag:${NC} $DEV_TAG"
echo -e "${BLUE}Version ID:${NC} $VERSION_ID"
echo ""

# Array to track published packages
declare -a PUBLISHED_PACKAGES=()

# Function to update package version
update_package_version() {
  local package_dir="${1%/}"  # Remove trailing slash
  local package_json="${package_dir}/package.json"
  
  if [ -f "$package_json" ]; then
    # Use ./ prefix for relative paths in require()
    PACKAGE_NAME=$(node -p "require('./${package_json}').name")
    CURRENT_VERSION=$(node -p "require('./${package_json}').version")
    
    # Check if this is the first dev publish (version doesn't have -dev suffix)
    if [[ ! "$CURRENT_VERSION" =~ -dev\. ]]; then
      # Dev publish: bump patch version
      BASE_VERSION=$(node -p "
        const ver = '${CURRENT_VERSION}'.split('.');
        const major = ver[0];
        const minor = ver[1];
        const patch = ver[2];
        const newPatch = parseInt(patch.split('-')[0]) + 1;
        \`\${major}.\${minor}.\${newPatch}\`;
      ")
      echo -e "${BLUE}dev publish - bumping patch version${NC}"
    else
      # Subsequent dev publish: strip existing -dev.* suffix to prevent duplication
      BASE_VERSION="${CURRENT_VERSION%%-dev.*}"
    fi
    
    DEV_VERSION="${BASE_VERSION}-dev.${VERSION_ID}"
    
    echo -e "${GREEN}Updating ${PACKAGE_NAME}:${NC} ${CURRENT_VERSION} → ${DEV_VERSION}"
    
    # Update version in package.json without git tag
    cd "$package_dir"
    npm version "$DEV_VERSION" --no-git-tag-version --allow-same-version
    cd - > /dev/null
    
    # Track published package info
    PUBLISHED_PACKAGES+=("${PACKAGE_NAME}@${DEV_VERSION}")
  fi
}

# Packages to exclude from publishing
EXCLUDED_PACKAGES=("pre" "test-utils")

# Function to check if package should be excluded
is_excluded() {
  local package_name="$1"
  for excluded in "${EXCLUDED_PACKAGES[@]}"; do
    if [ "$package_name" = "$excluded" ]; then
      return 0  # true, is excluded
    fi
  done
  return 1  # false, not excluded
}

# Update all publishable packages
echo -e "${BLUE}Updating package versions...${NC}"
for package_dir in packages/*/; do
  package_name=$(basename "$package_dir")
  if is_excluded "$package_name"; then
    echo -e "${BLUE}Skipping excluded package:${NC} $package_name"
    continue
  fi
  update_package_version "$package_dir"
done

echo ""
echo -e "${BLUE}Publishing packages with '${DEV_TAG}' tag...${NC}"

# Build filter to exclude specific packages
FILTER_ARGS=""
for excluded in "${EXCLUDED_PACKAGES[@]}"; do
  FILTER_ARGS="$FILTER_ARGS --filter '!@nucypher/${excluded}'"
done

# Publish all packages except excluded ones with the appropriate dev tag
eval "pnpm -r --filter './packages/**' $FILTER_ARGS publish --tag ${DEV_TAG} --access public --no-git-checks"

echo ""
echo -e "${BLUE}Restoring original package.json versions...${NC}"

# Restore original versions in package.json files
git checkout packages/*/package.json 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Dev packages published successfully!${NC}"
echo ""
echo -e "${BLUE}📦 Published versions:${NC}"
for pkg in "${PUBLISHED_PACKAGES[@]}"; do
  echo "  • $pkg"
done

# Write published packages to file for GitHub Actions to read
if [ -n "$GITHUB_OUTPUT" ]; then
  echo "published_packages<<EOF" >> $GITHUB_OUTPUT
  for pkg in "${PUBLISHED_PACKAGES[@]}"; do
    echo "$pkg" >> $GITHUB_OUTPUT
  done
  echo "EOF" >> $GITHUB_OUTPUT
fi

echo ""
echo -e "${BLUE}Install with:${NC}"
echo "  pnpm add @nucypher/taco@dev"
echo "  pnpm add @nucypher/shared@dev"
echo "  pnpm add @nucypher/taco-auth@dev"
