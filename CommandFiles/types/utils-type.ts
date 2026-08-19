import * as xaviaUtils from "../modules/XaviaSupport/utils";

declare namespace _default {
  export { xaviaUtils };
  export { goatbotUtils };
  export { generateCaptchaCode };
  export { convertTimeSentence };
  export { minimizeErrStack };
  export { UserSorter };
  export { isNumberUnsafe };
  export { formatTimeDiff };
  export { betterLog };
  export { parseCurrency };
  export { deformatBits };
  export { formatBits };
  export { compareCode };
  export { objIndex };
  export { representObject };
  export { pearsonsR };
  export { ObjectX };
  export { LiaSystem };
  export { ExtendClass };
  export { reverseKeyValue };
  export { XYZ };
  export { FuncUtil };
  export { randObjValue };
  export { randObjKey };
  export { True };
  export { False };
  export { None };
  export { chance };
  export { range };
  export { Cooldown };
  export { Prob };
  export { fonts };
  export { getRandomInt };
  export { randArrValue };
  export { randArrIndex };
  export { divideArray };
  export { getStreamFromURL };
  export { PythonDict };
  export { File };
  export { Integer };
  export { CassFile };
  export { createSafeProxy };
  export { UTYBattle };
  export { UTYPlayer };
  export { delay };
  export { syncCall };
  export { getUTY };
  export { SpecialFunc };
  export { ClassV };
  export { usePref };
  export { absoluteImport };
  export { type };
  export { calcChiSquare };
  export { MathNum };
  export { deepClone };
  export { classMaker };
  export { ClassExtra };
  export { Toggle };
  export { MusicTheory };
  export { stringArrayProxy };
  export { FileControl };
  export { Tiles };
  export { StylerGlobal };
  export { CustomError };
  export { TaskQueue };
  export { convertTime };
  export { defaultStderrClearLine };
  export { formatNumber };
  export { getExtFromAttachmentType };
  export { getExtFromMimeType };
  export { getExtFromUrl };
  export { getPrefix };
  export { getTime };
  export { getType };
  export { isNumber };
  export { randomString };
  export { randomNumber };
  export { removeHomeDir };
  export { splitPage };
  export { translateAPI };
  export { downloadFile };
  export { findUid };
  export { getStreamsFromAttachment };
  export { getStreamFromURL as getStreamFromUrl };
  export { translate };
  export { shortenURL };
  export { uploadZippyshare };
  export { uploadImgbb };
}
export default { ...xaviaUtils, ..._default };

declare namespace goatbotUtils {
  export { getStreamFromURL };
}
declare function generateCaptchaCode(length?: number): string;
declare function convertTimeSentence({
  years,
  months,
  days,
  hours,
  minutes,
  seconds,
}: {
  years: any;
  months: any;
  days: any;
  hours: any;
  minutes: any;
  seconds: any;
}): string;
declare function minimizeErrStack(stack: any): any;
declare class UserSorter {
  constructor({
    users,
    limit,
    sortBy,
    defaultValue,
  }: {
    users: any;
    limit?: any;
    sortBy?: string;
    defaultValue?: number;
  });
  users: any;
  limit: any;
  sortBy: string;
  defaultValue: number;
  sortUsers(): {};
  getTop(id: any): number;
}
declare function isNumberUnsafe(num: any): boolean;
declare function formatTimeDiff(milliseconds: any): {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};
declare function betterLog(initialContent: any): (newContent: any) => void;
declare function parseCurrency(num: any): string[];
declare function deformatBits(sizeStr: any): number;
declare function formatBits(size: any): string;
declare function compareCode(
  code1: any,
  code2: any,
  callback?: () => Promise<void>
): Promise<{
  status: string;
  diffString: string;
}>;
declare function objIndex(obj: any, index: any): any;
declare function representObject(obj: any, depth?: number): string;
declare function pearsonsR(arrayA: any, arrayB: any): number;
declare const ObjectX: {};
declare const LiaSystem: Object;
declare function ExtendClass<
  T extends new (...args: any[]) => any,
  K extends keyof InstanceType<T>
>(
  key: K,
  func: (this: InstanceType<T>, ...args: Parameters<InstanceType<T>[K]>) => any,
  Target?: T,
  options?: PropertyDescriptor
): void;

declare function reverseKeyValue(obj: any): {};
declare class XYZ {
  constructor({
    limX,
    limY,
    limZ,
    endLimX,
    endLimY,
    endLimZ,
  }: {
    limX: any;
    limY: any;
    limZ: any;
    endLimX: any;
    endLimY: any;
    endLimZ: any;
  });
  x: number;
  y: number;
  z: number;
  limit(): void;
  move(x?: number, y?: number, z?: number): void;
  teleport(x?: number, y?: number, z?: number): void;
  set array([x, y, z]: number[]);
  get array(): number[];
  toString(): string;
  toObject(): {
    x: number;
    y: number;
    z: number;
  };
  toJSON(): {
    x: number;
    y: number;
    z: number;
  };
  getJson(): string;
  clone(): XYZ;
}
declare class FuncUtil extends Function {
  static toAsync(func: any, onError: any): (...args: any[]) => Promise<void>;
  constructor(func: any);
  func: any;
}
declare function randObjValue(obj: any): any;
declare function randObjKey(obj: any): string;
declare const True: true;
declare const False: false;
declare const None: any;
declare function chance(percent?: number): boolean;
declare function range(
  min: any,
  max: any,
  format?: (i: any) => any
): {
  [x: number]: any;
}[];
declare class Cooldown {
  cooldowns: {};
  push(seconds: number, key: any, isMilliseconds?: boolean): void;
  remainingTime(key: any): string | false;
  isActive(key: any): boolean;
}
declare class Prob {
  static get might(): boolean;
  static get likely(): boolean;
  static get unlikely(): boolean;
  static get possibly(): boolean;
  static get maybe(): boolean;
}
declare class fonts {
  static sans(text: any): string;
  static bold(text: any): string;
  static origin(text: any): string;
  static auto(text: any): any;
}
declare function getRandomInt(min: any, max: any): any;
declare function randArrValue(arr: any): any;
declare function randArrIndex(arr: any): number;
declare function divideArray(arr: any, divisor: any): any[];
declare function getStreamFromURL(
  url?: string,
  pathName?: string,
  options?: {}
): Promise<any>;
declare class PythonDict {
  constructor(obj?: {});
  _data: {};
  _proxy: this;
  keys(): string[];
  values(): any[];
  items(): [string, any][];
  clear(): void;
  has_key(key: any): boolean;
  get(key: any): any;
  set(key: any, value: any): void;
  delete(key: any): void;
  update(obj: any): void;
  copy(): PythonDict;
  pop(key: any, defaultValue?: any): any;
  pop_item(): any[];
  get_keys(): string[];
  get_values(): any[];
  get_items(): [string, any][];
  set_default(key: any, defaultValue?: any): any;
  pop_value(value: any, defaultValue?: any): any;
  from_keys(iterable: any, defaultValue?: any): PythonDict;
  from_items(iterable: any): PythonDict;
  set_items(iterable: any): void;
  update_from_iterable(iterable: any): void;
  get_data(): {};
}
declare class File {
  constructor(pathname: any);
  pathname: any;
  exists(): boolean;
  isDirectory(): boolean;
  isFile(): boolean;
  createNewFile(): boolean;
  jsCreateNewFile(content: any): boolean;
  jsGetContent(callback?: (a: any) => any): any;
  mkdir(): boolean;
  mkdirs(): boolean;
  delete(): boolean;
  renameTo(dest: any): boolean;
  getName(): any;
  getAbsolutePath(): string;
  getParent(): any;
  listFiles(): File[];
  length(): number;
  lastModified(): Date;
}
declare class Integer {
  static parseInt(str: any, radix?: number): number;
  static valueOf(value: any): Integer;
  static toString(value: any, radix?: number): any;
  static max(...values: any[]): number;
  static min(...values: any[]): number;
  static sum(...values: any[]): any;
  static compare(x: any, y: any): number;
  constructor(value: any);
  value: number;
  intValue(): number;
  doubleValue(): number;
  floatValue(): number;
  longValue(): bigint;
  equals(obj: any): boolean;
  compareTo(obj: any): number;
  toString(radix?: number): string;
}
declare class CassFile extends File {
  static quickJson(pathname: any): any;
  static quickRead(pathname: any): any;
  static quickWrite(pathname: any, content: any): boolean;
  exist(): boolean;
  json(): any;
  content(callback?: (a: any) => any): any;
  write(data: any, callback?: () => void): any;
}
declare function createSafeProxy(obj: any): any;
declare class UTYBattle {
  constructor(infoObj: any, p1?: UTYPlayer);
  monster: any;
  isWinningActSatisfied: boolean;
  p1: UTYPlayer;
  isOver: boolean;
  actSeq: any[];
  orders: {};
  attackThis(dmg?: number, options?: {}): number;
  getName(): any;
  getHP(): any;
  getMaxHP(): any;
  getAT(): any;
  getDF(): any;
  getEXP(): any;
  getGold(): any;
  getType(): any;
  getActs(): any;
  getUI(data: any): string;
  getActList(): any;
  getMercyList(): string;
  hasFlee(): boolean;
  getRandomAttack(isWin: any): {
    attack: string;
    direction: any;
    attacks: any[];
  };
  getAttack(key: any): any;
  isYellow(): boolean;
  act(action: any):
    | false
    | {
        flavorText: any;
        quote: string;
        afterAct?: undefined;
        effect?: undefined;
        isWin?: undefined;
      }
    | {
        flavorText: any;
        quote: any;
        afterAct: any;
        effect: any;
        isWin: boolean;
      };
  getIndex(arr: any, key: any): any;
  getFlavor(): any;
  getEncounter(): any;
  getQuote(): any;
  getRandomLowHPQuote(): any;
  getFightQuote(): any;
  getRandomNeutralQuote(): any;
  isDead(): string | false;
  spare(dmg?: number): string | false;
  get isPacify(): boolean;
  pacify(): string;
  addExternalMethod(key: any, func: any): void;
}
declare class UTYPlayer {
  constructor({
    item,
    exp,
    gold,
    progress,
    kills,
    spares,
    entryMagic,
    name,
    ...other
  }: {
    [x: string]: any;
    item: any;
    exp?: number;
    gold?: number;
    progress: any;
    kills?: number;
    spares?: number;
    entryMagic: any;
    name?: string;
  });
  magic: any;
  set TP(tp: number);
  get TP(): number;
  get heart(): "💛" | "❤️";
  get isClover(): boolean;
  yellowing(str: any): any;
  gainTP(tp: any): void;
  useTP(tp: any): void;
  canTP(val: any): boolean;
  getLV(): number;
  defend(dmg: any): {
    damage: number;
    calc: number;
    diff: number;
    TP: number;
  };
  getMagicList(): string[];
  getMagic(number: any): any;
  isMagicTP(number: any): boolean;
  calcDmg(dmg: any, noTP?: boolean): number;
  getRemainExp(): number;
  get lv(): number;
  getHP(): number;
  getATBonus(): number;
  get dmgBonus(): number;
  get hp(): number;
  getWeapon(): any;
  toJSON(): {
    lv: number;
    hp: number;
    name: any;
    exp: any;
    df: number;
    kills: any;
    spares: any;
    gold: any;
    at: number;
  };
  getAT(battle: any): number;
  get dmg(): number;
  getDF(): number;
  getRoute(): "Pacifist" | "Genocide" | "Neutral";
  getFun(): number;
  addExternalMethod(key: any, func: any): void;
  #private;
}
declare function delay(ms?: number): Promise<any>;
declare function syncCall(func: any, ...args: any[]): void;
declare function getUTY(player: any): {};
declare function SpecialFunc({
  index,
  ...obj
}: {
  [x: string]: any;
  index: any;
}): any;
declare function ClassV({
  constructor,
  ...methods
}: {
  [x: string]: any;
  constructor: any;
}): (...args: any[]) => {
  _constructor: any;
};
declare function usePref(obj: any, pref: any): any;
declare function absoluteImport(url: any): Promise<any>;
declare function type(any: any): any;
declare function calcChiSquare(observed: any, expected: any): any;
declare class MathNum extends Number {
  constructor(...args: any[]);
  raiseTo(power?: number): number;
  root(root?: number): number;
  factorial(f?: number): any;
  dividedBy(val?: number): number;
  asDivisorTo(val?: number): number;
  remainder(val?: number): number;
  remainderWith(val?: number): number;
}
declare function deepClone(obj: any): any;
declare function classMaker(
  className: any,
  options: any
): (...args: any[]) => any;
declare function ClassExtra(Class: any): void;
declare class Toggle {
  offStates: {};
  funcs: {};
  on(key: any, callback?: () => void): void;
  off(key: any, callback?: () => void): void;
  test(key: any, callback?: () => void): boolean;
  testAsync(key: any, callback?: () => Promise<void>): Promise<boolean>;
  setSpawn(key: any, func: any): void;
  spawn(key: any, delay?: number): Promise<any[]>;
  isFree(key: any): boolean;
  swap(key: any): boolean;
  nextFree(): number;
}
import MusicTheory from "../.././handlers/music-theory-js.js";
declare function stringArrayProxy(optionalArray: any): any;
declare class FileControl {
  constructor(
    path: any,
    options?: {
      strict: boolean;
      sync: boolean;
    }
  );
  path: any;
  strict: boolean;
  sync: boolean;
  content(encoding: any): Promise<any> | Buffer;
  contentSync(encoding: any): Buffer;
  write(content: any, encoding: any): void | Promise<any>;
  writeSync(content: any, encoding: any): void;
  exists(): boolean;
  delete(): boolean;
  isDirectory(): boolean;
  files(): string[] | Promise<any>;
  filesSync(): string[];
  create(): void | Promise<any>;
  createSync(): void;
}
declare class Tiles {
  static numberTile(number: any): string;
  constructor({
    sizeX,
    sizeY,
    tileIcon,
    bombIcon,
    coinIcon,
    emptyIcon,
  }: {
    sizeX?: number;
    sizeY?: number;
    tileIcon?: string;
    bombIcon?: string;
    coinIcon?: string;
    emptyIcon?: string;
  });
  size: number[];
  tileIcon: string;
  emptyIcon: string;
  bombIcon: string;
  coinIcon: string;
  board: string[];
  state: string[];
  randomTile(): string;
  generateFirstBoard(): string[];
  generateEmptyBoard(): string[];
  range(): number[];
  reveal(): void;
  isEnd(): boolean;
  choose(
    num: any
  ):
    | "OUT_OF_RANGE"
    | "ALREADY_CHOSEN"
    | "BOMB"
    | "COIN"
    | "EMPTY"
    | "UNKNOWN_ERROR";
  isBomb(num: any): boolean;
  isOutRange(num: any): boolean;
  isEmpty(num: any): boolean;
  isCoin(num: any): boolean;
  isFree(num: any): boolean;
  toStringOld(): string;
  toString(): string;
}
import StylerGlobal = require("../.././handlers/styler.js/main.js");
declare class CustomError extends Error {
  constructor(obj: any);
}
declare class TaskQueue {
  constructor(callback: any);
  queue: any[];
  running: any;
  callback: any;
  push(task: any): void;
  next(): void;
  length(): number;
}
declare function convertTime(
  miliSeconds: any,
  replaceSeconds?: string,
  replaceMinutes?: string,
  replaceHours?: string,
  replaceDays?: string,
  replaceMonths?: string,
  replaceYears?: string,
  notShowZero?: boolean
): string;
declare const defaultStderrClearLine: (
  dir: import("tty").Direction,
  callback?: () => void
) => boolean;
declare function formatNumber(number: any): any;
declare function getExtFromAttachmentType(
  type: any
): "png" | "gif" | "mp4" | "mp3" | "txt";
declare function getExtFromMimeType(mimeType?: string): any;
declare function getExtFromUrl(url?: string): string;
declare function getPrefix(threadID: any): any;
declare function getTime(timestamps: any, format: any): string;
/**
 * @param {any} value
 * @returns {("Null" | "Undefined" | "Boolean" | "Number" | "String" | "Symbol" | "Object" | "Function" | "AsyncFunction" | "Array" | "Date" | "RegExp" | "Error" | "Map" | "Set" | "WeakMap" | "WeakSet" | "Int8Array" | "Uint8Array" | "Uint8ClampedArray" | "Int16Array" | "Uint16Array" | "Int32Array" | "Uint32Array" | "Float32Array" | "Float64Array" | "BigInt" | "BigInt64Array" | "BigUint64Array")}
 */
declare function getType(
  value: any
):
  | "Null"
  | "Undefined"
  | "Boolean"
  | "Number"
  | "String"
  | "Symbol"
  | "Object"
  | "Function"
  | "AsyncFunction"
  | "Array"
  | "Date"
  | "RegExp"
  | "Error"
  | "Map"
  | "Set"
  | "WeakMap"
  | "WeakSet"
  | "Int8Array"
  | "Uint8Array"
  | "Uint8ClampedArray"
  | "Int16Array"
  | "Uint16Array"
  | "Int32Array"
  | "Uint32Array"
  | "Float32Array"
  | "Float64Array"
  | "BigInt"
  | "BigInt64Array"
  | "BigUint64Array";
declare function isNumber(num: any): boolean;
declare function isNumber(value: any): boolean;
declare function randomString(
  max: any,
  onlyOnce: boolean,
  possible: any
): string;
declare function randomNumber(min: any, max: any): any;
declare function removeHomeDir(fullPath: any): any;
declare function splitPage(
  arr: any,
  limit: any
): {
  totalPage: number;
  allPage: any[][];
};
declare function translateAPI(text: any, lang: any): Promise<any>;
declare function downloadFile(url?: string, path?: string): Promise<string>;
declare function findUid(link: any): Promise<any>;
declare function getStreamsFromAttachment(attachments: any): Promise<any[]>;
declare function translate(text: any, lang: any): Promise<string>;
declare function shortenURL(url: any): Promise<any>;
declare function uploadZippyshare(stream: any): Promise<any>;
declare function uploadImgbb(file: any): Promise<any>;
//# sourceMappingURL=utils.d.ts.map
