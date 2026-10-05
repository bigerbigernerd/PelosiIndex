import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';

export function prepareDataRevision(web) {
  const source = path.join(web, 'public/data/v2');
  const walk = d => readdirSync(d, {withFileTypes:true}).flatMap(e => {
    if (e.isSymbolicLink()) throw Error('Data snapshots cannot contain symlinks');
    return e.isDirectory() ? walk(path.join(d,e.name)) : [path.join(d,e.name)];
  });
  const files = walk(source).sort();
  const hash = createHash('sha256');
  for (const file of files) {
    const relative = path.relative(source,file).split(path.sep).join('/');
    if (!/^(graph|holders|atlas|credits)\.json$/.test(relative) && !/^s\/[a-z0-9-]+\.json$/.test(relative)) throw Error('Unapproved data snapshot file');
    hash.update(relative + '\0').update(readFileSync(file));
  }
  const revision = hash.digest('hex').slice(0,16);
  for (const file of files) {
    const target = path.join(web, 'public/data/revisions', revision, path.relative(source,file));
    mkdirSync(path.dirname(target),{recursive:true});
    writeFileSync(target,readFileSync(file));
  }
  writeFileSync(path.join(source,'../version.json'),JSON.stringify({revision,base:`/data/revisions/${revision}/`,legacy:{base:'/data/v2/',snapshot:'2026-10-04'}})+'\n');
  return revision;
}
