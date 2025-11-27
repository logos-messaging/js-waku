import { expect } from "chai";

import { ContentMessage } from "./message.js";
import { HistoryStorage, PersistentHistory } from "./persistent_history.js";

class MemoryStorage implements HistoryStorage {
  private readonly store = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  public removeItem(key: string): void {
    this.store.delete(key);
  }
}

const channelId = "channel-1";

const createMessage = (id: string, timestamp: number): ContentMessage => {
  return new ContentMessage(
    id,
    channelId,
    "sender",
    [],
    BigInt(timestamp),
    undefined,
    new Uint8Array([timestamp]),
    undefined
  );
};

describe("PersistentHistory", () => {
  it("persists and restores messages", () => {
    const storage = new MemoryStorage();
    const history = new PersistentHistory({ channelId, storage });

    history.push(createMessage("msg-1", 1));
    history.push(createMessage("msg-2", 2));

    const restored = new PersistentHistory({ channelId, storage });

    expect(restored.length).to.equal(2);
    expect(restored.slice(0).map((msg) => msg.messageId)).to.deep.equal([
      "msg-1",
      "msg-2"
    ]);
  });

  it("behaves like memory history when storage is unavailable", () => {
    const history = new PersistentHistory({ channelId, storage: undefined });

    history.push(createMessage("msg-3", 3));

    expect(history.length).to.equal(1);
    expect(history.slice(0)[0].messageId).to.equal("msg-3");
  });

  it("handles corrupt data in storage gracefully", () => {
    const storage = new MemoryStorage();
    storage.setItem("waku:sds:history:channel-1", "{ invalid json }");

    const history = new PersistentHistory({ channelId, storage });
    expect(history.length).to.equal(0);

    // Local history should be empty
    expect(storage.getItem("waku:sds:history:channel-1")).to.equal(null);
  });

  it("isolates history by channel ID", () => {
    const storage = new MemoryStorage();

    const history1 = new PersistentHistory({
      channelId: "channel-1",
      storage
    });
    const history2 = new PersistentHistory({
      channelId: "channel-2",
      storage
    });

    history1.push(createMessage("msg-1", 1));
    history2.push(createMessage("msg-2", 2));

    // Each channel should only see its own messages
    expect(history1.length).to.equal(1);
    expect(history1.slice(0)[0].messageId).to.equal("msg-1");

    expect(history2.length).to.equal(1);
    expect(history2.slice(0)[0].messageId).to.equal("msg-2");

    expect(storage.getItem("waku:sds:history:channel-1")).to.not.be.null;
    expect(storage.getItem("waku:sds:history:channel-2")).to.not.be.null;
  });
});
