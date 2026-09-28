import { inArray, sql, type SQL } from "drizzle-orm";
import { employees } from "@/db/schema";
import type { StationScope } from "@/lib/access";

/**
 * WHERE fragment limiting a query that joins `employees` to the
 * caller's station scope. `undefined` (no filter) for all-station HR;
 * `false` for an empty scope so nothing leaks by accident.
 */
export function employeeScopeFilter(scope: StationScope): SQL | undefined {
  if (scope.all) return undefined;
  if (scope.teams.length === 0) return sql`false`;
  return inArray(employees.team, scope.teams);
}
