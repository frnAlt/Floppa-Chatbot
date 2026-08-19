/*
  WARNING: This source code is created by Liane Cagara.
  Any unauthorized modifications or attempts to tamper with this code 
  can result in severe consequences, including a global ban from my server.
  Proceed with extreme caution and refrain from any unauthorized actions.
*/

import { BriefcaseAPI } from "@cass-modules/BriefcaseAPI";

type Readable = import("stream").Readable;
/**
 * @deprecated
 */
type OutputResultNew = import("@cass-plugins/output").OutputResult;

export interface StrictOutputForm {
  body?: string;
  useWebMode?: boolean;
  attachment?: Readable | Readable[] | any[] | any;
  threadID?: string;
  style?: Record<string, any>;
  defStyle?: Record<string, any>;
  noStyle?: boolean;
  referenceQ?: string;
  mentions?: {
    tag: string;
    id: string;
  }[];
  location?: {
    latitude: number;
    longitude: number;
  };
  rawBody?: boolean;
  callback?: (
    info: import("@cass-modules/OutputClass").OutputSent
  ) => void | Promise<void>;
  isReply?: boolean;
  messageID?: string;
  noLevelUI?: boolean;
  noRibbonUI?: boolean;
  contactID?: string;
}
export interface OutputResult extends StrictOutputForm {
  messageID: string;
  timestamp: number;
  threadID: string;
  senderID: string;
  html?: string;
  styleFields?: Record<string, any>;
  originalOptionsBody?: string;
}

/**
 * @deprecated
 */
export type OutputResultInf = OutputResult;
export { OutputResultNew };

export type OutputForm = string | StrictOutputForm;
/**
 * Interface representing the properties and methods for handling output operations.
 * @deprecated
 */
export interface OutputProps {
  /**
   * A flexible wrapper for making HTTP requests using Axios, supporting both
   * method shorthands and full Axios config objects.
   *
   * Features:
   * - Supports both `"@method:url"` shorthand and explicit method in config
   * - Automatically assigns params to `params` (GET) or `data` (POST-like)
   * - Catches and formats errors to always return an `Error` object
   *
   *
   * @param url - The endpoint URL or a special format like "@METHOD:url"
   *                       (e.g., "@post:/api/user") to define the HTTP method inline.
   *
   * @param [params={}] - Key-value pairs to be sent:
   *        - As query parameters (for GET, DELETE, etc.)
   *        - As request body (for POST, PUT, PATCH)
   *
   * @param [configOrMethod="GET"] - Either:
   *        - A string representing the HTTP method (e.g., "GET", "POST")
   *        - An AxiosRequestConfig object (preferred for complex setups)
   *
   * @returns The response data from the server
   *
   * @throws {Error} If the request fails, throws a formatted error with message
   */

  req(
    url: string,
    params?: Record<string, any>,
    configOrMethod?: string | import("axios").AxiosRequestConfig
  ): Promise<any>;
  /**
   * Sends a reply with the specified body and an optional callback.
   * @param body - The content of the reply.
   * @param callback - Optional callback to handle the result of the reply.
   * @returns A promise resolving to the result of the reply.
   */
  reply(
    body: OutputForm,
    callback?: (info: import("@cass-modules/OutputClass").OutputSent) => void
  ): Promise<import("@cass-modules/OutputClass").OutputSent>;

  /**
   * Registers a reply listener to handle replies asynchronously.
   * @param replyListener - A function to handle the reply context.
   * @returns A promise resolving to the generic type `T`.
   */
  reply<T>(
    replyListener: (
      ctx: CommandContext & {
        repObj: PromiseStandardReplyArg<T>;
      }
    ) => any | Promise<any>
  ): Promise<T>;

  /**
   * Changes the current recognized style in a single output instance. Only same events were affected.
   * @param style - Style object.
   */
  setStyle(style: CassidySpectra.CommandStyle): void;

  /**
   * Sets the UI name for the output.
   * @param name - The name to set for the UI.
   * @deprecated
   */
  setUIName(name: string): void;

  /**
   * Sends a contact message with optional ID and destination.
   * @param text - The contact message text.
   * @param id - Optional ID for the contact.
   * @param destination - Optional destination for the contact.
   * @returns A promise resolving to a boolean indicating success.
   */
  contact(
    text: string,
    id?: string,
    destination?: string
  ): Promise<import("@cass-modules/OutputClass").OutputSent>;

  /**
   * Handles an error by sending it with an optional callback.
   * @param err - The error to handle.
   * @param callback - Optional callback to handle additional information.
   * @returns A promise resolving to any result.
   */
  error(
    err: unknown | string | Error,
    callback?: (info: any) => void
  ): Promise<any>;

  /**
   * Sends a message with the specified body, optional ID, and callback.
   * @param body - The content of the message.
   * @param id - Optional ID for the message.
   * @param callback - Optional callback to handle the result.
   * @returns A promise resolving to the result of the message.
   */
  send(
    body: OutputForm,
    id?: string,
    callback?: (info: import("@cass-modules/OutputClass").OutputSent) => void
  ): Promise<import("@cass-modules/OutputClass").OutputSent>;

  /**
   * Adds a user to a thread.
   * @param user - The user to add.
   * @param thread - Optional thread to add the user to.
   * @returns A promise resolving when the operation is complete.
   */
  add(user: string, thread?: string): Promise<void>;

  /**
   * Removes a user from a thread.
   * @param user - The user to remove.
   * @param thread - Optional thread to remove the user from.
   * @returns A promise resolving when the operation is complete.
   */
  kick(user: string, thread?: string): Promise<void>;

  /**
   * Un-sends a message by its ID.
   * @param mid - The ID of the message to un-send.
   * @returns A promise resolving when the operation is complete.
   */
  unsend(mid: string): Promise<void>;

  /**
   * Reacts to a message with the specified emoji.
   * @param emoji - The emoji to react with.
   * @param mid - Optional ID of the message to react to.
   * @returns A promise resolving when the operation is complete.
   */
  reaction(emoji: string, mid?: string): Promise<void>;

  /**
   * Registers a reaction listener to handle reactions asynchronously.
   * @param reactListener - A function to handle the reaction context.
   * @returns A promise resolving to the generic type `T`.
   */
  reaction<T>(
    reactListener?: (
      ctx: CommandContext & {
        repObj: PromiseStandardReplyArg<T>;
      }
    ) => any | Promise<any>
  ): Promise<T>;

  /**
   * A string to prepend to messages.
   * @deprecated
   */
  prepend: string;

  /**
   * A string to append to messages.
   * @deprecated
   */
  append: string;

  /**
   * Sends a styled reply with the specified form, style, and optional thread.
   * @param form - The content of the reply.
   * @param style - The style to apply to the reply.
   * @param thread - Optional thread to send the reply to.
   * @returns A promise resolving to the result of the reply.
   */
  replyStyled(
    form: OutputForm,
    style: CassidySpectra.CommandStyle,
    thread?: string
  ): Promise<import("@cass-modules/OutputClass").OutputSent>;

  /**
   * Sends a styled message with the specified form, style, and optional thread.
   * @param form - The content of the message.
   * @param style - The style to apply to the message.
   * @param thread - Optional thread to send the message to.
   * @returns A promise resolving to the result of the message.
   */
  sendStyled(
    form: OutputForm,
    style: CassidySpectra.CommandStyle,
    thread?: string
  ): Promise<import("@cass-modules/OutputClass").OutputSent>;

  /**
   * Attaches a stream to a message with optional style.
   * @param form - The content of the message.
   * @param stream - The stream to attach.
   * @param style - Optional style to apply to the message.
   * @returns A promise resolving to the result of the message.
   */
  attach(
    form: OutputForm,
    stream: string | Readable[] | Readable | any,
    style?: CassidySpectra.CommandStyle
  ): Promise<import("@cass-modules/OutputClass").OutputSent>;

  /**
   * A class for creating styled messages.
   * @deprecated
   */
  Styled: {
    /**
     * Creates a new styled message instance.
     * @param style - The style to apply to the messages.
     */
    new (style: CassidySpectra.CommandStyle): {
      /**
       * The style applied to the messages.
       */
      style: CassidySpectra.CommandStyle;

      /**
       * The ID of the last message sent.
       */
      lastID: string | null;

      /**
       * Sends a reply with the specified body.
       * @param body - The content of the reply.
       * @returns A promise resolving to the result of the reply.
       */
      reply(
        body: OutputForm
      ): Promise<import("@cass-modules/OutputClass").OutputSent>;

      /**
       * Sends a message with the specified body.
       * @param body - The content of the message.
       * @returns A promise resolving to the result of the message.
       */
      send(
        body: OutputForm
      ): Promise<import("@cass-modules/OutputClass").OutputSent>;

      /**
       * Edits a message with the specified body and message ID.
       * @param body - The new content of the message.
       * @param messageID - The ID of the message to edit.
       * @param delay - Optional delay before editing the message.
       * @returns A promise resolving when the operation is complete.
       */
      edit(body: string, messageID: string, delay?: number): Promise<boolean>;
    };
  };

  /**
   * Handles a generic error scenario.
   * @returns A promise resolving to the result of the operation.
   */
  wentWrong(): Promise<import("@cass-modules/OutputClass").OutputSent>;

  /**
   * Handles a syntax error in a command.
   * @param commandX - Optional command context or details.
   * @deprecated
   * @returns A promise resolving to the result of the operation.
   */
  syntaxError(
    commandX?: any
  ): Promise<import("@cass-modules/OutputClass").OutputSent>;

  /**
   * Edits a message with the specified text, message ID, and optional delay and style.
   * @param text - The new content of the message.
   * @param mid - The ID of the message to edit.
   * @param delay - Optional delay before editing the message.
   * @param style - Optional style to apply to the message.
   * @returns A promise resolving to a boolean indicating success.
   */
  edit(
    text: string,
    mid: string,
    delay?: number,
    style?: any
  ): Promise<boolean>;

  dispatch(
    body: OutputForm,
    options: StrictOutputForm
  ): Promise<import("@cass-modules/OutputClass").OutputSent>;

  /**
   * Creates frames from the specified arguments.
   * @param args - The arguments to create frames from.
   * @deprecated
   * @returns A promise resolving to the result of the operation.
   */
  frames(...args: (string | number)[]): Promise<any>;

  /**
   * Alias for the `reaction` method.
   * @deprecated
   */
  react: OutputProps["reaction"];

  /**
   * Formats an error into a string representation.
   * @param err - The error to format.
   * @returns A string representation of the error.
   * @deprecated
   */
  formatError(err: string | Error): string;

  /**
   * Sends a confirmation message and waits for a response.
   * @param body - The content of the confirmation message.
   * @param done - Optional callback to handle the confirmation context.
   * @returns A promise resolving to the confirmation context.
   */
  confirm(
    body: string,
    done?: (
      ctx: CommandContext & { yes: boolean; no: boolean }
    ) => any | Promise<any>
  ): Promise<CommandContext & { yes: boolean; no: boolean }>;

  /**
   * Adds a reply listener for a specific message ID.
   * @param mid - The ID of the message to listen for replies.
   * @param callback - Optional callback to handle the reply context.
   * @returns A promise resolving to the generic type `T`.
   * @deprecated
   */
  addReplyListener?: <T>(
    mid: string,
    callback?: (
      ctx: CommandContext & {
        repObj: PromiseStandardReplyArg<T>;
      }
    ) => any | Promise<any>
  ) => Promise<T>;

  /**
   * Adds a reaction listener for a specific message ID.
   * @param mid - The ID of the message to listen for reactions.
   * @param callback - Optional callback to handle the reaction context.
   * @deprecated
   * @returns A promise resolving to the generic type `T`.
   */
  addReactionListener?: <T>(
    mid: string,
    callback?: (
      ctx: CommandContext & {
        repObj: PromiseStandardReplyArg<T>;
      }
    ) => any | Promise<any>
  ) => Promise<T>;

  /**
   * Waits for a reply to a specific message.
   * @param body - The content of the message to wait for a reply to.
   * @param callback - Optional callback to handle the reply context.
   * @returns A promise resolving to the input of the command context.
   * @deprecated
   */
  waitForReply?: <T>(
    body: string,
    callback?:
      | ((
          ctx: CommandContext & {
            repObj: PromiseStandardReplyArg<T>;
          }
        ) => any | Promise<any>)
      | undefined
  ) => Promise<CommandContext["input"]>;

  /**
   * Waits for a reaction to a specific message.
   * @param body - The content of the message to wait for a reaction to.
   * @param callback - Optional callback to handle the reaction context.
   * @returns A promise resolving to the input of the command context.
   * @deprecated
   */
  waitForReaction?: <T>(
    body: string,
    callback?:
      | ((
          ctx: CommandContext & {
            reObj: PromiseStandardReplyArg<T>;
          }
        ) => any | Promise<any>)
      | undefined
  ) => Promise<CommandContext["input"]>;

  /**
   * Waits for a quick reaction with specific options.
   * @param body - The content of the message to wait for a reaction to.
   * @param options - Options for the quick reaction.
   * @returns A promise resolving to the input of the command context.
   * @deprecated
   */
  quickWaitReact?: (
    body: string,
    options: {
      authorOnly?: boolean;
      author?: string;
      edit?: string;
      emoji?: string;
    }
  ) => Promise<CommandContext["input"]>;

  selectItem: BriefcaseAPI.BoundSelectItem;
}
export interface StandardReplyArg {
  key?: string | undefined;
  callback?: CommandEntry | undefined;
  [key: string]: any;
}

export interface PromiseStandardReplyArg<T> extends StandardReplyArg {
  resolve: (arg: T) => void;
  reject: (arg: any) => void;
}

export default OutputProps;
