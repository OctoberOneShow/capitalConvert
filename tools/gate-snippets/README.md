# Gate snippets

One file per game: the verify-levels gate for that game's expanded tier,
staged here so it can be written and iterated without touching
`tools/verify-levels.js` (the orchestrator inlines finished snippets into it).

A snippet is a CommonJS module exporting one function:

```js
"use strict";

/* <slug>: what the gate proves and why the bar is what it is. */
module.exports = function gate(ctx) {
  const { App, env, check, fs, path, root } = ctx;
  // ... checks ...
};
```

`check(caseName, label, ok, detail)` records one assertion exactly the way
`tools/verify-levels.js` does. `App` is the booted application (the same boot
verify-levels performs), `env` is the stub environment (`env.byId`,
`env.dispatch`, `env.store`, `env.timers`), and `fs`/`path`/`root` locate the
repo. The snippet may `require()` its game's forge from `path.join(root,
"tools", "<slug>-forge.js")`.

Run one snippet against the real booted app:

```
node tools/gate-snippets/_runner.js <slug>
```

A snippet that passes here gets inlined into verify-levels.js by the
orchestrator; keep the file the single source of truth until then.
