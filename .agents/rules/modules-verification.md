---
trigger: always_on
glob:
description:

Node Modules Verification Rule

When analyzing or modifying code that depends on packages inside `node_modules`:

1. The system MUST treat all external packages as opaque unless their actual source code has been explicitly inspected.
2. If the implementation inside `node_modules` is:
   - not opened,
   - not verified,
   - or partially known,

   then the behavior MUST be considered UNKNOWN.

3. The system MUST NOT:
   - guess internal logic,
   - infer undocumented behavior,
   - assume side effects,
   - fabricate implementation details.

4. Before making conclusions about a package behavior,
   the following MUST be checked:

   - Actual source inside `node_modules`
   - Official documentation
   - Type definitions (`.d.ts`)
   - Runtime inspection if necessary

5. If verification is not possible, the response MUST explicitly state:

   "Package behavior cannot be verified from available source."

6. Any assumption without verification is strictly prohibited.
---
