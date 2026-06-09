#!/bin/bash
#
# Multi-Node version testing for hqid7.
#
# Builds and packs the package, then installs the resulting tarball inside
# clean `node:<version>-alpine` containers to verify it works across supported
# Node versions — both the `hqid7` CLI (global install + npx) and the library
# import (ESM).
#
# Baseline is Node 20: hqid7 relies on the global Web Crypto API
# (`crypto.getRandomValues`), which is only available unflagged from Node 19+,
# and Node 18 is end-of-life.

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TMP_DIR="${SCRIPT_DIR}/tmp"

echo "========================================"
echo "Multi-Node Version Testing for hqid7"
echo "========================================"
echo ""

cleanup() {
    echo "Cleaning up temporary directory..."
    rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

rm -rf "${TMP_DIR}"
mkdir -p "${TMP_DIR}"

echo "Building and packing hqid7..."
cd "${PROJECT_DIR}"

# Build the project, then create the package tarball.
npm run build
npm pack

# The tarball is named hqid7-<version>.tgz.
PACKAGE_FILE=$(ls -t hqid7-*.tgz | head -n1)
if [ -z "$PACKAGE_FILE" ]; then
    echo "Error: Failed to create package tarball"
    exit 1
fi

mv "${PACKAGE_FILE}" "${TMP_DIR}/"
cp "${SCRIPT_DIR}/lib-smoke.mjs" "${TMP_DIR}/"

echo "✓ Package created: ${PACKAGE_FILE}"
echo ""

EXPECTED_VERSION=$(node -p "require('${PROJECT_DIR}/package.json').version")
echo "Expected version: ${EXPECTED_VERSION}"
echo ""

NODE_VERSIONS=("20" "22" "24")

# On Linux, files created by the root user inside the container need their
# ownership restored on the mounted volume so host-side cleanup can remove them.
FIX_PERMS="true"
if [ "$(uname)" = "Linux" ]; then
    FIX_PERMS="chown -R $(id -u):$(id -g) /test"
fi

for VERSION in "${NODE_VERSIONS[@]}"; do
    echo "Testing with Node.js v${VERSION}..."
    echo "----------------------------------------"

    # Global installation: exercise the `hqid7` CLI.
    docker run --rm \
        -v "${TMP_DIR}:/test" \
        -w /test \
        "node:${VERSION}-alpine" \
        sh -c "
            set -e
            echo '→ Installing hqid7 globally...'
            npm install -g ${PACKAGE_FILE}

            echo '→ hqid7 --version'
            hqid7 --version
            VERSION_OUTPUT=\$(hqid7 --version)
            if [ \"\$VERSION_OUTPUT\" != \"${EXPECTED_VERSION}\" ]; then
                echo \"Error: Version mismatch! Expected ${EXPECTED_VERSION}, got \$VERSION_OUTPUT\"
                exit 1
            fi

            echo '→ hqid7 new'
            ID=\$(hqid7 new)
            echo \"  generated: \$ID\"
            if [ \${#ID} -ne 23 ]; then
                echo \"Error: expected a 23-char id, got '\$ID' (\${#ID} chars)\"
                exit 1
            fi

            echo '→ hqid7 parse <id>'
            hqid7 parse \"\$ID\" > /dev/null

            echo '✓ Global CLI works correctly'
        "

    # Local installation: exercise npx and the library import.
    docker run --rm \
        -v "${TMP_DIR}:/test" \
        -w /test \
        "node:${VERSION}-alpine" \
        sh -c "
            set -e
            echo '→ Installing hqid7 locally...'
            npm init -y > /dev/null 2>&1
            npm install ${PACKAGE_FILE} > /dev/null 2>&1

            echo '→ npx hqid7 --version'
            VERSION_OUTPUT=\$(npx hqid7 --version)
            echo \"  \$VERSION_OUTPUT\"
            if [ \"\$VERSION_OUTPUT\" != \"${EXPECTED_VERSION}\" ]; then
                echo \"Error: Version mismatch! Expected ${EXPECTED_VERSION}, got \$VERSION_OUTPUT\"
                exit 1
            fi

            echo '→ library import smoke test'
            node /test/lib-smoke.mjs

            ${FIX_PERMS} || true
        "

    echo "✓ Node.js v${VERSION}: PASSED"
    echo ""
done

echo "========================================"
echo "All Node versions passed successfully!"
echo "========================================"
