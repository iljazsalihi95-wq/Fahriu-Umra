const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});
const allowedOrigin=(request,env)=>{const origin=request.headers.get("Origin");const allowed=(env.ALLOWED_ORIGINS||"").split(",").map(s=>s.trim()).filter(Boolean);return origin&&allowed.includes(origin)?origin:null};
export default {async fetch(request,env){
const url=new URL(request.url);
const origin=allowedOrigin(request,env);
const cors={"Vary":"Origin",...(origin?{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"POST,OPTIONS"}:{})};
if(request.method==="OPTIONS")return new Response(null,{status:origin?204:403,headers:cors});
if(url.pathname==="/health"&&request.method==="GET")return json({ok:true,service:"fahriu-umra-api",version:"0.1.0"},200,cors);
if(url.pathname!=="/api/ai/chat")return json({error:"Not found"},404,cors);
if(request.method!=="POST")return json({error:"Method not allowed"},405,cors);
if(!origin)return json({error:"Origin not allowed"},403,cors);
if(!env.OPENAI_API_KEY)return json({error:"AI service not configured"},503,cors);
if(!env.RATE_LIMITER)return json({error:"Rate limiter not configured"},503,cors);
const ip=request.headers.get("CF-Connecting-IP")||"unknown";
const limit=await env.RATE_LIMITER.limit({key:ip});if(!limit.success)return json({error:"Too many requests"},429,cors);
let body;try{body=await request.json()}catch{return json({error:"Invalid JSON"},400,cors)}
const message=typeof body.message==="string"?body.message.trim():"";
const language=["sq","de","en"].includes(body.language)?body.language:"sq";
if(!message||message.length>1500)return json({error:"Message must contain 1–1500 characters"},400,cors);
const instructions="You are the Fahriu Umra travel assistant. Answer in the requested language. Give accurate general Umrah guidance; do not invent itineraries, prices, group locations, bookings, official religious rulings, or private group details. Distinguish general information from confirmed organizer information. For uncertain religious details, say that scholarly opinions differ and refer users to their group guide. Never claim to access live GPS, user records or chat messages. Keep answers concise. Language: "+language;
try{
const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-4.1-mini",instructions,input:message,max_output_tokens:500,store:false})});
if(!response.ok)return json({error:"AI provider unavailable"},502,cors);
const data=await response.json();
const answer=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n");
return json({answer:answer||"No response available",language},200,cors);
}catch{return json({error:"AI service unavailable"},502,cors)}
}};