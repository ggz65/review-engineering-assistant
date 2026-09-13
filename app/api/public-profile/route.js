import { getSupabaseServerClient } from "../../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = (body,init={}) => Response.json(body,{...init,headers:{...init.headers,"Cache-Control":"no-store, max-age=0"}});

export async function GET(request){
  const supabase=getSupabaseServerClient();
  if(!supabase)return noStore({error:"Branding is not configured."},{status:503});
  const {searchParams}=new URL(request.url),slug=searchParams.get("slug"),campaignSlug=searchParams.get("campaign");
  if(!slug)return noStore({error:"Missing profile."},{status:400});
  const{data:profile,error}=await supabase.from("profiles").select("user_id,slug,full_name,company_name,title,email,phone,nmls,website,brand_color,headshot_url,logo_url").eq("slug",slug).eq("published",true).maybeSingle();
  if(error||!profile)return noStore({error:"Profile not found."},{status:404});
  let campaign=null;
  if(campaignSlug){const{data}=await supabase.from("campaigns").select("id,label,slug").eq("profile_id",profile.user_id).eq("slug",campaignSlug).eq("active",true).maybeSingle();campaign=data||null}
  return noStore({profile,campaign});
}
