import { getSupabaseServerClient } from "../../../lib/supabase";

const ALLOWED=new Set(["page_view","interview_started","interview_completed","generation_completed","copy_email","copy_prompts","copy_text","open_email","open_text"]);

export async function POST(request){
  try{
    const supabase=getSupabaseServerClient();if(!supabase)return new Response(null,{status:204});
    const body=await request.json();if(!ALLOWED.has(body.eventType)||typeof body.profileId!=="string"||typeof body.sessionId!=="string")return Response.json({error:"Invalid event."},{status:400});
    const payload={profile_id:body.profileId,campaign_id:typeof body.campaignId==="string"?body.campaignId:null,session_id:body.sessionId.slice(0,80),event_type:body.eventType,metadata:{path:typeof body.path==="string"?body.path.slice(0,200):"",device:/mobile/i.test(body.device||"")?"mobile":"desktop"}};
    const{error}=await supabase.from("analytics_events").insert(payload);if(error)console.error("Analytics insert failed",error.code);
    return new Response(null,{status:204});
  }catch{return new Response(null,{status:204})}
}
