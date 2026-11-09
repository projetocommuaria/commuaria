import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractNeighborhoodFromAddress } from "./municipalAddress";

describe("municipality-aware neighborhood labels", () => {
  it("retains Araucária's existing neighborhood mappings", () => {
    assert.equal(
      extractNeighborhoodFromAddress("Rua Teste, Capela Velha, Araucária - PR"),
      "Capela Velha",
    );
    assert.equal(
      extractNeighborhoodFromAddress("Avenida Victor do Amaral, Araucária - PR"),
      "Centro",
    );
  });

  it("extracts Curitiba regions without applying Araucária-specific names or defaults", () => {
    assert.equal(
      extractNeighborhoodFromAddress("Rua das Flores, Centro, Curitiba - PR", "Curitiba"),
      "Centro",
    );
    assert.equal(
      extractNeighborhoodFromAddress("Rua Fictícia, Bairro Teste, Curitiba/PR", "Curitiba"),
      "Bairro Teste",
    );
    assert.equal(
      extractNeighborhoodFromAddress("Rua Fictícia, Guajuvira, Curitiba - PR", "Curitiba"),
      "Guajuvira",
    );
  });

  it("uses a municipality-specific neutral label when the address is missing", () => {
    assert.equal(extractNeighborhoodFromAddress(null, "Curitiba"), "Região Central / Curitiba");
    assert.equal(extractNeighborhoodFromAddress(null), "Região Central");
  });
});
