import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizePublicLocation, sanitizePublicText } from "./publicCityData";

describe("public municipal text projection", () => {
  it("redacts email addresses, Brazilian CPF numbers, and phone numbers", () => {
    assert.equal(
      sanitizePublicText("Contato: teste@example.invalid"),
      "Contato: [dado ocultado]",
    );
    assert.equal(
      sanitizePublicText("CPF 123.456.789-01"),
      "CPF [dado ocultado]",
    );
    assert.equal(
      sanitizePublicText("Telefone +55 (41) 99999-0000"),
      "Telefone [dado ocultado]",
    );
  });

  it("redacts an explicit self-identification phrase and enforces the requested length", () => {
    assert.equal(sanitizePublicText("Meu nome é Joana Silva"), "[identificação removida]");
    assert.equal(sanitizePublicText("abcdefghijklmnop", 8), "abcdefgh");
  });

  it("removes likely house numbers from public map locations", () => {
    assert.equal(
      sanitizePublicLocation("Rua Fictícia, 123, Centro"),
      "Rua Fictícia, Centro",
    );
  });
});
