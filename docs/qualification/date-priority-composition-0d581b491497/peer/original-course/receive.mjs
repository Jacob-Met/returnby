import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const parser = await import(pathToFileURL(process.argv[2]).href);
const cases = JSON.parse(readFileSync(process.argv[3], 'utf8')).cases;
const rows = cases.map(c => {
  const before = JSON.stringify(c);
  const actual = parser.parse(c.text, c.knownMerchants);
  const actualDates = parser.findDates(c.text);
  return {name:c.name,actual,actualDates,inputUnchanged:JSON.stringify(c)===before};
});
process.stdout.write(JSON.stringify({node:process.version,rows})+'\n');
