import { ApiError } from "../../api/transport";

export function retryReplayPoll(failures: number, error: unknown) {
  return error instanceof ApiError && error.status === 429 && failures < 2;
}
