// Fails when the committed generated types do not match docs/contracts/openapi.json.
// Run after updating the contract: `npm run api:generate`, then commit both files.
import { execSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'api-drift-'));
const out = join(dir, 'api.d.ts');
try {
  execSync(`npx --yes openapi-typescript@7.13.0 docs/contracts/openapi.json -o ${out}`, { stdio: 'ignore' });
  execSync(`npx prettier --config .prettierrc.json --write ${out}`, { stdio: 'ignore' });
  const fresh = readFileSync(out, 'utf8');
  const committed = readFileSync('src/app/core/api/generated/api.d.ts', 'utf8');
  if (fresh !== committed) {
    console.error('Generated API types are out of date with docs/contracts/openapi.json. Run: npm run api:generate');
    process.exit(1);
  }
  console.log('Generated API types match the contract.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
