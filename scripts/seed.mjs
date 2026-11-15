// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {createDatabase} from '../server/database.mjs';
const path=process.env.DB_PATH??resolve('.runtime/demo.sqlite');
await mkdir(resolve(path,'..'),{recursive:true});
const db=createDatabase({path,seed:Number(process.env.SEED??142)});
console.log(JSON.stringify(db.health(),null,2));db.close();
