/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminDeleteActions from "../adminDeleteActions.js";
import type * as adminSettings from "../adminSettings.js";
import type * as aiChats from "../aiChats.js";
import type * as clinicalNotes from "../clinicalNotes.js";
import type * as clinics from "../clinics.js";
import type * as devices from "../devices.js";
import type * as documents from "../documents.js";
import type * as email from "../email.js";
import type * as emailTemplate from "../emailTemplate.js";
import type * as http from "../http.js";
import type * as manufacturers from "../manufacturers.js";
import type * as patients from "../patients.js";
import type * as scrapeJobs from "../scrapeJobs.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as surgeonDocuments from "../surgeonDocuments.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminDeleteActions: typeof adminDeleteActions;
  adminSettings: typeof adminSettings;
  aiChats: typeof aiChats;
  clinicalNotes: typeof clinicalNotes;
  clinics: typeof clinics;
  devices: typeof devices;
  documents: typeof documents;
  email: typeof email;
  emailTemplate: typeof emailTemplate;
  http: typeof http;
  manufacturers: typeof manufacturers;
  patients: typeof patients;
  scrapeJobs: typeof scrapeJobs;
  search: typeof search;
  seed: typeof seed;
  surgeonDocuments: typeof surgeonDocuments;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
