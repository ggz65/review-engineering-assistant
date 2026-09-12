import { getSupabaseServerClient } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request){
  const supabase=getSupabaseServerClient();
  if(!supabase)return Response.json({error:"Branding is not configured."},{status:503});
  const {searchParams}=new URL(request.url),slug=searchParams.get("slug"),campaignSlug=searchParams.get("campaign");
  if(!slug)return Response.json({error:"Missing profile."},{status:400});
  const{data:profile,error}=await supabase.from("profiles").select("user_id,slug,full_name,company_name,title,email,phone,nmls,website,welcome_message,brand_color,headshot_url,logo_url").eq("slug",slug).eq("published",true).maybeSingle();
  if(error||!profile)return Response.json({error:"Profile not found."},{status:404});
  let campaign=null;
  if(campaignSlug){const{data}=await supabase.from("campaigns").select("id,label,slug").eq("profile_id",profile.user_id).eq("slug",campaignSlug).eq("active",true).maybeSingle();campaign=data||null}
  return Response.json({profile,campaign},{headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=300"}});
}
