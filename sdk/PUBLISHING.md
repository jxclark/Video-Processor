# Publishing the SDK to npm

## Prerequisites

1. Create an npm account at https://www.npmjs.com/signup
2. Login to npm: `npm login`

## Steps to Publish

### 1. Update Package Name

Edit `package.json` and change the package name to something unique:

```json
{
  "name": "@your-username/video-processor-sdk",
  // or
  "name": "video-processor-sdk-yourcompany",
  "version": "1.0.0"
}
```

### 2. Build the SDK

```bash
cd sdk
npm install
npm run build
```

This creates the `dist/` folder with compiled JavaScript and type definitions.

### 3. Test Locally First

In another project, test the local installation:

```bash
npm install /path/to/video-processor/sdk
```

### 4. Publish to npm

```bash
cd sdk
npm publish --access public
```

If using a scoped package (@your-username/package), you need `--access public` for free accounts.

### 5. Users Can Now Install

```bash
npm install @your-username/video-processor-sdk
```

## Alternative: Private npm Registry

If you don't want to publish publicly:

### Option A: GitHub Packages

1. Update `package.json`:
```json
{
  "name": "@your-github-username/video-processor-sdk",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

2. Publish:
```bash
npm publish
```

3. Users install with:
```bash
npm install @your-github-username/video-processor-sdk
```

### Option B: Git Repository

Users can install directly from git:

```bash
# From GitHub
npm install git+https://github.com/username/video-processor.git#main:sdk

# From private repo (requires SSH key)
npm install git+ssh://git@github.com/username/video-processor.git#main:sdk
```

## Version Management

When you make updates:

```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major

# Then publish
npm publish
```

## What Gets Published

The `.npmignore` or `.gitignore` determines what's included. By default:
- ✅ `dist/` folder (compiled code)
- ✅ `package.json`
- ✅ `README.md`
- ❌ `src/` folder (source code)
- ❌ `node_modules/`
- ❌ `examples/`

To include examples, create `.npmignore`:
```
node_modules/
src/
*.log
.env
```
