import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { demo, DEMO_APP } from "./demo";
import { epm, getEpmConfig, type EpmConfig } from "./client";

// Read-only tools Claude can call. Nothing here writes data or runs jobs.

const app = z.string().optional().describe("Application name. Omit to use the default application.");
const axis = z.strictObject({
  dimension: z.string().describe("Dimension name, e.g. Account, Period, Entity"),
  members: z
    .array(z.string())
    .min(1)
    .describe('Member names or member functions, e.g. ["Jan","Feb"] or ["ILvl0Descendants(Q1)"]'),
});

const schemas = {
  list_applications: z.strictObject({}),
  list_substitution_variables: z.strictObject({ application: app }),
  get_member: z.strictObject({
    application: app,
    dimension: z.string(),
    member: z.string().describe("Member name; use the dimension name itself to see its top-level children"),
  }),
  query_data: z.strictObject({
    application: app,
    cube: z.string().describe("Cube / plan type, e.g. Plan1, OEP_FS, Consol"),
    pov: z
      .array(z.strictObject({ dimension: z.string(), member: z.string() }))
      .describe("One member for every dimension not on rows or columns (Scenario, Version, Year, Currency, ...)"),
    rows: z.array(axis).min(1),
    columns: z.array(axis).min(1),
  }),
  list_recent_jobs: z.strictObject({
    application: app,
    limit: z.number().int().min(1).max(50).optional(),
  }),
} as const;

type ToolName = keyof typeof schemas;

const descriptions: Record<ToolName, string> = {
  list_applications: "List the EPM applications available to the user.",
  list_substitution_variables:
    "List substitution variables (e.g. current year/month). Check these before assuming which year or period is current.",
  get_member:
    "Look up a dimension member: its parent, children, and properties. Use it to discover valid member names before querying data.",
  query_data:
    "Read numbers from a cube (Planning exportdataslice). Put the dimensions to compare on rows/columns and fix every other dimension in pov. Returns a grid of values; #Missing means no data.",
  list_recent_jobs: "List recent EPM jobs (data loads, business rules, refreshes) and their status.",
};

function toInputSchema(schema: z.ZodType): Anthropic.Beta.BetaTool["input_schema"] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest as Anthropic.Beta.BetaTool["input_schema"];
}

export const epmTools: Anthropic.Beta.BetaTool[] = (Object.keys(schemas) as ToolName[]).map((name) => ({
  name,
  description: descriptions[name],
  input_schema: toInputSchema(schemas[name]),
  eager_input_streaming: true,
}));

export function isDemoMode() {
  return getEpmConfig() === null;
}

function toGridAxis(a: z.infer<typeof axis>[]) {
  return a.map((x) => ({ dimensions: [x.dimension], members: [x.members] }));
}

async function run(name: ToolName, input: unknown, config: EpmConfig | null): Promise<unknown> {
  const appName = (i: { application?: string }) =>
    i.application ?? config?.defaultApp ?? (config ? undefined : DEMO_APP);
  const needApp = (i: { application?: string }) => {
    const a = appName(i);
    if (!a) throw new Error("No application given and EPM_APPLICATION is not set. Call list_applications first.");
    return a;
  };

  switch (name) {
    case "list_applications":
      return config ? epm.listApplications(config) : demo.listApplications();

    case "list_substitution_variables": {
      const i = schemas.list_substitution_variables.parse(input);
      return config ? epm.listSubstitutionVariables(config, needApp(i)) : demo.listSubstitutionVariables();
    }

    case "get_member": {
      const i = schemas.get_member.parse(input);
      return config ? epm.getMember(config, needApp(i), i.dimension, i.member) : demo.getMember(i.dimension, i.member);
    }

    case "query_data": {
      const i = schemas.query_data.parse(input);
      if (!config) {
        const scenario = i.pov.find((p) => /scenario/i.test(p.dimension))?.member ?? "Actual";
        return demo.exportDataSlice(i.rows[0].members, i.columns[0].members, scenario);
      }
      return epm.exportDataSlice(config, needApp(i), i.cube, {
        suppressMissingBlocks: true,
        pov: { dimensions: i.pov.map((p) => p.dimension), members: i.pov.map((p) => [p.member]) },
        rows: toGridAxis(i.rows),
        columns: toGridAxis(i.columns),
      });
    }

    case "list_recent_jobs": {
      const i = schemas.list_recent_jobs.parse(input);
      return config ? epm.listJobs(config, needApp(i), i.limit ?? 10) : demo.listJobs();
    }
  }
}

/** Runs one tool call and returns a tool_result block. Errors go back to Claude as is_error results. */
export async function runEpmTool(block: Anthropic.Beta.BetaToolUseBlock): Promise<Anthropic.Beta.BetaToolResultBlockParam> {
  const base = { type: "tool_result" as const, tool_use_id: block.id };
  if (!(block.name in schemas)) {
    return { ...base, is_error: true, content: `Unknown tool ${block.name}` };
  }
  const name = block.name as ToolName;
  // With eager input streaming the API doesn't validate inputs, so check them here.
  const parsed = schemas[name].safeParse(block.input);
  if (!parsed.success) {
    return { ...base, is_error: true, content: `Invalid input: ${parsed.error.message}` };
  }
  try {
    const result = await run(name, parsed.data, getEpmConfig());
    // Keep very large grids from flooding the context.
    const json = JSON.stringify(result);
    return { ...base, content: json.length > 100_000 ? json.slice(0, 100_000) + "…(truncated)" : json };
  } catch (err) {
    return { ...base, is_error: true, content: err instanceof Error ? err.message : String(err) };
  }
}
