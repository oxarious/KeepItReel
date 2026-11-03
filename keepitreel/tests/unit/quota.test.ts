import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
let db:PGlite;
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const reserve=(user:string,id:string,credits:number,hash='a'.repeat(64))=>db.query<{result:any}>('select public.reserve_analysis($1,$2,$3,$4) as result',[user,id,credits,hash]);
beforeAll(async()=>{db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key);');await db.query('insert into auth.users values($1),($2)',[a,b]);await db.exec(readFileSync('supabase/migrations/202610270001_analysis.sql','utf8'));},30000);
afterAll(async()=>{await db.close();});
describe('atomic analysis budget',()=>{
  it('charges only once for a retried request',async()=>{const id=randomUUID();const first=await reserve(a,id,5);const second=await reserve(a,id,5);expect(first.rows[0]?.result.created).toBe(true);expect(second.rows[0]?.result.created).toBe(false);const rows=await db.query<{credits:number}>('select credits from analysis_usage where scope=$1',[a]);expect(rows.rows[0]?.credits).toBe(5);});
  it('rejects request-ID reuse with different text or a different user',async()=>{const id=randomUUID();await reserve(a,id,5);await expect(reserve(a,id,5,'b'.repeat(64))).rejects.toThrow('request_conflict');await expect(reserve(b,id,5)).rejects.toThrow('request_conflict');});
  it('enforces the user budget under overlapping requests',async()=>{const results=await Promise.allSettled([reserve(a,randomUUID(),10),reserve(a,randomUUID(),10)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);const rows=await db.query<{credits:number}>('select credits from analysis_usage where scope=$1',[a]);expect(rows.rows[0]?.credits).toBe(20);});
  it('enforces the global budget and makes refunds idempotent',async()=>{await db.exec('update analysis_limits set global_monthly_credits=25;');const id=randomUUID();await reserve(b,id,5);await expect(reserve(b,randomUUID(),5)).rejects.toThrow('global_quota');await db.query('select release_analysis($1)',[id]);await db.query('select release_analysis($1)',[id]);const rows=await db.query<{credits:number}>("select credits from analysis_usage where scope='global'");expect(rows.rows[0]?.credits).toBe(20);});
  it('does not give authenticated users direct quota access',async()=>{await db.exec('set role authenticated;');try{await expect(db.query('select * from analysis_usage')).rejects.toThrow();await expect(reserve(a,randomUUID(),5)).rejects.toThrow();}finally{await db.exec('reset role;');}});
});
