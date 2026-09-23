"use client";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { regions, type ReliefData } from "./relief";
type Context = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
const schema = z
  .object({
    query: z.string().max(100).default(""),
    region: z.enum(["All regions", ...regions]).default("All regions"),
    priority: z
      .enum(["All priorities", "Critical", "High", "Standard"])
      .default("All priorities"),
  })
  .strict();
export function useReliefTools(
  data: ReliefData,
  view: string,
  setFilters: (f: z.infer<typeof schema>) => void,
) {
  const current = useRef({ data, setFilters });
  current.current = { data, setFilters };
  useEffect(() => {
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    const register = (tool: Parameters<Context["registerTool"]>[0]) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: life.signal }),
        ).catch((e) => console.warn("Workspace tool unavailable", e));
      } catch (e) {
        console.warn("Workspace tool unavailable", e);
      }
    };
    register({
      name: "read_relief_workspace",
      description:
        "Read the currently displayed fictional clinic requests, donations and shipment records. Does not refresh or change any records.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        z.object({}).strict().parse(input);
        return current.current.data;
      },
    });
    if (view === "overview" || view === "requests")
      register({
        name: "filter_clinic_requests",
        description:
          "Set the visible request search, state and priority filters. Does not create, allocate or change resource records.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", maxLength: 100 },
            region: { type: "string", enum: ["All regions", ...regions] },
            priority: {
              type: "string",
              enum: ["All priorities", "Critical", "High", "Standard"],
            },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const filters = schema.parse(input);
          current.current.setFilters(filters);
          return { filters };
        },
      });
    return () => life.abort();
  }, [view]);
}
