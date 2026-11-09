import { expect, it } from "vitest";
import { ApiError } from "../../api/transport";
import { retryReplayPoll } from "./replay-query";

it("backs off temporary rate limits without repeatedly retrying other failures", () => {
  expect(retryReplayPoll(0, new ApiError("Busy", 429))).toBe(true);
  expect(retryReplayPoll(1, new ApiError("Busy", 429))).toBe(true);
  expect(retryReplayPoll(2, new ApiError("Busy", 429))).toBe(false);
  expect(retryReplayPoll(0, new ApiError("Sign in", 401))).toBe(false);
  expect(retryReplayPoll(0, new ApiError("Unavailable", 502))).toBe(false);
});
