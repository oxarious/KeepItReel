import { createClient } from '@supabase/supabase-js';
import { summarizeResult, validId, validateText } from './domain.ts';

const serviceUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const providerKey = Deno.env.get('PANGRAM_API_KEY');
const model = Deno.env.get('PANGRAM_MODEL');
const allowedOrigins = new Set((Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s=>s.trim()).filter(Boolean));
const providerBase = 'https://text.external-api.pangram.com';
const admin = createClient(serviceUrl, serviceKey, { auth: { persistSession: false } });
const providerHeaders = { 'x-api-key': providerKey || '', 'Content-Type': 'application/json' };

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const cors: Record<string,string> = { 'Vary':'Origin', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info', 'Cache-Control':'no-store' };
  if (allowedOrigins.has(origin)) cors['Access-Control-Allow-Origin'] = origin;
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type':'application/json' } });
  if (origin && !allowedOrigins.has(origin)) return respond({error:'Origin is not allowed.'},403);
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
  if (req.method !== 'POST') return respond({error:'Use POST.'},405);
  const bearer = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!bearer) return respond({error:'Sign in to check text.'},401);
  const {data:auth,error:authError} = await admin.auth.getUser(bearer);
  if (authError || !auth.user) return respond({error:'Your session has expired. Sign in again.'},401);
  if (!providerKey || !model) return respond({error:'The analysis service has not been configured by its operator.'},503);
  // Limit streamed request size as well as Content-Length to avoid unbounded buffering.
  let source='';
  try {
    const reader=req.body?.getReader(); const decoder=new TextDecoder(); let bytes=0;
    if (!reader) return respond({error:'Request body is required.'},400);
    while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>220000){await reader.cancel();return respond({error:'Request too large.'},413);}source+=decoder.decode(value,{stream:true});}source+=decoder.decode();
  }catch{return respond({error:'Unable to read request.'},400);}
  let body: Record<string,unknown>;
  try { body=JSON.parse(source); if(!body||typeof body!=='object'||Array.isArray(body))throw new Error(); }catch{return respond({error:'Invalid JSON request.'},400);}
  const user=auth.user.id;
  if(body.action==='quota'){
    const month=new Date().toISOString().slice(0,7)+'-01';
    const [{data:limit,error:lerr},{data:usage,error:uerr}]=await Promise.all([admin.from('analysis_limits').select('user_monthly_credits').eq('id',true).single(),admin.from('analysis_usage').select('credits').eq('scope',user).eq('month',month).maybeSingle()]);
    if(lerr||uerr)return respond({error:'Allowance is temporarily unavailable.'},503);
    return respond({remaining:Math.max(0,limit.user_monthly_credits-(usage?.credits||0))});
  }
  if(!['submit','status'].includes(String(body.action))||!validId(body.requestId))return respond({error:'Invalid action or request ID.'},400);
  const id=body.requestId;
  let request: Record<string,any> | null=null;
  if(body.action==='submit'){
    let passage:{text:string;credits:number};
    try{passage=validateText(body.text);}catch(e){return respond({error:(e as Error).message},400);}
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(passage.text));
    const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
    const {data:reservation,error}=await admin.rpc('reserve_analysis',{p_user:user,p_request:id,p_credits:passage.credits,p_hash:hash});
    if(error){
      const msg=error.message;
      if(msg.includes('request_conflict'))return respond({error:'This request ID already belongs to different content.'},409);
      if(msg.includes('quota'))return respond({error:msg.includes('global')?'The pilot has reached its monthly analysis budget.':'Your monthly analysis allowance is used up.'},429);
      if(msg.includes('rate_limit'))return respond({error:'Please wait a minute before checking another passage.'},429);
      return respond({error:'Unable to reserve analysis allowance.'},503);
    }
    request=reservation.request;
    if(reservation.created){
      try{
        // Confirm the configured selector is available; never silently switch to a differently priced model.
        const catalog=await fetch(`${providerBase}/models`,{headers:providerHeaders,signal:AbortSignal.timeout(10000)});
        const catalogBody=await catalog.json();
        if(!catalog.ok||!Array.isArray(catalogBody.models)||!catalogBody.models.includes(model)){
          await admin.rpc('release_analysis',{p_request:id});
          return respond({error:'The configured detection model is unavailable. Your allowance was released.'},503);
        }
      }catch{await admin.rpc('release_analysis',{p_request:id});return respond({error:'Cannot reach the provider. Your allowance was released.'},503);}
      try{
        const submission=await fetch(`${providerBase}/task`,{method:'POST',headers:providerHeaders,body:JSON.stringify({text:passage.text,model,public_dashboard_link:false}),signal:AbortSignal.timeout(20000)});
        if(!submission.ok){
          if([400,401,403,404,413,422,429].includes(submission.status)){await admin.rpc('release_analysis',{p_request:id});return respond({error:'The provider rejected this request. Your allowance was released.'},502);}
          throw new Error('Uncertain submission');
        }
        const submitted=await submission.json();
        if(typeof submitted.task_id!=='string'||submitted.task_id.length>200)throw new Error('Missing task ID');
        const {error:updateError}=await admin.from('analysis_requests').update({task_id:submitted.task_id,status:'pending',model}).eq('id',id);
        if(updateError)throw new Error('Unable to persist task ID');
        return respond({status:'pending',requestId:id});
      }catch{
        // A network timeout may still have created a billable job. Keep its reservation and never auto-resubmit.
        await admin.from('analysis_requests').update({status:'uncertain'}).eq('id',id);
        return respond({status:'uncertain',requestId:id});
      }
    }
  }else{
    const {data,error}=await admin.from('analysis_requests').select('*').eq('id',id).eq('user_id',user).maybeSingle();
    if(error)return respond({error:'Request status is unavailable.'},503);
    if(!data)return respond({error:'Request not found.'},404);
    request=data;
  }
  if(!request)return respond({error:'Request not found.'},404);
  if(request.status==='complete')return respond({status:'complete',result:request.result});
  if(['failed','uncertain'].includes(request.status))return respond({status:request.status});
  if(!request.task_id){
    if(Date.now()-Date.parse(request.created_at)>60000)return respond({status:'uncertain'});
    return respond({status:'pending'});
  }
  try{
    const upstream=await fetch(`${providerBase}/task/${encodeURIComponent(request.task_id)}`,{headers:providerHeaders,signal:AbortSignal.timeout(15000)});
    if(!upstream.ok)return respond({error:'The provider status is temporarily unavailable. Check this request again.'},503);
    const data=await upstream.json();
    if(data.stage==='STAGE_FAILED'){
      // Do not assume the provider refunds failed jobs. Operator can reconcile/refund through SQL.
      await admin.from('analysis_requests').update({status:'failed'}).eq('id',id);
      return respond({status:'failed'});
    }
    if(data.stage!=='STAGE_SUCCESS')return respond({status:'pending'});
    const result=summarizeResult(data,request.model || model);
    const {error}=await admin.from('analysis_requests').update({status:'complete',result}).eq('id',id);
    if(error)return respond({error:'Unable to save the assessment. Check this request again.'},503);
    return respond({status:'complete',result});
  }catch{return respond({error:'The provider timed out. Check this request again; it will not be submitted twice.'},503);}
});
