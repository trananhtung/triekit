interface TrieNode<V> {
  children: Map<string, TrieNode<V>>;
  value: V | undefined;
  isEnd: boolean;
}

function makeNode<V>(): TrieNode<V> {
  return { children: new Map(), value: undefined, isEnd: false };
}

/**
 * Standard Trie (prefix tree) with O(k) insert/get/delete (k = key length).
 *
 * Supports:
 * - `insert` / `get` / `has` / `delete`
 * - `keysWithPrefix` — all keys starting with a prefix
 * - `entriesWithPrefix` — all [key, value] pairs under a prefix
 * - `longestPrefix` — longest key that is a prefix of the given string
 * - `startsWith` — does any key start with this prefix?
 * - `keys` / `values` / `entries` — full iteration
 * - `size` — number of entries
 *
 * Port of Python pytrie / Java Apache Commons PatriciaTrie.
 *
 * @example
 * const t = new Trie<number>();
 * t.insert("apple", 1).insert("app", 2).insert("apply", 3);
 * t.keysWithPrefix("app");  // ["app", "apple", "apply"]
 * t.longestPrefix("applesauce");  // "apple"
 */
export class Trie<V = undefined> {
  private _root: TrieNode<V> = makeNode<V>();
  private _size = 0;

  /**
   * Insert a key-value pair. If the key already exists, its value is replaced.
   * Returns `this` for chaining.
   */
  insert(key: string, value: V): this {
    let node = this._root;
    for (const ch of key) {
      let child = node.children.get(ch);
      if (!child) { child = makeNode<V>(); node.children.set(ch, child); }
      node = child;
    }
    if (!node.isEnd) this._size++;
    node.isEnd = true;
    node.value = value;
    return this;
  }

  /** Returns the value for the key, or `undefined` if not found. */
  get(key: string): V | undefined {
    const node = this._find(key);
    return node?.isEnd ? node.value : undefined;
  }

  /** Returns `true` if the exact key exists. */
  has(key: string): boolean {
    const node = this._find(key);
    return node?.isEnd === true;
  }

  /**
   * Delete a key. Returns `true` if the key existed and was deleted.
   * Prunes dead-end nodes to free memory.
   */
  delete(key: string): boolean {
    return this._delete(this._root, key, 0);
  }

  private _delete(node: TrieNode<V>, key: string, depth: number): boolean {
    if (depth === key.length) {
      if (!node.isEnd) return false;
      node.isEnd = false;
      node.value = undefined;
      this._size--;
      return true;
    }
    const ch = key[depth]!;
    const child = node.children.get(ch);
    if (!child) return false;
    const deleted = this._delete(child, key, depth + 1);
    if (deleted && !child.isEnd && child.children.size === 0) {
      node.children.delete(ch);
    }
    return deleted;
  }

  /**
   * Returns `true` if any stored key starts with `prefix`.
   * (Does NOT require an exact key match — use `has()` for that.)
   */
  startsWith(prefix: string): boolean {
    return this._find(prefix) !== null;
  }

  /** All keys that start with `prefix`, in insertion order. */
  keysWithPrefix(prefix: string): string[] {
    const node = this._find(prefix);
    if (!node) return [];
    const result: string[] = [];
    this._collect(node, prefix, result);
    return result;
  }

  /** All [key, value] pairs whose key starts with `prefix`. */
  entriesWithPrefix(prefix: string): [string, V][] {
    const node = this._find(prefix);
    if (!node) return [];
    const result: [string, V][] = [];
    this._collectEntries(node, prefix, result);
    return result;
  }

  /**
   * Returns the longest stored key that is a prefix of `str`,
   * or `undefined` if no stored key is a prefix of `str`.
   *
   * @example
   * t.insert("he", 1); t.insert("hello", 2); t.insert("hell", 3);
   * t.longestPrefix("helloworld"); // "hello"
   */
  longestPrefix(str: string): string | undefined {
    let node = this._root;
    let last: string | undefined;
    let prefix = "";
    for (const ch of str) {
      const child = node.children.get(ch);
      if (!child) break;
      prefix += ch;
      if (child.isEnd) last = prefix;
      node = child;
    }
    return last;
  }

  /**
   * All stored keys that are prefixes of `str` (including exact match if present).
   *
   * @example
   * t.insert("a", 0); t.insert("an", 1); t.insert("ant", 2);
   * t.prefixesOf("antenna"); // ["a", "an"]
   */
  prefixesOf(str: string): string[] {
    const result: string[] = [];
    let node = this._root;
    let prefix = "";
    for (const ch of str) {
      const child = node.children.get(ch);
      if (!child) break;
      prefix += ch;
      if (child.isEnd) result.push(prefix);
      node = child;
    }
    return result;
  }

  /** All stored keys. */
  keys(): string[] {
    const result: string[] = [];
    this._collect(this._root, "", result);
    return result;
  }

  /** All stored values, in key order. */
  values(): V[] {
    return this.entries().map(([, v]) => v);
  }

  /** All [key, value] pairs. */
  entries(): [string, V][] {
    const result: [string, V][] = [];
    this._collectEntries(this._root, "", result);
    return result;
  }

  [Symbol.iterator](): Iterator<[string, V]> {
    return this.entries()[Symbol.iterator]();
  }

  /** Remove all entries. */
  clear(): void {
    this._root = makeNode<V>();
    this._size = 0;
  }

  get size(): number { return this._size; }

  private _find(prefix: string): TrieNode<V> | null {
    let node = this._root;
    for (const ch of prefix) {
      const child = node.children.get(ch);
      if (!child) return null;
      node = child;
    }
    return node;
  }

  private _collect(node: TrieNode<V>, prefix: string, result: string[]): void {
    if (node.isEnd) result.push(prefix);
    for (const [ch, child] of node.children) this._collect(child, prefix + ch, result);
  }

  private _collectEntries(node: TrieNode<V>, prefix: string, result: [string, V][]): void {
    if (node.isEnd) result.push([prefix, node.value as V]);
    for (const [ch, child] of node.children) this._collectEntries(child, prefix + ch, result);
  }
}
