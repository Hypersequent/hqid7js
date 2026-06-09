# Multi-Node version testing

`docker-test.sh` verifies that the published `hqid7` package works across the
supported Node.js versions. It builds and packs the package, then installs the
resulting tarball inside clean `node:<version>-alpine` containers and exercises:

- the `hqid7` CLI via a **global install** (`hqid7 --version`, `new`, `parse`),
- the `hqid7` CLI via **npx** (local install), and
- the **library import** ([`lib-smoke.mjs`](./lib-smoke.mjs)).

## Run

```bash
npm run test:node
# or directly:
bash mnode-test/docker-test.sh
```

Requires Docker. Pulls the `node:{20,22,24}-alpine` images on first run.

## Supported versions

Baseline is **Node 20**. hqid7 relies on the global Web Crypto API
(`crypto.getRandomValues`), which is only available unflagged from Node 19+, and
Node 18 is end-of-life. This matches the `engines` field in `package.json`.
