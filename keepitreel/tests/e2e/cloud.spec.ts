import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
test('configured cloud UI signs in, previews text, requests consent and polls its assessment',async()=>{
 const ext=path.resolve('.output/chrome-mv3');const ctx=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
 try{
  let worker=ctx.serviceWorkers()[0];if(!worker)worker=await ctx.waitForEvent('serviceworker');const id=new URL(worker.url()).host;
  const calls:any[]=[];let submitCount=0;
  await ctx.route('https://clearfeed-example.supabase.co/**',async route=>{
   const req=route.request();const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,GET,OPTIONS','content-type':'application/json'};
   if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
   const body=req.postDataJSON();calls.push({url:req.url(),body});
   if(req.url().includes('/auth/v1/otp')){await route.fulfill({headers,json:{}});return;}
   if(req.url().includes('/auth/v1/verify')){
    const jwt=[{alg:'HS256'}, {sub:'00000000-0000-4000-8000-000000000001',exp:Math.floor(Date.now()/1000)+3600},'test'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
    await route.fulfill({headers,json:{access_token:jwt,token_type:'bearer',expires_in:3600,refresh_token:'test-refresh',user:{id:'00000000-0000-4000-8000-000000000001',email:'tester@example.com',aud:'authenticated'}}});return;
   }
   if(body?.action==='quota'){await route.fulfill({headers,json:{remaining:20}});return;}
   if(body?.action==='submit'){submitCount++;await route.fulfill({headers,json:{status:'pending'}});return;}
   if(body?.action==='status'){await route.fulfill({headers,json:{status:'complete',result:{label:'Uncertain / mixed authorship',model:'test-model'}}});return;}
   await route.fulfill({status:404,headers,json:{error:'Unexpected test request'}});
  });
  const page=await ctx.newPage();await page.goto(`chrome-extension://${id}/options.html#check`);
  await page.getByLabel('Email',{exact:true}).fill('tester@example.com');await page.getByRole('button',{name:'Send code'}).click();await page.getByLabel('Email code').fill('123456');await page.getByRole('button',{name:'Verify code'}).click();await expect(page.getByText('20 credits left')).toBeVisible();
  await page.getByLabel('Text to analyse').fill('example '.repeat(500));await expect(page.getByRole('button',{name:'Analyse passage'})).toBeDisabled();expect(submitCount).toBe(0);
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Analyse passage'}).click();await expect(page.getByRole('heading',{name:'Uncertain / mixed authorship'})).toBeVisible();expect(submitCount).toBe(1);
  const submit=calls.find(c=>c.body?.action==='submit');expect(submit.body.text.trim().split(/\s+/)).toHaveLength(500);expect(submit.body).not.toHaveProperty('url');expect(submit.body).not.toHaveProperty('apiKey');
 }finally{await ctx.close();}
});
