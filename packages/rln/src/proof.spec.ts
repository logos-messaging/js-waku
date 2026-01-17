import { expect } from "chai";

import { Keystore } from "./keystore/index.js";
import { RLNInstance } from "./rln.js";
import { BytesUtils } from "./utils/index.js";
import {
  calculateRateCommitment,
  getPathDirectionsFromIndex,
  MERKLE_TREE_DEPTH,
  reconstructMerkleRoot
} from "./utils/merkle.js";
import {
  TEST_CREDENTIALS,
  TEST_KEYSTORE_PASSWORD,
  TEST_MERKLE_ROOT
} from "./utils/test_keystore.js";

describe("RLN Proof Integration Tests", function () {
  this.timeout(30000);

  TEST_CREDENTIALS.forEach((credential, index) => {
    describe(`Credential ${index + 1}`, function () {
      it("validate stored merkle proof data", function () {
        const merkleProof = credential.merkleProof.map((p) => BigInt(p));

        expect(merkleProof).to.be.an("array");
        expect(merkleProof).to.have.lengthOf(MERKLE_TREE_DEPTH);

        for (let i = 0; i < merkleProof.length; i++) {
          const element = merkleProof[i];
          expect(element).to.be.a(
            "bigint",
            `Proof element ${i} should be a bigint`
          );
          // Note: First element can be 0 for some tree positions (e.g., credential 3)
        }
      });

      it("should generate a valid RLN proof", async function () {
        const rlnInstance = await RLNInstance.create();
        const keystore = Keystore.fromString(credential.keystoreJson);
        if (!keystore) {
          throw new Error("Failed to load test keystore");
        }
        const credentialHash = credential.credentialHash;
        const decrypted = await keystore.readCredential(
          credentialHash,
          TEST_KEYSTORE_PASSWORD
        );
        if (!decrypted) {
          throw new Error("Failed to unlock credential with provided password");
        }

        const idCommitment = decrypted.identity.IDCommitmentBigInt;

        const merkleProof = credential.merkleProof.map((p) => BigInt(p));
        const merkleRoot = BigInt(TEST_MERKLE_ROOT);
        const membershipIndex = BigInt(credential.membershipIndex);
        const rateLimit = BigInt(credential.rateLimit);

        const rateCommitment = calculateRateCommitment(idCommitment, rateLimit);

        const proofElementIndexes = getPathDirectionsFromIndex(membershipIndex);

        expect(proofElementIndexes).to.have.lengthOf(MERKLE_TREE_DEPTH);

        const reconstructedRoot = reconstructMerkleRoot(
          merkleProof,
          membershipIndex,
          rateCommitment
        );

        expect(reconstructedRoot).to.equal(
          merkleRoot,
          "Reconstructed root should match stored root"
        );

        const testMessage = new TextEncoder().encode("test");

        const proof = await rlnInstance.zerokit.generateRLNProof(
          testMessage,
          new Date(),
          decrypted.identity.IDSecretHash,
          merkleProof.map((element) =>
            BytesUtils.bytes32FromBigInt(element, "little")
          ),
          proofElementIndexes.map((idx) =>
            BytesUtils.writeUintLE(new Uint8Array(1), idx, 0, 1)
          ),
          Number(rateLimit),
          0
        );

        const isValid = rlnInstance.zerokit.verifyRLNProof(
          BytesUtils.writeUintLE(new Uint8Array(8), testMessage.length, 0, 8),
          testMessage,
          proof,
          [BytesUtils.bytes32FromBigInt(merkleRoot, "little")]
        );
        expect(isValid).to.be.true;
      });
    });
  });
});
