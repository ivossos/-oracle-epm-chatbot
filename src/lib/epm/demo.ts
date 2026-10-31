// Sample data used when EPM_URL is not set, so the chat works out of the box.
// Numbers are made up.

export const DEMO_APP = "Vision";

const accounts: Record<string, Record<string, number>> = {
  // account -> period -> value (FY26, Actual, USD)
  "Total Revenue": { Jan: 1_250_000, Feb: 1_180_000, Mar: 1_410_000, Q1: 3_840_000 },
  "Cost of Sales": { Jan: 610_000, Feb: 590_000, Mar: 702_000, Q1: 1_902_000 },
  "Gross Margin": { Jan: 640_000, Feb: 590_000, Mar: 708_000, Q1: 1_938_000 },
  "Operating Expenses": { Jan: 420_000, Feb: 415_000, Mar: 440_000, Q1: 1_275_000 },
  "Net Income": { Jan: 165_000, Feb: 128_000, Mar: 198_000, Q1: 491_000 },
};
const budgetFactor = 1.05;

export const demo = {
  listApplications: () => ({
    items: [{ name: DEMO_APP, type: "HP", description: "Demo Planning application (sample data)" }],
  }),

  listSubstitutionVariables: () => ({
    items: [
      { name: "CurYear", value: "FY26", planType: "ALL" },
      { name: "CurMonth", value: "Mar", planType: "ALL" },
      { name: "PriorYear", value: "FY25", planType: "ALL" },
    ],
  }),

  getMember: (dimension: string, member: string) => {
    if (dimension.toLowerCase() === "account" && member === "Account") {
      return { memberName: "Account", children: Object.keys(accounts).map((m) => ({ memberName: m })) };
    }
    if (dimension.toLowerCase() === "account" && accounts[member]) {
      return { memberName: member, parentName: "Account", dataStorage: "Store", children: [] };
    }
    if (dimension.toLowerCase() === "period") {
      return { memberName: member, children: member === "Q1" ? ["Jan", "Feb", "Mar"].map((m) => ({ memberName: m })) : [] };
    }
    return { error: `Member ${member} not found in ${dimension} (demo data has Account and Period only).` };
  },

  exportDataSlice: (rowsMembers: string[], columnMembers: string[], scenario: string) => {
    const factor = /budget|plan/i.test(scenario) ? budgetFactor : 1;
    const rowList = rowsMembers.length ? rowsMembers : Object.keys(accounts);
    const colList = columnMembers.length ? columnMembers : ["Jan", "Feb", "Mar", "Q1"];
    return {
      note: "Demo data (EPM_URL not configured)",
      pov: { Scenario: scenario, Year: "FY26", Currency: "USD" },
      columns: [colList],
      rows: rowList.map((acct) => ({
        headers: [acct],
        data: colList.map((p) => {
          const v = accounts[acct]?.[p];
          return v === undefined ? "#Missing" : String(Math.round(v * factor));
        }),
      })),
    };
  },

  listJobs: () => ({
    items: [
      { jobId: 1042, jobName: "Refresh Database", jobType: "CUBE_REFRESH", status: 0, descriptiveStatus: "Completed", endTime: "2026-10-30 22:14" },
      { jobId: 1041, jobName: "Aggregate Plan", jobType: "RULES", status: 0, descriptiveStatus: "Completed", endTime: "2026-10-30 21:02" },
      { jobId: 1040, jobName: "Import Actuals", jobType: "IMPORT_DATA", status: 2, descriptiveStatus: "Error", details: "3 rejected rows" },
    ],
  }),
};
