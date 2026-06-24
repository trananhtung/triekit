# triekit

[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)

> Zero-dependency TypeScript Trie (prefix tree) and RadixTrie (compressed trie).
> Autocomplete · Prefix search · Longest-prefix match · Spell checking

[![npm](https://img.shields.io/npm/v/triekit)](https://www.npmjs.com/package/triekit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

TypeScript port of Python's [pytrie](https://pypi.org/project/pytrie/) and Java's Apache Commons [PatriciaTrie](https://commons.apache.org/proper/commons-collections/apidocs/org/apache/commons/collections4/trie/PatriciaTrie.html). No existing npm trie package has been updated since 2021.

## Install

```bash
npm install triekit
```

## When to use which

| Class | Best for |
|---|---|
| `Trie` | General prefix matching, dictionaries, autocomplete |
| `RadixTrie` | Keys with long shared prefixes (URLs, file paths, IPs) — uses less memory |

Both classes have the same API.

## Trie

```typescript
import { Trie } from "triekit";

const t = new Trie<number>();
t.insert("apple", 1).insert("app", 2).insert("apply", 3).insert("banana", 4);

t.get("apple");              // 1
t.has("app");                // true
t.has("ap");                 // false — no exact match
t.startsWith("app");         // true — any key starts with "app"

// Autocomplete
t.keysWithPrefix("app");     // ["app", "apple", "apply"] (not "banana")

// All [key, value] pairs under a prefix
t.entriesWithPrefix("app");  // [["app",2], ["apple",1], ["apply",3]]

// Longest stored key that is a prefix of the given string
t.longestPrefix("applesauce"); // "apple"

// All stored keys that are prefixes of the given string
t.prefixesOf("applesauce");    // ["app", "apple"]

t.delete("apple");           // true
t.size;                      // 3
```

## RadixTrie — compressed trie

A Patricia/Radix trie that collapses single-child chains into single edges. Significantly less memory for keys with long common prefixes.

```typescript
import { RadixTrie } from "triekit";

const routes = new RadixTrie<string>();
routes.insert("/api/", "api-root");
routes.insert("/api/users/", "users-list");
routes.insert("/api/users/admin/", "admin");

routes.longestPrefix("/api/users/admin/settings"); // "/api/users/admin/"
routes.longestPrefix("/api/users/bob");            // "/api/users/"
routes.keysWithPrefix("/api/");                    // all three routes
```

## Use cases

### Autocomplete

```typescript
const t = new Trie<string[]>();
const words = ["search", "searching", "searcher", "seal", "season"];
words.forEach(w => t.insert(w, []));

function suggest(prefix: string, max = 5): string[] {
  return t.keysWithPrefix(prefix).slice(0, max);
}

suggest("sea");   // ["seal", "season", "search", "searcher", "searching"]
suggest("sear");  // ["search", "searcher", "searching"]
```

### Spell checking / dictionary lookup

```typescript
const dictionary = new Trie<true>();
// ... insert 100k words ...
dictionary.has("colour");         // true
dictionary.has("colur");          // false
dictionary.startsWith("un");      // true (under, undo, ...)
```

### IP prefix matching (CIDR routing table)

```typescript
const routes = new RadixTrie<string>();
routes.insert("192.", "default");
routes.insert("192.168.", "lan");
routes.insert("192.168.1.", "subnet-1");

routes.longestPrefix("192.168.1.100"); // "192.168.1." → subnet-1
routes.longestPrefix("192.168.2.5");   // "192.168." → lan
routes.longestPrefix("10.0.0.1");      // undefined
```

### Find all prefixes of a string

```typescript
const t = new Trie<number>();
t.insert("a", 0).insert("an", 1).insert("ant", 2).insert("antenna", 3);
t.prefixesOf("antenna");  // ["a", "an", "ant", "antenna"]
t.prefixesOf("ante");     // ["a", "an", "ant"]
```

## API Reference

Both `Trie<V>` and `RadixTrie<V>` share the same interface:

```typescript
// Insert / retrieve
.insert(key: string, value: V): this      // chainable
.get(key: string): V | undefined
.has(key: string): boolean
.delete(key: string): boolean             // true if key existed; prunes dead nodes

// Prefix queries
.startsWith(prefix: string): boolean      // any key starts with prefix?
.keysWithPrefix(prefix: string): string[]
.entriesWithPrefix(prefix: string): [string, V][]

// Substring / overlay queries
.longestPrefix(str: string): string | undefined   // longest stored key that is a prefix of str
.prefixesOf(str: string): string[]                // all stored keys that are prefixes of str

// Iteration
.keys(): string[]
.values(): V[]
.entries(): [string, V][]
[Symbol.iterator](): Iterator<[string, V]>

// Housekeeping
.clear(): void
.size: number
```

## Comparison with alternatives

| Package | Zero deps | TypeScript | Trie | RadixTrie | Actively maintained |
|---|---|---|---|---|---|
| **triekit** | ✅ | ✅ | ✅ | ✅ | ✅ |
| trie-typed | ❌ | ✅ | ✅ | ❌ | ❌ (10 dl/week) |
| trie-search | ✅ | ❌ | ✅ | ❌ | ❌ (last 2021) |
| triejs | ✅ | ❌ | ✅ | ❌ | ❌ (last 2013) |
| Python pytrie | n/a | n/a | ✅ | ✅ | ✅ |

## Contributors ✨

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind are welcome — code, docs, bug reports, ideas, reviews! See the [emoji key](https://allcontributors.org/docs/en/emoji-key) for how each contribution is recognized, and open a PR or issue to get involved.

Thanks goes to these wonderful people:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/trananhtung"><img src="https://avatars.githubusercontent.com/u/30992229?v=4?s=100" width="100px;" alt="Tung Tran"/><br /><sub><b>Tung Tran</b></sub></a><br /><a href="https://github.com/trananhtung/./commits?author=trananhtung" title="Code">💻</a> <a href="#maintenance-trananhtung" title="Maintenance">🚧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## License

MIT © [trananhtung](https://github.com/trananhtung)
