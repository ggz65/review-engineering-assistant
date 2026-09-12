"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

const emptyProfile = { slug:"", full_name:"", company_name:"", title:"Loan Officer", email:"", phone:"", nmls:"", website:"", welcome_message:"", brand_color:"#173f5f", headshot_url:"", logo_url:"", published:true };
const metricNames = { page_view:"Visits", interview_started:"Started", interview_completed:"Completed", generation_completed:"Generated", copy_email:"Email copies", copy_prompts:"Prompt copies", copy_text:"Text copies", open_email:"Opened email", open_text:"Opened text" };

function safeSlug(value){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)}

export default function DashboardPage(){
  const router=useRouter();
  const [supabase,setSupabase]=useState(null),[user,setUser]=useState(null),[profile,setProfile]=useState(emptyProfile),[campaigns,setCampaigns]=useState([]),[events,setEvents]=useState([]);
  const [tab,setTab]=useState("overview"),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[campaignLabel,setCampaignLabel]=useState("");

  useEffect(()=>{let active=true;try{const client=getSupabaseBrowserClient();setSupabase(client);client.auth.getSession().then(async({data})=>{if(!active)return;if(!data.session){router.replace("/login");return}setUser(data.session.user);await load(client,data.session.user)});}catch(error){setMessage(error.message)}return()=>{active=false}},[router]);

  async function load(client,currentUser){
    const [{data:p,error:pe},{data:c,error:ce},{data:e,error:ee}]=await Promise.all([
      client.from("profiles").select("*").eq("user_id",currentUser.id).maybeSingle(),
      client.from("campaigns").select("*").order("created_at",{ascending:false}),
      client.from("analytics_events").select("event_type,campaign_id,created_at").gte("created_at",new Date(Date.now()-30*86400000).toISOString())
    ]);
    if(pe||ce||ee) setMessage((pe||ce||ee).message);
    setProfile(p||{...emptyProfile,email:currentUser.email||""});setCampaigns(c||[]);setEvents(e||[]);
  }

  const metrics=useMemo(()=>Object.fromEntries(Object.keys(metricNames).map(key=>[key,events.filter(e=>e.event_type===key).length])),[events]);
  const baseUrl=typeof window!=="undefined"?window.location.origin:"";
  const publicUrl=profile.slug?`${baseUrl}/l/${profile.slug}`:"Complete your profile to create your link";

  async function saveProfile(event){event.preventDefault();setBusy(true);setMessage("");try{const payload={...profile,user_id:user.id,slug:safeSlug(profile.slug||profile.full_name),updated_at:new Date().toISOString()};const{data,error}=await supabase.from("profiles").upsert(payload,{onConflict:"user_id"}).select().single();if(error)throw error;setProfile(data);setMessage("Profile saved.")}catch(error){setMessage(error.message)}finally{setBusy(false)}}
  async function uploadAsset(file,kind){if(!file)return;setBusy(true);try{const ext=file.name.split(".").pop().toLowerCase();const path=`${user.id}/${kind}-${Date.now()}.${ext}`;const{error}=await supabase.storage.from("branding").upload(path,file,{upsert:false});if(error)throw error;const{data}=supabase.storage.from("branding").getPublicUrl(path);setProfile(p=>({...p,[`${kind}_url`]:data.publicUrl}));setMessage(`${kind==="logo"?"Logo":"Headshot"} uploaded. Click Save profile to publish it.`)}catch(error){setMessage(error.message)}finally{setBusy(false)}}
  async function addCampaign(event){event.preventDefault();if(!campaignLabel.trim()||!profile.user_id)return;setBusy(true);try{const slug=safeSlug(campaignLabel);const{data,error}=await supabase.from("campaigns").insert({profile_id:profile.user_id,label:campaignLabel.trim(),slug}).select().single();if(error)throw error;setCampaigns(c=>[data,...c]);setCampaignLabel("");setMessage("Tracking link created.")}catch(error){setMessage(error.message)}finally{setBusy(false)}}
  async function deleteCampaign(id){if(!confirm("Delete this tracking link? Existing visits will remain in your totals."))return;const{error}=await supabase.from("campaigns").delete().eq("id",id);if(error)setMessage(error.message);else setCampaigns(c=>c.filter(x=>x.id!==id))}
  async function copy(value){await navigator.clipboard.writeText(value);setMessage("Link copied.")}
  async function signOut(){await supabase.auth.signOut();router.replace("/login")}

  if(!user)return <main className="admin-shell"><p className="admin-muted">Loading your dashboard…</p></main>;
  return <main className="admin-shell">
    <header className="admin-header"><div className="admin-brand"><img src="/review-engineering-logo.svg" alt="" className="admin-logo"/><div><strong>Review Engineering</strong><span>Loan Officer Dashboard</span></div></div><button className="admin-secondary" onClick={signOut}>Sign out</button></header>
    <nav className="admin-tabs"><button className={tab==="overview"?"active":""} onClick={()=>setTab("overview")}>Overview</button><button className={tab==="profile"?"active":""} onClick={()=>setTab("profile")}>Branding</button><button className={tab==="links"?"active":""} onClick={()=>setTab("links")}>Tracking links</button></nav>
    {message&&<div className="admin-notice">{message}</div>}
    {tab==="overview"&&<section>
      <div className="admin-title"><div><p className="eyebrow">LAST 30 DAYS</p><h1>Your activity</h1></div>{profile.slug&&<button className="admin-primary" onClick={()=>copy(publicUrl)}>Copy public link</button>}</div>
      <div className="metric-grid">{["page_view","interview_started","interview_completed","generation_completed"].map(key=><article className="metric" key={key}><strong>{metrics[key]||0}</strong><span>{metricNames[key]}</span></article>)}</div>
      <section className="admin-card"><h2>Engagement actions</h2><div className="action-metrics">{["copy_email","copy_prompts","copy_text","open_email","open_text"].map(key=><div key={key}><span>{metricNames[key]}</span><strong>{metrics[key]||0}</strong></div>)}</div></section>
      <section className="admin-card"><h2>Your public link</h2><p className="admin-muted">Agents can use this link without creating an account.</p><div className="copy-line"><code>{publicUrl}</code>{profile.slug&&<button onClick={()=>copy(publicUrl)}>Copy</button>}</div></section>
    </section>}
    {tab==="profile"&&<form className="admin-card admin-form profile-form" onSubmit={saveProfile}>
      <div><p className="eyebrow">PHASE ONE</p><h1>Your branding</h1><p className="admin-muted">This information appears above the agent’s interview.</p></div>
      <div className="form-grid">
        <label>Full name<input value={profile.full_name||""} onChange={e=>setProfile({...profile,full_name:e.target.value})} required/></label>
        <label>Public URL name<input value={profile.slug||""} onChange={e=>setProfile({...profile,slug:safeSlug(e.target.value)})} placeholder="geoff-zimpfer" required/></label>
        <label>Company<input value={profile.company_name||""} onChange={e=>setProfile({...profile,company_name:e.target.value})} required/></label>
        <label>Title<input value={profile.title||""} onChange={e=>setProfile({...profile,title:e.target.value})}/></label>
        <label>Email<input type="email" value={profile.email||""} onChange={e=>setProfile({...profile,email:e.target.value})}/></label>
        <label>Phone<input value={profile.phone||""} onChange={e=>setProfile({...profile,phone:e.target.value})}/></label>
        <label>NMLS number<input value={profile.nmls||""} onChange={e=>setProfile({...profile,nmls:e.target.value})} required/></label>
        <label>Website<input type="url" value={profile.website||""} onChange={e=>setProfile({...profile,website:e.target.value})}/></label>
        <label>Brand color<input type="color" value={profile.brand_color||"#173f5f"} onChange={e=>setProfile({...profile,brand_color:e.target.value})}/></label>
        <label className="wide">Welcome message<textarea value={profile.welcome_message||""} onChange={e=>setProfile({...profile,welcome_message:e.target.value})} maxLength="220" placeholder="Helping agents create better client reviews and stronger online visibility."/></label>
        <label>Headshot<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadAsset(e.target.files[0],"headshot")}/>{profile.headshot_url&&<img className="asset-preview portrait" src={profile.headshot_url} alt="Headshot preview"/>}</label>
        <label>Company logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e=>uploadAsset(e.target.files[0],"logo")}/>{profile.logo_url&&<img className="asset-preview" src={profile.logo_url} alt="Logo preview"/>}</label>
      </div>
      <button className="admin-primary" disabled={busy}>{busy?"Saving…":"Save profile"}</button>
    </form>}
    {tab==="links"&&<section>
      <div className="admin-title"><div><p className="eyebrow">PHASE TWO</p><h1>Named tracking links</h1><p className="admin-muted">Create a link for an agent, office, class, or campaign. No agent login required.</p></div></div>
      <form className="admin-card campaign-form" onSubmit={addCampaign}><label>Link label<input value={campaignLabel} onChange={e=>setCampaignLabel(e.target.value)} placeholder="Sarah Johnson or September Workshop"/></label><button className="admin-primary" disabled={busy||!profile.user_id}>Create tracking link</button>{!profile.user_id&&<p className="admin-muted">Save your branding profile first.</p>}</form>
      <div className="campaign-list">{campaigns.map(c=>{const url=`${baseUrl}/l/${profile.slug}/${c.slug}`;const views=events.filter(e=>e.campaign_id===c.id&&e.event_type==="page_view").length;const completed=events.filter(e=>e.campaign_id===c.id&&e.event_type==="generation_completed").length;return <article className="admin-card campaign" key={c.id}><div><strong>{c.label}</strong><span>{views} visits · {completed} completed generations in the last 30 days</span><code>{url}</code></div><div><button onClick={()=>copy(url)}>Copy</button><button className="danger" onClick={()=>deleteCampaign(c.id)}>Delete</button></div></article>})}{!campaigns.length&&<p className="admin-muted">No named links yet.</p>}</div>
    </section>}
  </main>
}
