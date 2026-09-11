import type { TextTrigger } from "../types.js";
import { forgetTrigger, recallTrigger, teachTrigger } from "./learnTrigger.js";
import { menuAddTrigger, menuListTrigger, menuRecommendTrigger, menuRemoveTrigger } from "./menuTrigger.js";
import { weatherTrigger } from "./weatherTrigger.js";

// 슬래시커맨드가 아니라 평문 채팅으로 반응하는 재미용 기능들. 새로 추가할 땐 여기 등록만 하면 됨.
// recallTrigger는 "세이지 <아무말>"을 전부 받는 catch-all이라 반드시 맨 뒤에 둔다 —
// 고정 문구 기능들의 첫 단어는 reservedTriggerWords.ts에도 등록해 recallTrigger가 가로채지 않게 한다.
export const textTriggers: TextTrigger[] = [
  teachTrigger,
  forgetTrigger,
  weatherTrigger,
  menuAddTrigger,
  menuRemoveTrigger,
  menuListTrigger,
  menuRecommendTrigger,
  recallTrigger,
];
