import { expect } from "chai";

import { MemLocalHistory } from "./mem_local_history.js";
import { ContentMessage } from "./message.js";

describe("MemLocalHistory", () => {
  it("Cap max size when messages are pushed one at a time", () => {
    const maxSize = 2;

    const hist = new MemLocalHistory({ maxSize: maxSize });

    hist.addMessages(
      new ContentMessage("1", "c", "a", [], 1n, undefined, new Uint8Array([1]))
    );
    expect(hist.size).to.eq(1);
    hist.addMessages(
      new ContentMessage("2", "c", "a", [], 2n, undefined, new Uint8Array([2]))
    );
    expect(hist.size).to.eq(2);

    hist.addMessages(
      new ContentMessage("3", "c", "a", [], 3n, undefined, new Uint8Array([3]))
    );
    expect(hist.size).to.eq(2);

    expect(hist.hasMessage("1")).to.eq(false);
    expect(hist.hasMessage("2")).to.eq(true);
    expect(hist.hasMessage("3")).to.eq(true);
  });

  it("Cap max size when a pushed array is exceeding the cap", () => {
    const maxSize = 2;

    const hist = new MemLocalHistory({ maxSize: maxSize });

    hist.addMessages(
      new ContentMessage("1", "c", "a", [], 1n, undefined, new Uint8Array([1]))
    );
    expect(hist.size).to.eq(1);
    hist.addMessages(
      new ContentMessage("2", "c", "a", [], 2n, undefined, new Uint8Array([2])),
      new ContentMessage("3", "c", "a", [], 3n, undefined, new Uint8Array([3]))
    );
    expect(hist.size).to.eq(2);

    expect(hist.hasMessage("1")).to.eq(false);
    expect(hist.hasMessage("2")).to.eq(true);
    expect(hist.hasMessage("3")).to.eq(true);
  });
});
