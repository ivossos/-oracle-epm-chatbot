// Sample FCCS-style data used when EPM_URL is not set, so the chat works
// without a real Oracle EPM connection. All numbers are made up.

export const DEMO_APP = "FCCS_Demo";
export const DEMO_CUBE = "Consol";

// ---------- Dimension hierarchies (parent -> children) ----------

type Tree = Record<string, string[]>;

const hierarchies: Record<string, { root: string; tree: Tree }> = {
  Account: {
    root: "Net Income",
    tree: {
      "Net Income": ["Gross Margin", "Operating Expenses"],
      "Gross Margin": ["Total Revenue", "Cost of Sales"],
      "Total Revenue": ["Product Revenue", "Services Revenue"],
      "Operating Expenses": ["Salaries", "Rent", "Travel", "IT Costs"],
    },
  },
  Entity: {
    root: "Total Entity",
    tree: {
      "Total Entity": ["UK", "Ireland"],
      UK: ["Belfast", "London", "Edinburgh"],
      Ireland: ["Dublin"],
    },
  },
  Period: {
    root: "YearTotal",
    tree: {
      YearTotal: ["Q1", "Q2", "Q3", "Q4"],
      Q1: ["Jan", "Feb", "Mar"],
      Q2: ["Apr", "May", "Jun"],
      Q3: ["Jul", "Aug", "Sep"],
      Q4: ["Oct", "Nov", "Dec"],
    },
  },
  Scenario: { root: "Scenario", tree: { Scenario: ["Actual", "Budget", "Forecast"] } },
  Years: { root: "Years", tree: { Years: ["FY25", "FY26"] } },
  Currency: { root: "Currency", tree: { Currency: ["GBP"] } },
};

// Common alternative names Claude might use for a dimension.
const DIM_ALIASES: Record<string, string> = {
  account: "Account",
  entity: "Entity",
  period: "Period",
  scenario: "Scenario",
  year: "Years",
  years: "Years",
  currency: "Currency",
};

const CUR_YEAR = "FY26";
const CUR_MONTH = "Sep"; // Actuals exist up to this month in the current year
const MONTHS = hierarchies.Period.tree.Q1.concat(
  hierarchies.Period.tree.Q2,
  hierarchies.Period.tree.Q3,
  hierarchies.Period.tree.Q4,
);

function dimName(d: string) {
  return DIM_ALIASES[d.toLowerCase()] ?? null;
}

function parentOf(dim: string, member: string) {
  const { tree } = hierarchies[dim];
  return Object.keys(tree).find((p) => tree[p].includes(member));
}

function allMembers(dim: string): string[] {
  const { root, tree } = hierarchies[dim];
  const out: string[] = [];
  const walk = (m: string) => {
    out.push(m);
    (tree[m] ?? []).forEach(walk);
  };
  walk(root);
  return out;
}

function findMember(dim: string, name: string) {
  return allMembers(dim).find((m) => m.toLowerCase() === name.trim().toLowerCase());
}

function leaves(dim: string, member: string): string[] {
  const kids = hierarchies[dim].tree[member];
  return kids ? kids.flatMap((k) => leaves(dim, k)) : [member];
}

function descendants(dim: string, member: string): string[] {
  const kids = hierarchies[dim].tree[member] ?? [];
  return kids.flatMap((k) => [k, ...descendants(dim, k)]);
}

/** Expands a member or member function like ILvl0Descendants(Q1) into member names. */
function expand(dim: string, spec: string): string[] {
  const fn = spec.match(/^\s*(\w+)\s*\(\s*"?([^")]+)"?\s*\)\s*$/);
  if (!fn) {
    const m = findMember(dim, spec);
    if (!m) throw new Error(`"${spec}" is not a member of ${dim}. Valid members: ${allMembers(dim).join(", ")}`);
    return [m];
  }
  const [, func, arg] = fn;
  const m = findMember(dim, arg);
  if (!m) throw new Error(`"${arg}" is not a member of ${dim}. Valid members: ${allMembers(dim).join(", ")}`);
  switch (func.toLowerCase()) {
    case "children":
      return hierarchies[dim].tree[m] ?? [];
    case "ichildren":
      return [m, ...(hierarchies[dim].tree[m] ?? [])];
    case "descendants":
      return descendants(dim, m);
    case "idescendants":
      return [m, ...descendants(dim, m)];
    case "lvl0descendants":
    case "ilvl0descendants":
      return leaves(dim, m);
    default:
      throw new Error(`Member function ${func} is not supported in demo mode. Use Children, IChildren, Descendants, IDescendants or ILvl0Descendants.`);
  }
}

// ---------- Numbers ----------

// Monthly base amounts per leaf account for a mid-sized entity (GBP).
const ACCOUNT_BASE: Record<string, number> = {
  "Product Revenue": 820_000,
  "Services Revenue": 410_000,
  "Cost of Sales": 590_000,
  Salaries: 260_000,
  Rent: 45_000,
  Travel: 18_000,
  "IT Costs": 52_000,
};
const ENTITY_WEIGHT: Record<string, number> = { Belfast: 0.8, London: 1.6, Edinburgh: 0.7, Dublin: 0.9 };
const SEASONALITY = [0.92, 0.88, 1.02, 0.97, 1.0, 1.05, 0.95, 0.9, 1.04, 1.06, 1.1, 1.21];

// Small deterministic noise so numbers don't look too round.
function noise(...keys: string[]) {
  let h = 2166136261;
  for (const c of keys.join("|")) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return 1 + ((h >>> 0) % 1000) / 1000 * 0.08 - 0.04;
}

function leafValue(account: string, entity: string, month: string, scenario: string, year: string): number | null {
  const mi = MONTHS.indexOf(month);
  if (scenario === "Actual" && year === CUR_YEAR && mi > MONTHS.indexOf(CUR_MONTH)) return null;
  if (scenario === "Forecast" && year !== CUR_YEAR) return null;

  const growth = year === "FY26" ? 1.06 : 1;
  let v = ACCOUNT_BASE[account] * ENTITY_WEIGHT[entity] * SEASONALITY[mi] * growth;
  if (scenario === "Budget") v *= account.includes("Revenue") ? 1.02 : 0.99;
  if (scenario === "Forecast") v *= account.includes("Revenue") ? 1.01 : 1.0;
  if (scenario !== "Budget") v *= noise(account, entity, month, scenario, year);
  return Math.round(v);
}

// Sign of each leaf account when rolled up into a parent account.
function accountSign(parent: string, leaf: string) {
  const expense = leaf === "Cost of Sales" || hierarchies.Account.tree["Operating Expenses"].includes(leaf);
  return expense && ["Net Income", "Gross Margin"].includes(parent) ? -1 : 1;
}

function cellValue(account: string, entity: string, period: string, scenario: string, year: string): number | null {
  // Forecast = Actual for closed months, Forecast after.
  let total = 0;
  let any = false;
  for (const a of leaves("Account", account)) {
    for (const e of leaves("Entity", entity)) {
      for (const p of leaves("Period", period)) {
        const sc =
          scenario === "Forecast" && year === CUR_YEAR && MONTHS.indexOf(p) <= MONTHS.indexOf(CUR_MONTH) ? "Actual" : scenario;
        const v = leafValue(a, e, p, sc, year);
        if (v !== null) {
          total += v * accountSign(account, a);
          any = true;
        }
      }
    }
  }
  return any ? total : null;
}

// ---------- Tool responses ----------

type Axis = { dimension: string; members: string[] };

export const demo = {
  listApplications: () => ({
    items: [
      {
        name: DEMO_APP,
        type: "FCCS",
        description: "Sample consolidation application (demo data)",
        cubes: [DEMO_CUBE],
        dimensions: Object.keys(hierarchies),
      },
    ],
  }),

  listSubstitutionVariables: () => ({
    items: [
      { name: "CurYear", value: CUR_YEAR, planType: "ALL" },
      { name: "CurMonth", value: CUR_MONTH, planType: "ALL" },
      { name: "PriorYear", value: "FY25", planType: "ALL" },
      { name: "Currency", value: "GBP", planType: "ALL" },
    ],
  }),

  getMember: (dimension: string, member: string) => {
    const dim = dimName(dimension);
    if (!dim) return { error: `Unknown dimension ${dimension}. Demo dimensions: ${Object.keys(hierarchies).join(", ")}` };
    const m = member.toLowerCase() === dimension.toLowerCase() ? hierarchies[dim].root : findMember(dim, member);
    if (!m) return { error: `${member} not found in ${dim}. Valid members: ${allMembers(dim).join(", ")}` };
    return {
      memberName: m,
      dimension: dim,
      parentName: parentOf(dim, m) ?? null,
      children: (hierarchies[dim].tree[m] ?? []).map((c) => ({ memberName: c })),
      isLevel0: !hierarchies[dim].tree[m],
    };
  },

  exportDataSlice: (pov: { dimension: string; member: string }[], rows: Axis[], columns: Axis[]) => {
    const ctx: Record<string, string> = {
      Account: "Net Income",
      Entity: "Total Entity",
      Period: "YearTotal",
      Scenario: "Actual",
      Years: CUR_YEAR,
      Currency: "GBP",
    };
    const ignored: string[] = [];
    for (const p of pov) {
      const dim = dimName(p.dimension);
      if (!dim) {
        ignored.push(p.dimension);
        continue;
      }
      ctx[dim] = expand(dim, p.member)[0];
    }

    // Each axis may have several dimensions; build the cross product of their members.
    const tuples = (axes: Axis[]) => {
      let out: Record<string, string>[] = [{}];
      for (const a of axes) {
        const dim = dimName(a.dimension);
        if (!dim) {
          ignored.push(a.dimension);
          continue;
        }
        const members = a.members.flatMap((m) => expand(dim, m));
        out = out.flatMap((t) => members.map((m) => ({ ...t, [dim]: m })));
      }
      return out;
    };
    const rowTuples = tuples(rows);
    const colTuples = tuples(columns);
    if (rowTuples.length * colTuples.length > 2000) {
      throw new Error("Grid too large (over 2000 cells). Ask for fewer members.");
    }

    const onGrid = new Set([...rowTuples, ...colTuples].flatMap((t) => Object.keys(t)));
    return {
      note: "Demo data (EPM_URL not configured). Amounts in GBP.",
      pov: Object.fromEntries(Object.entries(ctx).filter(([d]) => !onGrid.has(d))),
      ...(ignored.length ? { ignoredDimensions: [...new Set(ignored)] } : {}),
      columns: colTuples.map((t) => Object.values(t)),
      rows: rowTuples.map((r) => ({
        headers: Object.values(r),
        data: colTuples.map((c) => {
          const x = { ...ctx, ...r, ...c };
          const v = cellValue(x.Account, x.Entity, x.Period, x.Scenario, x.Years);
          return v === null ? "#Missing" : String(v);
        }),
      })),
    };
  },

  listJobs: () => ({
    items: [
      { jobId: 2215, jobName: "Consolidate - Sep FY26", jobType: "CONSOLIDATE", status: 0, descriptiveStatus: "Completed", endTime: "2026-10-30 22:14" },
      { jobId: 2214, jobName: "Translate - Sep FY26", jobType: "TRANSLATE", status: 0, descriptiveStatus: "Completed", endTime: "2026-10-30 21:58" },
      { jobId: 2213, jobName: "Import Actuals - Sep", jobType: "IMPORT_DATA", status: 2, descriptiveStatus: "Error", details: "12 rows rejected: unmapped entity code NI-07" },
      { jobId: 2212, jobName: "Refresh Database", jobType: "CUBE_REFRESH", status: 0, descriptiveStatus: "Completed", endTime: "2026-10-29 19:02" },
    ],
  }),
};
