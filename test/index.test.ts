import { Trie, RadixTrie } from "../src/index.js";

// ── Trie ───────────────────────────────────────────────────────────────────────
describe("Trie", () => {
  it("insert and get", () => {
    const t = new Trie<number>();
    t.insert("apple", 1).insert("app", 2).insert("apply", 3);
    expect(t.get("apple")).toBe(1);
    expect(t.get("app")).toBe(2);
    expect(t.get("apply")).toBe(3);
    expect(t.get("ap")).toBeUndefined();
    expect(t.get("application")).toBeUndefined();
  });

  it("has — exact match only", () => {
    const t = new Trie<number>();
    t.insert("apple", 1);
    expect(t.has("apple")).toBe(true);
    expect(t.has("app")).toBe(false);
    expect(t.has("applez")).toBe(false);
    expect(t.has("")).toBe(false);
  });

  it("empty string key", () => {
    const t = new Trie<string>();
    t.insert("", "root");
    expect(t.has("")).toBe(true);
    expect(t.get("")).toBe("root");
    expect(t.size).toBe(1);
  });

  it("size tracks correctly", () => {
    const t = new Trie<number>();
    expect(t.size).toBe(0);
    t.insert("a", 1);
    expect(t.size).toBe(1);
    t.insert("ab", 2);
    expect(t.size).toBe(2);
    t.insert("a", 99); // update — no size change
    expect(t.size).toBe(2);
    t.delete("a");
    expect(t.size).toBe(1);
  });

  it("update existing key replaces value", () => {
    const t = new Trie<number>();
    t.insert("key", 1);
    t.insert("key", 99);
    expect(t.get("key")).toBe(99);
    expect(t.size).toBe(1);
  });

  it("delete existing key", () => {
    const t = new Trie<number>();
    t.insert("apple", 1).insert("app", 2);
    expect(t.delete("apple")).toBe(true);
    expect(t.has("apple")).toBe(false);
    expect(t.has("app")).toBe(true); // parent key intact
  });

  it("delete missing key returns false", () => {
    const t = new Trie<number>();
    t.insert("apple", 1);
    expect(t.delete("app")).toBe(false);
    expect(t.delete("apples")).toBe(false);
    expect(t.has("apple")).toBe(true);
  });

  it("delete prunes dead-end nodes", () => {
    const t = new Trie<number>();
    t.insert("abc", 1);
    t.delete("abc");
    // Internal nodes should be pruned — root has no children
    expect(t.size).toBe(0);
    expect(t.startsWith("a")).toBe(false);
  });

  it("startsWith", () => {
    const t = new Trie<number>();
    t.insert("apple", 1).insert("application", 2);
    expect(t.startsWith("app")).toBe(true);
    expect(t.startsWith("apple")).toBe(true);
    expect(t.startsWith("appl")).toBe(true);
    expect(t.startsWith("bana")).toBe(false);
    expect(t.startsWith("")).toBe(true); // every trie startsWith ""
  });

  it("keysWithPrefix", () => {
    const t = new Trie<number>();
    t.insert("apple", 1).insert("app", 2).insert("apply", 3).insert("banana", 4);
    const keys = t.keysWithPrefix("app").sort();
    expect(keys).toEqual(["app", "apple", "apply"]);
    expect(t.keysWithPrefix("ban")).toEqual(["banana"]);
    expect(t.keysWithPrefix("xyz")).toEqual([]);
  });

  it("entriesWithPrefix", () => {
    const t = new Trie<number>();
    t.insert("cat", 1).insert("car", 2).insert("card", 3);
    const entries = t.entriesWithPrefix("ca").sort(([a], [b]) => a.localeCompare(b));
    expect(entries).toEqual([["car", 2], ["card", 3], ["cat", 1]]);
  });

  it("longestPrefix", () => {
    const t = new Trie<number>();
    t.insert("he", 1).insert("hell", 2).insert("hello", 3);
    expect(t.longestPrefix("helloworld")).toBe("hello");
    expect(t.longestPrefix("hellfire")).toBe("hell");
    expect(t.longestPrefix("hey")).toBe("he");
    expect(t.longestPrefix("xyz")).toBeUndefined();
  });

  it("prefixesOf", () => {
    const t = new Trie<number>();
    t.insert("a", 0).insert("an", 1).insert("ant", 2).insert("antenna", 3);
    expect(t.prefixesOf("antenna")).toEqual(["a", "an", "ant", "antenna"]);
    expect(t.prefixesOf("ante")).toEqual(["a", "an", "ant"]);
    expect(t.prefixesOf("xyz")).toEqual([]);
  });

  it("keys / values / entries", () => {
    const t = new Trie<number>();
    t.insert("b", 2).insert("a", 1).insert("c", 3);
    // Not sorted by key — insertion order within each branch
    expect(t.entries().length).toBe(3);
    expect(new Set(t.keys())).toEqual(new Set(["a", "b", "c"]));
    expect(new Set(t.values())).toEqual(new Set([1, 2, 3]));
  });

  it("iterable via for..of", () => {
    const t = new Trie<number>();
    t.insert("x", 10).insert("y", 20);
    const pairs = [...t];
    expect(pairs.length).toBe(2);
  });

  it("clear empties trie", () => {
    const t = new Trie<number>();
    t.insert("a", 1).insert("b", 2);
    t.clear();
    expect(t.size).toBe(0);
    expect(t.has("a")).toBe(false);
    expect(t.startsWith("a")).toBe(false);
  });

  it("unicode keys", () => {
    const t = new Trie<string>();
    t.insert("こんにちは", "hello").insert("こんばんは", "good evening");
    expect(t.get("こんにちは")).toBe("hello");
    expect(t.keysWithPrefix("こん")).toHaveLength(2);
  });

  it("autocomplete scenario — top-N suggestions", () => {
    const words = ["search", "searching", "searcher", "searchable", "seal", "sea", "season"];
    const t = new Trie<number>();
    words.forEach((w, i) => t.insert(w, i));
    const suggestions = t.keysWithPrefix("sea");
    expect(suggestions).toContain("sea");
    expect(suggestions).toContain("seal");
    expect(suggestions).toContain("season");
    expect(suggestions.every(s => s.startsWith("sea"))).toBe(true);
  });

  it("IP routing scenario — longestPrefix", () => {
    const t = new Trie<string>();
    t.insert("192.", "default-route");
    t.insert("192.168.", "lan");
    t.insert("192.168.1.", "subnet-1");
    expect(t.longestPrefix("192.168.1.100")).toBe("192.168.1.");
    expect(t.longestPrefix("192.168.2.5")).toBe("192.168.");
    expect(t.longestPrefix("10.0.0.1")).toBeUndefined();
  });
});

// ── RadixTrie ─────────────────────────────────────────────────────────────────
describe("RadixTrie", () => {
  it("insert and get", () => {
    const t = new RadixTrie<number>();
    t.insert("apple", 1).insert("app", 2).insert("apply", 3);
    expect(t.get("apple")).toBe(1);
    expect(t.get("app")).toBe(2);
    expect(t.get("apply")).toBe(3);
    expect(t.get("ap")).toBeUndefined();
  });

  it("has — exact match only", () => {
    const t = new RadixTrie<number>();
    t.insert("apple", 1);
    expect(t.has("apple")).toBe(true);
    expect(t.has("app")).toBe(false);
    expect(t.has("applez")).toBe(false);
  });

  it("empty string key", () => {
    const t = new RadixTrie<string>();
    t.insert("", "root");
    expect(t.has("")).toBe(true);
    expect(t.get("")).toBe("root");
  });

  it("size tracks correctly", () => {
    const t = new RadixTrie<number>();
    expect(t.size).toBe(0);
    t.insert("foo", 1); expect(t.size).toBe(1);
    t.insert("foobar", 2); expect(t.size).toBe(2);
    t.insert("foo", 99); expect(t.size).toBe(2); // update
    t.delete("foo"); expect(t.size).toBe(1);
  });

  it("update existing key", () => {
    const t = new RadixTrie<number>();
    t.insert("key", 1); t.insert("key", 42);
    expect(t.get("key")).toBe(42);
    expect(t.size).toBe(1);
  });

  it("delete existing key", () => {
    const t = new RadixTrie<number>();
    t.insert("apple", 1).insert("app", 2);
    expect(t.delete("apple")).toBe(true);
    expect(t.has("apple")).toBe(false);
    expect(t.has("app")).toBe(true);
  });

  it("delete missing key returns false", () => {
    const t = new RadixTrie<number>();
    t.insert("apple", 1);
    expect(t.delete("app")).toBe(false);
    expect(t.delete("xyz")).toBe(false);
    expect(t.has("apple")).toBe(true);
  });

  it("startsWith", () => {
    const t = new RadixTrie<number>();
    t.insert("apple", 1).insert("application", 2);
    expect(t.startsWith("app")).toBe(true);
    expect(t.startsWith("bana")).toBe(false);
  });

  it("keysWithPrefix", () => {
    const t = new RadixTrie<number>();
    t.insert("apple", 1).insert("app", 2).insert("apply", 3).insert("banana", 4);
    expect(t.keysWithPrefix("app").sort()).toEqual(["app", "apple", "apply"]);
    expect(t.keysWithPrefix("xyz")).toEqual([]);
  });

  it("entriesWithPrefix", () => {
    const t = new RadixTrie<number>();
    t.insert("cat", 1).insert("car", 2).insert("card", 3);
    const entries = t.entriesWithPrefix("ca").sort(([a], [b]) => a.localeCompare(b));
    expect(entries).toEqual([["car", 2], ["card", 3], ["cat", 1]]);
  });

  it("longestPrefix", () => {
    const t = new RadixTrie<number>();
    t.insert("he", 1).insert("hell", 2).insert("hello", 3);
    expect(t.longestPrefix("helloworld")).toBe("hello");
    expect(t.longestPrefix("hellfire")).toBe("hell");
    expect(t.longestPrefix("xyz")).toBeUndefined();
  });

  it("prefixesOf", () => {
    const t = new RadixTrie<number>();
    t.insert("a", 0).insert("an", 1).insert("ant", 2).insert("antenna", 3);
    expect(t.prefixesOf("antenna")).toEqual(["a", "an", "ant", "antenna"]);
  });

  it("keys / entries", () => {
    const t = new RadixTrie<number>();
    t.insert("b", 2).insert("a", 1).insert("c", 3);
    expect(new Set(t.keys())).toEqual(new Set(["a", "b", "c"]));
  });

  it("iterable via for..of", () => {
    const t = new RadixTrie<number>();
    t.insert("x", 10).insert("y", 20);
    expect([...t].length).toBe(2);
  });

  it("clear", () => {
    const t = new RadixTrie<number>();
    t.insert("a", 1); t.clear();
    expect(t.size).toBe(0);
    expect(t.startsWith("a")).toBe(false);
  });

  it("URL routing — longestPrefix (literal prefix matching)", () => {
    const t = new RadixTrie<string>();
    t.insert("/api/", "api");
    t.insert("/api/users/", "users");
    t.insert("/api/users/admin/", "admin");
    expect(t.longestPrefix("/api/users/admin/settings")).toBe("/api/users/admin/");
    expect(t.longestPrefix("/api/users/bob")).toBe("/api/users/");
    expect(t.longestPrefix("/api/posts/")).toBe("/api/");
    expect(t.longestPrefix("/health")).toBeUndefined();
  });

  it("large dataset — 1000 keys", () => {
    const t = new RadixTrie<number>();
    for (let i = 0; i < 1000; i++) t.insert(`key-${i}`, i);
    expect(t.size).toBe(1000);
    expect(t.get("key-500")).toBe(500);
    expect(t.keysWithPrefix("key-5").length).toBe(111); // 5,50-59,500-599 → 1+10+100=111
    for (let i = 0; i < 1000; i++) t.delete(`key-${i}`);
    expect(t.size).toBe(0);
  });

  it("unicode keys", () => {
    const t = new RadixTrie<string>();
    t.insert("αβγ", "abc").insert("αβδ", "abd");
    expect(t.get("αβγ")).toBe("abc");
    expect(t.keysWithPrefix("αβ")).toHaveLength(2);
  });
});
