import type { TextTrigger } from "../types.js";
import { weatherTrigger } from "./weatherTrigger.js";

// 슬래시커맨드가 아니라 평문 채팅으로 반응하는 재미용 기능들. 새로 추가할 땐 여기 등록만 하면 됨.
export const textTriggers: TextTrigger[] = [weatherTrigger];
