// Adds the PluginSaveData record type (capacitor-icloud-sync) to the development schema of
// iCloud.com.accessible.backrooms. Run by .github/workflows/cloudkit-schema.yml.
// Production is then one click in CloudKit Console: Deploy Schema Changes.
import dbpkg from "@apple/cktool.database";
import nodepkg from "@apple/cktool.target.nodejs";
const { PromisesApi, CKEnvironment } = dbpkg; const { createConfiguration } = nodepkg;
import { readFileSync } from "node:fs";
const token=process.env.CK_MANAGEMENT_TOKEN; if(!token){console.log('no token');process.exit(1);}
const teamId="ZPD555RW3A", containerId="iCloud.com.accessible.backrooms", environment=CKEnvironment.DEVELOPMENT;
const api=new PromisesApi({configuration:createConfiguration(),security:{ManagementTokenAuth:token}});
const show=e=>JSON.stringify(e?.response??e?.result??e?.message??e,null,1).slice(0,1500);
try{
  const ex=await api.exportSchema({teamId,containerId,environment});
  const cur=(typeof ex.result==='string'?ex.result:(ex.result?.schema??ex.result?.text??JSON.stringify(ex.result)));
  console.log('== current dev schema ==\n'+cur);
  if(/RECORD TYPE PluginSaveData/.test(cur)){console.log('already there');process.exit(0);}
  let base=cur.trim(); if(!/DEFINE\s+SCHEMA/.test(base))base='DEFINE SCHEMA';
  const text=base+'\n\n'+readFileSync(new URL('./schema-addition.ckdb', import.meta.url),'utf8');
  const file=new File([text],'schema.ckdb',{type:'text/plain'});
  const v=await api.validateSchema({teamId,containerId,environment,file});console.log('validate:',show(v.result??v));
  const im=await api.importSchema({teamId,containerId,environment,file:new File([text],'schema.ckdb',{type:'text/plain'})});console.log('import ok',show(im.result??im));
  const after=await api.exportSchema({teamId,containerId,environment});console.log('== after ==\n'+(typeof after.result==='string'?after.result:JSON.stringify(after.result)));
}catch(e){console.log('ERROR',show(e));process.exit(2);}
