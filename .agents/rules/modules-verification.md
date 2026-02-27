---
trigger: always_on
glob:
description: Rules for handling packages, requiring verification in node_modules and strict version compliance.
---

# Package and Module Verification Rules

When working with dependencies or npm packages in this project, you **MUST** strictly adhere to the following rules:

1. **Verify Packages**: If you do not have complete and absolute certainty about a specific package, its API, its exports, or its types, you **MUST** inspect the actual files inside `node_modules` (especially `node_modules/<package_name>/package.json` and its type definitions/index files) to verify its structure before using it.
2. **Strict Version Compliance**: You **MUST** adhere to the exact version of the packages currently installed in the project (as defined in `package.json` and `node_modules`). Do not assume APIs or features from newer or older versions of the package.
3. **No Blind Guessing**: **DO NOT** guess package imports, function signatures, available methods, or types. If you are unsure, you must use file exploration tools to check the source code or type definitions inside the `node_modules` directory first.
