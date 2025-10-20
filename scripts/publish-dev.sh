#!/bin/bash
set -e

# Script to publish development versions of packages
# Usage: ./scripts/publish-dev.sh

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Publishing development packages...${NC}"

# Extract branch name
if [ -n "$GITHUB_REF" ]; then
  BRANCH_NAME="${GITHUB_REF#refs/heads/}"
else
  BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
fi

# Sanitize branch name for npm version (replace / with -)
SAFE_BRANCH_NAME=$(echo "$BRANCH_NAME" | sed 's/\//-/g')

# Get timestamp
TIMESTAMP=$(date +%Y%m%d)

# Build number from GitHub or git commit
if [ -n "$GITHUB_RUN_NUMBER" ]; then
  BUILD_NUMBER="$(git rev-parse --short HEAD).$GITHUB_RUN_NUMBER"
else
  BUILD_NUMBER=$(git rev-parse --short HEAD)
fi

echo -e "${BLUE}Branch:${NC} $SAFE_BRANCH_NAME"
echo -e "${BLUE}Timestamp:${NC} $TIMESTAMP"
echo -e "${BLUE}Build:${NC} $BUILD_NUMBER"
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
      # First dev publish: bump minor version
      BASE_VERSION=$(node -p "
        const ver = '${CURRENT_VERSION}'.split('.');
        const major = ver[0];
        const minor = ver[1];
        const patch = ver[2];
        const newPatch = parseInt('${CURRENT_VERSION}'.split('-')[0]) + 1;
        \`\${major}.\${minor}.\${newPatch}\`;
      ")
      echo -e "${BLUE}First dev publish - bumping minor version${NC}"
    else
      # Subsequent dev publish: strip existing -dev.* suffix to prevent duplication
      BASE_VERSION="${CURRENT_VERSION%%-dev.*}"
    fi
    
    DEV_VERSION="${BASE_VERSION}-dev.${SAFE_BRANCH_NAME}.${TIMESTAMP}.${BUILD_NUMBER}"
    
    echo -e "${GREEN}Updating ${PACKAGE_NAME}:${NC} ${CURRENT_VERSION} → ${DEV_VERSION}"
    
    # Update version in package.json without git tag
    cd "$package_dir"
    npm version "$DEV_VERSION" --no-git-tag-version --allow-same-version
    cd - > /dev/null
    
    # Track published package info
    PUBLISHED_PACKAGES+=("${PACKAGE_NAME}@${DEV_VERSION}")
  fi
}

# Update all publishable packages
echo -e "${BLUE}Updating package versions...${NC}"
for package_dir in packages/*/; do
  update_package_version "$package_dir"
done

echo ""
echo -e "${BLUE}Publishing packages with 'dev' tag...${NC}"

# Publish all packages with dev tag
pnpm -r --filter './packages/**' publish --tag dev --access public --no-git-checks

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
