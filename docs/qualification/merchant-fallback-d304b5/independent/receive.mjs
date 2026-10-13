import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]),output=resolve(process.argv[3]),mode=process.argv[4];
if(!['original','fixed'].includes(mode))throw new Error('Expected original or fixed receiving mode');
const here=dirname(fileURLToPath(import.meta.url));
const rawContract=await readFile(resolve(here,'contract.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
if(sha(rawContract)!=='d67384b5e646befc5f65f528bb87080721e3c370ed4977671f2f60119e52f112')throw new Error('Frozen contract mismatch');
const contract=JSON.parse(rawContract),paths=['src/parse.ts','src/policy.ts','data/policies.json'];
const before={};for(const path of paths)before[path]=sha(await readFile(resolve(root,path)));
const {parse}=await import(pathToFileURL(resolve(root,'src/parse.ts')));
const policy=await readFile(resolve(root,'src/policy.ts'),'utf8');
const importLine="import policies from '../data/policies.json';";
if(policy.split(importLine).length!==2)throw new Error('Unexpected policy import binding');
const data=await readFile(resolve(root,'data/policies.json'));
const jsonURL='data:application/json;base64,'+data.toString('base64');
const js=stripTypeScriptTypes(policy.replace(importLine,'import policies from '+JSON.stringify(jsonURL)+" with { type: 'json' };"));
const {lookup,knownMerchants}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const cases=contract.cases.map(test=>{
 const parsed=parse(test.text+'\nOrder #AB1234\nOrder date: 2026-10-03\nTotal: $12.00',test.known??knownMerchants);
 const policy=lookup(parsed.merchant);
 const checks={merchant:parsed.merchant===test.expected_merchant,found:parsed.found.merchant===test.expected_found,
 policy:JSON.stringify(policy)===JSON.stringify(test.expected_policy),
 unchanged_fields:Object.entries(contract.unchanged_fields).every(([key,value])=>parsed[key]===value&&parsed.found[key]===true)};
 return {name:test.name,parsed,policy,checks,passed:Object.values(checks).every(Boolean)};
});
const after={};for(const path of paths)after[path]=sha(await readFile(resolve(root,path)));
const failed=cases.filter(x=>!x.passed).map(x=>x.name);
const unchanged=JSON.stringify(before)===JSON.stringify(after);
const expectedFailures=contract.cases.filter(x=>x.name.startsWith('reject-')).map(x=>x.name);
const qualified=unchanged&&(mode==='fixed'?failed.length===0:JSON.stringify(failed)===JSON.stringify(expectedFailures));
const result={completed_at:new Date().toISOString(),runtime:process.version,mode,contract_sha256:sha(rawContract),before,after,unchanged,cases,passed_cases:cases.length-failed.length,total_cases:cases.length,qualified,scope:'Actual unchanged parser import and maintained policy module with only its JSON transport adapted to Node built-in loading; no application/browser/native execution.'};
await mkdir(output,{recursive:false});
await writeFile(resolve(output,'receiving.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({qualified,mode,passed_cases:result.passed_cases,total_cases:cases.length,failed,source:before}));
process.exitCode=qualified?0:1;
