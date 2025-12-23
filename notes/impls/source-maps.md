# Source maps

- In JS SDK, allow uploading source map for an app
- This will be done through a CLI bundled with js sdk
- it will take app id, app client token, an artifact tag which is user provided, e.g., project name, an optional artifact version that is semver string, a file or folder path
- the cli can use commander, maybe program/sub-program `fimidx logs upload-source-map --app-id <appId> --client-token <clientToken> --name <name> --version <version> `
- the cli should use the fimidara sdk, particularly it's cli, it has an up command to upload
- it should first compress the

## Sections

- CLI bundled with js sdk for uploading source maps
- UI for setting which fields in logs represent artifact name and version, and what fields should be source map replaced
- Server for processing logs before surfacing them
