import { beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
const fake=vi.hoisted(()=>({auth:{getUser:vi.fn()},rpc:vi.fn(),from:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>fake}));
let handler:(r:Request)=>Promise<Response>;
const fetchMock=vi.fn();
const id='00000000-0000-4000-8000-000000000003';
const user='00000000-0000-4000-8000-000000000001';
const updates:Record<string,unknown>[]=[];
const env:Record<string,string>={SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-secret',PANGRAM_API_KEY:'provider-secret',PANGRAM_MODEL:'pangram-4',ALLOWED_ORIGINS:'chrome-extension://test'};
beforeAll(async()=>{vi.stubGlobal('Deno',{env:{get:(k:string)=>env[k]},serve:(h:typeof handler)=>{handler=h;}});await import('../../supabase/functions/analyze/index');});
beforeEach(()=>{
 vi.clearAllMocks();updates.length=0;vi.stubGlobal('fetch',fetchMock);
 fake.auth.getUser.mockResolvedValue({data:{user:{id:user}},error:null});
 fake.rpc.mockResolvedValue({data:{created:true,request:{id,user_id:user,status:'creating'}},error:null});
 fake.from.mockImplementation(()=>{const chain:any={update:(v:Record<string,unknown>)=>{updates.push(v);return chain},select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:null,error:null}),then:(resolve:any)=>Promise.resolve({data:null,error:null}).then(resolve)};return chain;});
 fetchMock.mockImplementation(async(url:string)=>url.endsWith('/models')?Response.json({models:['pangram-4']}):Response.json({task_id:'provider-task'}));
});
const req=(body:unknown,auth=true,origin='chrome-extension://test')=>new Request('https://project.supabase.co/functions/v1/analyze',{method:'POST',headers:{'Content-Type':'application/json','Origin':origin,...(auth?{Authorization:'Bearer user-token'}:{})},body:JSON.stringify(body)});
describe('analysis gateway',()=>{
 it('requires authentication and rejects unconfigured browser origins',async()=>{expect((await handler(req({action:'quota'},false))).status).toBe(401);expect((await handler(req({action:'quota'},true,'https://evil.example'))).status).toBe(403);expect(fetchMock).not.toHaveBeenCalled();});
 it('validates the bearer token with Auth',async()=>{fake.auth.getUser.mockResolvedValue({data:{user:null},error:new Error('invalid')});expect((await handler(req({action:'submit',requestId:id,text:'word '.repeat(300)})))).toHaveProperty('status',401);expect(fake.rpc).not.toHaveBeenCalled();});
 it('rejects undersized passages before reserving credits',async()=>{expect((await handler(req({action:'submit',requestId:id,text:'short'}))).status).toBe(400);expect(fake.rpc).not.toHaveBeenCalled();});
 it('submits only the approved text with a private result and server-held key',async()=>{const response=await handler(req({action:'submit',requestId:id,text:'word '.repeat(301)}));expect(await response.json()).toEqual({status:'pending',requestId:id});expect(fake.rpc).toHaveBeenCalledWith('reserve_analysis',expect.objectContaining({p_credits:4,p_user:user}));const call=fetchMock.mock.calls.find(c=>c[0].endsWith('/task'))!;expect(JSON.parse(call[1].body).public_dashboard_link).toBe(false);expect(call[1].headers['x-api-key']).toBe('provider-secret');expect(updates[0]).toEqual({task_id:'provider-task',status:'pending',model:'pangram-4'});});
 it('keeps reservations on uncertain submissions and never resubmits the same request',async()=>{fetchMock.mockImplementation(async(url:string)=>{if(url.endsWith('/models'))return Response.json({models:['pangram-4']});throw new Error('timeout');});const first=await handler(req({action:'submit',requestId:id,text:'word '.repeat(300)}));expect((await first.json()).status).toBe('uncertain');expect(fake.rpc.mock.calls.some(c=>c[0]==='release_analysis')).toBe(false);fake.rpc.mockResolvedValue({data:{created:false,request:{status:'uncertain'}},error:null});fetchMock.mockClear();const second=await handler(req({action:'submit',requestId:id,text:'word '.repeat(300)}));expect((await second.json()).status).toBe('uncertain');expect(fetchMock).not.toHaveBeenCalled();});
 it('releases allowance when the selected model is unavailable before submission',async()=>{fetchMock.mockResolvedValue(Response.json({models:['other-model']}));const r=await handler(req({action:'submit',requestId:id,text:'word '.repeat(300)}));expect(r.status).toBe(503);expect(fake.rpc).toHaveBeenCalledWith('release_analysis',{p_request:id});expect(fetchMock).toHaveBeenCalledTimes(1);});
 it('converts exhausted quotas to a useful response without calling the provider',async()=>{fake.rpc.mockResolvedValue({data:null,error:{message:'user_quota'}});expect((await handler(req({action:'submit',requestId:id,text:'word '.repeat(300)}))).status).toBe(429);expect(fetchMock).not.toHaveBeenCalled();});
 it('does not expose another user’s request',async()=>{const r=await handler(req({action:'status',requestId:id}));expect(r.status).toBe(404);expect(fetchMock).not.toHaveBeenCalled();});
});
