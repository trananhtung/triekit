/**
 * RadixTrie (Patricia trie / compressed trie).
 *
 * Compresses chains of single-child nodes into a single edge labeled with
 * the shared prefix string. This uses far less memory when keys share long
 * common prefixes (e.g. URLs, file paths, domain names).
 *
 * Same API as Trie<V>. Time complexity: O(k) per operation (k = key length).
 *
 * @example
 * const t = new RadixTrie<number>();
 * t.insert("/api/users", 1).insert("/api/users/:id", 2).insert("/api/posts", 3);
 * t.keysWithPrefix("/api/users"); // ["/api/users", "/api/users/:id"]
 */

interface RadixNode<V> {
  /** Edge label — the compressed shared string leading to this node. */
  label: string;
  children: Map<string, RadixNode<V>>;
  value: V | undefined;
  isEnd: boolean;
}

function makeRadix<V>(label = ""): RadixNode<V> {
  return { label, children: new Map(), value: undefined, isEnd: false };
}

function commonPrefixLen(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

export class RadixTrie<V = undefined> {
  private _root: RadixNode<V> = makeRadix<V>();
  private _size = 0;

  insert(key: string, value: V): this {
    this._insert(this._root, key, value);
    return this;
  }

  private _insert(node: RadixNode<V>, remaining: string, value: V): void {
    if (remaining.length === 0) {
      if (!node.isEnd) this._size++;
      node.isEnd = true;
      node.value = value;
      return;
    }

    const firstCh = remaining[0]!;
    const child = node.children.get(firstCh);

    if (!child) {
      const newNode = makeRadix<V>(remaining);
      newNode.isEnd = true;
      newNode.value = value;
      node.children.set(firstCh, newNode);
      this._size++;
      return;
    }

    const cpLen = commonPrefixLen(child.label, remaining);

    if (cpLen === child.label.length) {
      // Remaining key descends into this child
      this._insert(child, remaining.slice(cpLen), value);
      return;
    }

    // Split: create a new intermediate node with shared prefix
    const shared = child.label.slice(0, cpLen);
    const splitNode = makeRadix<V>(shared);

    // Old child gets the suffix of its label
    const oldSuffix = child.label.slice(cpLen);
    child.label = oldSuffix;
    splitNode.children.set(oldSuffix[0]!, child);

    // New key gets its suffix
    const newSuffix = remaining.slice(cpLen);
    if (newSuffix.length === 0) {
      splitNode.isEnd = true;
      splitNode.value = value;
      this._size++;
    } else {
      const newLeaf = makeRadix<V>(newSuffix);
      newLeaf.isEnd = true;
      newLeaf.value = value;
      splitNode.children.set(newSuffix[0]!, newLeaf);
      this._size++;
    }

    node.children.set(firstCh, splitNode);
  }

  get(key: string): V | undefined {
    const [node] = this._find(key);
    return node?.isEnd ? node.value : undefined;
  }

  has(key: string): boolean {
    const [node] = this._find(key);
    return node?.isEnd === true;
  }

  delete(key: string): boolean {
    return this._delete(this._root, key);
  }

  private _delete(node: RadixNode<V>, remaining: string): boolean {
    if (remaining.length === 0) {
      if (!node.isEnd) return false;
      node.isEnd = false;
      node.value = undefined;
      this._size--;
      return true;
    }

    const firstCh = remaining[0]!;
    const child = node.children.get(firstCh);
    if (!child) return false;

    if (!remaining.startsWith(child.label)) return false;

    const deleted = this._delete(child, remaining.slice(child.label.length));
    if (!deleted) return false;

    // Prune or merge single-child non-end node
    if (!child.isEnd) {
      if (child.children.size === 0) {
        node.children.delete(firstCh);
      } else if (child.children.size === 1) {
        const [grandCh, grandChild] = child.children.entries().next().value as [string, RadixNode<V>];
        grandChild.label = child.label + grandChild.label;
        node.children.set(firstCh, grandChild);
        void grandCh;
      }
    }
    return true;
  }

  startsWith(prefix: string): boolean {
    return this._findPrefix(prefix) !== null;
  }

  keysWithPrefix(prefix: string): string[] {
    const [node, accumulated] = this._findPrefixWithPath(prefix);
    if (!node) return [];
    const result: string[] = [];
    this._collect(node, accumulated, result);
    return result;
  }

  entriesWithPrefix(prefix: string): [string, V][] {
    const [node, accumulated] = this._findPrefixWithPath(prefix);
    if (!node) return [];
    const result: [string, V][] = [];
    this._collectEntries(node, accumulated, result);
    return result;
  }

  longestPrefix(str: string): string | undefined {
    let node = this._root;
    let consumed = 0;
    let last: string | undefined;

    while (consumed < str.length) {
      const firstCh = str[consumed]!;
      const child = node.children.get(firstCh);
      if (!child) break;
      const cpLen = commonPrefixLen(child.label, str.slice(consumed));
      if (cpLen < child.label.length) break;
      consumed += cpLen;
      if (child.isEnd) last = str.slice(0, consumed);
      node = child;
    }
    return last;
  }

  prefixesOf(str: string): string[] {
    const result: string[] = [];
    let node = this._root;
    let consumed = 0;

    while (consumed < str.length) {
      const firstCh = str[consumed]!;
      const child = node.children.get(firstCh);
      if (!child) break;
      const cpLen = commonPrefixLen(child.label, str.slice(consumed));
      if (cpLen < child.label.length) break;
      consumed += cpLen;
      if (child.isEnd) result.push(str.slice(0, consumed));
      node = child;
    }
    return result;
  }

  keys(): string[] {
    const result: string[] = [];
    this._collect(this._root, "", result);
    return result;
  }

  values(): V[] { return this.entries().map(([, v]) => v); }

  entries(): [string, V][] {
    const result: [string, V][] = [];
    this._collectEntries(this._root, "", result);
    return result;
  }

  [Symbol.iterator](): Iterator<[string, V]> { return this.entries()[Symbol.iterator](); }

  clear(): void { this._root = makeRadix<V>(); this._size = 0; }

  get size(): number { return this._size; }

  private _find(key: string): [RadixNode<V> | null, string] {
    let node = this._root;
    let remaining = key;
    while (remaining.length > 0) {
      const child = node.children.get(remaining[0]!);
      if (!child) return [null, ""];
      if (!remaining.startsWith(child.label)) return [null, ""];
      remaining = remaining.slice(child.label.length);
      node = child;
    }
    return [node, key];
  }

  private _findPrefix(prefix: string): RadixNode<V> | null {
    let node = this._root;
    let remaining = prefix;
    while (remaining.length > 0) {
      const child = node.children.get(remaining[0]!);
      if (!child) return null;
      const cpLen = commonPrefixLen(child.label, remaining);
      if (cpLen < remaining.length && cpLen < child.label.length) return null;
      if (cpLen >= remaining.length) return child;
      remaining = remaining.slice(cpLen);
      node = child;
    }
    return node;
  }

  private _findPrefixWithPath(prefix: string): [RadixNode<V> | null, string] {
    let node = this._root;
    let remaining = prefix;
    let accumulated = "";
    while (remaining.length > 0) {
      const child = node.children.get(remaining[0]!);
      if (!child) return [null, ""];
      const cpLen = commonPrefixLen(child.label, remaining);
      if (cpLen < remaining.length && cpLen < child.label.length) return [null, ""];
      if (cpLen >= remaining.length) {
        accumulated += child.label;
        return [child, accumulated];
      }
      accumulated += child.label;
      remaining = remaining.slice(cpLen);
      node = child;
    }
    return [node, accumulated];
  }

  private _collect(node: RadixNode<V>, prefix: string, result: string[]): void {
    if (node.isEnd) result.push(prefix);
    for (const child of node.children.values()) this._collect(child, prefix + child.label, result);
  }

  private _collectEntries(node: RadixNode<V>, prefix: string, result: [string, V][]): void {
    if (node.isEnd) result.push([prefix, node.value as V]);
    for (const child of node.children.values()) this._collectEntries(child, prefix + child.label, result);
  }
}
