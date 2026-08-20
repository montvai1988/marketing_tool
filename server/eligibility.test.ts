import { describe, expect, it } from "vitest";
import { decideEligibility } from "../shared/eligibility";

describe("decideEligibility", () => {
  it("allows a clean, active contact", () => {
    expect(decideEligibility({ email: "info@panzio.hu", optedOut: false }, new Set())).toEqual({
      send: true,
    });
  });

  it("blocks a contact flagged as opted out on its own row", () => {
    expect(decideEligibility({ email: "info@panzio.hu", optedOut: true }, new Set())).toEqual({
      send: false,
      reason: "opted_out",
    });
  });

  it("blocks an address present on the suppression list", () => {
    const suppressed = new Set(["info@panzio.hu"]);
    expect(decideEligibility({ email: "info@panzio.hu", optedOut: false }, suppressed)).toEqual({
      send: false,
      reason: "suppressed",
    });
  });

  it("matches the suppression list regardless of casing or padding", () => {
    const suppressed = new Set(["info@panzio.hu"]);
    expect(decideEligibility({ email: "  INFO@Panzio.HU  ", optedOut: false }, suppressed)).toEqual({
      send: false,
      reason: "suppressed",
    });
  });

  it("rejects a malformed address before any send is attempted", () => {
    expect(decideEligibility({ email: "nem-email", optedOut: false }, new Set())).toEqual({
      send: false,
      reason: "invalid",
    });
    expect(decideEligibility({ email: "   ", optedOut: false }, new Set())).toEqual({
      send: false,
      reason: "invalid",
    });
  });

  it("prioritizes the opt-out flag over suppression bookkeeping", () => {
    const suppressed = new Set(["info@panzio.hu"]);
    expect(decideEligibility({ email: "info@panzio.hu", optedOut: true }, suppressed)).toEqual({
      send: false,
      reason: "opted_out",
    });
  });
});

