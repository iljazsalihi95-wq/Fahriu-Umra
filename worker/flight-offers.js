/**
 * Fahriu Travel — private flight offers API (Cloudflare Worker).
 * Secrets: ADMIN_API_TOKEN (random long value), ALLOWED_ORIGIN (site origin).
 * KV binding: FLIGHT_OFFERS.
 * Never expose ADMIN_API_TOKEN in client HTML or public repositories.
 * Browser admin authentication must later use a server-issued session.
 */
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});
const validText=(v,max=500)=>typeof v==="string"&&v.length<=max;
const fields=["airline","price","from","to","out","back","stops","bag","link","note"];
function validateOffer(o){
  if(!o||typeof o!=="object"||Array.isArray(o))return "Invalid offer";
  for(const f of fields)if(o[f]!==undefined&&!validText(o[f],f==="note"?3000:500))return "Invalid field: "+f;
  if(!o.airline?.trim()||!o.from?.trim()||!o.to?.trim())return "Airline, origin and destination required";
  if(o.link){try{const u=new URL(o.link);if(!["https:","http:"].includes(u.protocol))return "Invalid offer URL";}catch{return "Invalid offer URL";}}
  return null;
}
export default {
 async fetch(request,env){
  const origin=request.headers.get("Origin");
  const allowed=env.ALLOWED_ORIGIN;
  const cors=origin&&allowed&&origin===allowed?{"access-control-allow-origin":origin,"vary":"Origin","access-control-allow-headers":"authorization,content-type","access-control-allow-methods":"GET,POST,PUT,DELETE,OPTIONS"}:{};
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  const reply=(body,status=200)=>json(body,status,cors);
  if(new URL(request.url).pathname!=="/api/admin/flight-offers")return reply({error:"Not found"},404);
  if(!env.FLIGHT_OFFERS||!env.ADMIN_API_TOKEN)return reply({error:"Server not configured"},503);
  if(!origin||origin!==allowed)return reply({error:"Origin not allowed"},403);
  const auth=request.headers.get("Authorization")||"";
  if(auth!==`Bearer ${env.ADMIN_API_TOKEN}`)return reply({error:"Unauthorized"},401);
  const key="offers:v1";
  let offers=await env.FLIGHT_OFFERS.get(key,"json")||[];
  if(!Array.isArray(offers))return reply({error:"Invalid stored data"},500);
  if(request.method==="GET")return reply({offers});
  if(!["POST","PUT","DELETE"].includes(request.method))return reply({error:"Method not allowed"},405);
  if(Number(request.headers.get("content-length")||0)>20000)return reply({error:"Payload too large"},413);
  let payload;try{payload=await request.json()}catch{return reply({error:"Invalid JSON"},400)}
  if(request.method==="POST"){
   if(offers.length>=500)return reply({error:"Offer limit reached"},409);
   const error=validateOffer(payload);if(error)return reply({error},400);
   const offer={id:crypto.randomUUID(),...Object.fromEntries(fields.map(f=>[f,payload[f]||""])),createdAt:new Date().toISOString()};
   offers.unshift(offer);
   await env.FLIGHT_OFFERS.put(key,JSON.stringify(offers));
   return reply({offer},201);
  }
  if(!payload||typeof payload.id!=="string")return reply({error:"Offer ID required"},400);
  const i=offers.findIndex(o=>o.id===payload.id);
  if(i<0)return reply({error:"Offer not found"},404);
  if(request.method==="DELETE"){
   offers.splice(i,1);await env.FLIGHT_OFFERS.put(key,JSON.stringify(offers));return reply({ok:true});
  }
  const error=validateOffer(payload);if(error)return reply({error},400);
  offers[i]={...offers[i],...Object.fromEntries(fields.map(f=>[f,payload[f]||""])),updatedAt:new Date().toISOString()};
  await env.FLIGHT_OFFERS.put(key,JSON.stringify(offers));
  return reply({offer:offers[i]});
 }
};
