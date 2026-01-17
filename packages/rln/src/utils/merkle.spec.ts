import { expect } from "chai";
import fc from "fast-check";

import { getPathDirectionsFromIndex, MERKLE_TREE_DEPTH } from "./merkle.js";

describe("getPathDirectionsFromIndex", () => {
  it("should return an array of length MERKLE_TREE_DEPTH", () => {
    const result = getPathDirectionsFromIndex(0n);
    expect(result).to.have.lengthOf(MERKLE_TREE_DEPTH);
  });

  it("should return all zeros for index 0", () => {
    const result = getPathDirectionsFromIndex(0n);
    expect(result.every((bit) => bit === 0)).to.be.true;
  });

  it("should return [1, 0, 0, ...] for index 1 (only LSB set)", () => {
    const result = getPathDirectionsFromIndex(1n);
    expect(result[0]).to.equal(1);
    expect(result.slice(1).every((bit) => bit === 0)).to.be.true;
  });

  it("should return [0, 1, 0, ...] for index 2 (only bit 1 set)", () => {
    const result = getPathDirectionsFromIndex(2n);
    expect(result[0]).to.equal(0);
    expect(result[1]).to.equal(1);
    expect(result.slice(2).every((bit) => bit === 0)).to.be.true;
  });

  it("should return [1, 1, 0, ...] for index 3 (bits 0 and 1 set)", () => {
    const result = getPathDirectionsFromIndex(3n);
    expect(result[0]).to.equal(1);
    expect(result[1]).to.equal(1);
    expect(result.slice(2).every((bit) => bit === 0)).to.be.true;
  });

  it("should correctly extract bits for a known value", () => {
    // Index 42 = 0b101010: bits 1, 3, 5 are set
    const result = getPathDirectionsFromIndex(42n);
    expect(result[0]).to.equal(0); // bit 0
    expect(result[1]).to.equal(1); // bit 1
    expect(result[2]).to.equal(0); // bit 2
    expect(result[3]).to.equal(1); // bit 3
    expect(result[4]).to.equal(0); // bit 4
    expect(result[5]).to.equal(1); // bit 5
  });

  it("should only contain 0 or 1 values", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: 2n ** 20n - 1n }), (index) => {
        const result = getPathDirectionsFromIndex(index);
        return result.every((bit) => bit === 0 || bit === 1);
      })
    );
  });

  it("should produce consistent results for the same input", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: 2n ** 20n - 1n }), (index) => {
        const result1 = getPathDirectionsFromIndex(index);
        const result2 = getPathDirectionsFromIndex(index);
        return (
          result1.length === result2.length &&
          result1.every((bit, i) => bit === result2[i])
        );
      })
    );
  });

  it("should reconstruct the original index from path directions", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: 2n ** 20n - 1n }), (index) => {
        const pathDirections = getPathDirectionsFromIndex(index);

        // Reconstruct the index from path directions
        let reconstructed = 0n;
        for (let level = 0; level < MERKLE_TREE_DEPTH; level++) {
          if (pathDirections[level] === 1) {
            reconstructed |= 1n << BigInt(level);
          }
        }

        return reconstructed === index;
      })
    );
  });
});
