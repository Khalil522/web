require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { nanoid } = require('nanoid');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', 1);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadAvatar = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5*1024*1024 }, fileFilter: (req,file,cb)=>{ if(!file.mimetype.startsWith('image/')) return cb(new Error('Images only')); cb(null,true); } });
const uploadBackground = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8*1024*1024 }, fileFilter: (req,file,cb)=>{ if(!file.mimetype.startsWith('image/')) return cb(new Error('Images only')); cb(null,true); } });
const uploadMedia = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50*1024*1024 } });
const uploadImage = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15*1024*1024 }, fileFilter: (req,file,cb)=>{ if(!file.mimetype.startsWith('image/')) return cb(new Error('Images only')); cb(null,true); } });

const generateToken = () => crypto.randomBytes(32).toString('hex');
const now = () => new Date().toISOString();
const san = (v,m) => { if(typeof v!=='string') return ''; return v.trim().slice(0,m||5000); };
const norm = (u) => ({ ...u, is_admin:Boolean(u.is_admin), is_owner:Boolean(u.is_owner), banned_until:u.banned_until||'', theme_accent:u.theme_accent||'#7dd3fc', theme_surface:u.theme_surface||'#14181f', theme_bg:u.theme_bg||'#0b0f14', glass_opacity:Number.isFinite(Number(u.glass_opacity))?Number(u.glass_opacity):0.16, card_radius:Number.isFinite(Number(u.card_radius))?Number(u.card_radius):18, pfp_radius:Number.isFinite(Number(u.pfp_radius))?Number(u.pfp_radius):50, profile_bg_url:u.profile_bg_url||'' });
const safe = (u) => { const n=norm(u); const {password_hash,...s}=n; return s; };
const banned = (u) => { if(!u||!u.banned_until) return false; if(u.banned_until==='forever') return true; return new Date(u.banned_until)>new Date(); };
const isAdmin = (u) => Boolean(u&&(u.is_owner||u.is_admin));

const toStorage = async (buf,name,folder) => {
  const f = (folder||'media')+'/'+name;
  const {error} = await supabase.storage.from('media').upload(f,buf,{upsert:true});
  if(error) throw new Error(error.message);
  const {data} = supabase.storage.from('media').getPublicUrl(f);
  return data.publicUrl;
};

const auth = async (req,res,next) => {
  const tok = req.headers['x-auth-token']||(req.headers['authorization']||'').replace('Bearer ','');
  if(!tok) return res.status(401).json({error:'Unauthorized'});
  const {data:ses} = await supabase.from('auth_tokens').select('*,users(*)').eq('token',tok).gt('expires_at',new Date().toISOString()).single();
  if(!ses||!ses.users) return res.status(401).json({error:'Unauthorized'});
  if(banned(ses.users)) return res.status(403).json({error:'Banned'});
  req.user = safe(ses.users);
  next();
};
const ownerOnly = (req,res,next) => { if(!req.user||!req.user.is_owner) return res.status(403).json({error:'Owner only'}); next(); };
const adminOnly = (req,res,next) => { if(!isAdmin(req.user)) return res.status(403).json({error:'Admin only'}); next(); };

app.get('/api/health',(req,res)=>res.json({ok:true}));

app.get('/api/auth/me',async(req,res)=>{
  const tok=req.headers['x-auth-token']||(req.headers['authorization']||'').replace('Bearer ','');
  if(!tok) return res.json({user:null});
  const {data:ses}=await supabase.from('auth_tokens').select('*,users(*)').eq('token',tok).gt('expires_at',new Date().toISOString()).single();
  if(!ses||!ses.users) return res.json({user:null});
  if(banned(ses.users)) return res.status(403).json({user:null,error:'Banned'});
  res.json({user:safe(ses.users)});
});

app.post('/api/auth/register',async(req,res)=>{
  const email=san(req.body.email,200).toLowerCase();
  const password=String(req.body.password||'');
  const displayName=san(req.body.displayName,80);
  const remember=Boolean(req.body.remember);
  if(!email||!email.includes('@')) return res.status(400).json({error:'Valid email required.'});
  if(password.length<6) return res.status(400).json({error:'Password must be at least 6 characters.'});
  if(!displayName) return res.status(400).json({error:'Display name is required.'});
  const {data:ex}=await supabase.from('users').select('id').eq('email',email).single();
  if(ex) return res.status(409).json({error:'Email already in use.'});
  const {count}=await supabase.from('users').select('*',{count:'exact',head:true});
  const ownerEmail=(process.env.OWNER_EMAIL||'').toLowerCase().trim();
  const isOwner=ownerEmail?email===ownerEmail:count===0;
  const hash=bcrypt.hashSync(password,10);
  const {data:user,error}=await supabase.from('users').insert({email,password_hash:hash,display_name:displayName,is_owner:isOwner,is_admin:isOwner,created_at:now()}).select().single();
  if(error) return res.status(500).json({error:error.message});
  const tok=generateToken();
  const exp=new Date(Date.now()+(remember?30:1)*24*60*60*1000).toISOString();
  await supabase.from('auth_tokens').insert({token:tok,user_id:user.id,expires_at:exp});
  res.json({user:safe(user),token:tok});
});

app.post('/api/auth/login',async(req,res)=>{
  const email=san(req.body.email,200).toLowerCase();
  const password=String(req.body.password||'');
  const remember=Boolean(req.body.remember);
  const {data:user}=await supabase.from('users').select('*').eq('email',email).single();
  if(!user) return res.status(401).json({error:'Invalid email or password.'});
  if(banned(user)) return res.status(403).json({error:'Banned'});
  if(!bcrypt.compareSync(password,user.password_hash)) return res.status(401).json({error:'Invalid email or password.'});
  const tok=generateToken();
  const exp=new Date(Date.now()+(remember?30:1)*24*60*60*1000).toISOString();
  await supabase.from('auth_tokens').insert({token:tok,user_id:user.id,expires_at:exp});
  res.json({user:safe(user),token:tok});
});

app.post('/api/auth/logout',async(req,res)=>{
  const tok=req.headers['x-auth-token'];
  if(tok) await supabase.from('auth_tokens').delete().eq('token',tok);
  res.json({ok:true});
});

app.get('/api/settings',async(req,res)=>{
  const {data}=await supabase.from('settings').select('*').eq('id',1).single();
  res.json({settings:data||{}});
});

app.patch('/api/settings',auth,ownerOnly,async(req,res)=>{
  const u={};
  for(const k of ['hero_title','hero_subtitle','about_text']){if(k in req.body)u[k]=san(req.body[k],2000);}
  await supabase.from('settings').update(u).eq('id',1);
  res.json({ok:true});
});

app.get('/api/users',auth,async(req,res)=>{
  const {data:users}=await supabase.from('users').select('*').order('is_owner',{ascending:false});
  res.json({users:(users||[]).map(safe)});
});

app.get('/api/admin/users',auth,adminOnly,async(req,res)=>{
  const {data:users}=await supabase.from('users').select('*').order('is_owner',{ascending:false});
  res.json({users:(users||[]).map(safe)});
});

app.patch('/api/users/me',auth,async(req,res)=>{
  const u={};
  if(req.body.displayName) u.display_name=san(req.body.displayName,80);
  if(req.body.bio!==undefined) u.bio=san(req.body.bio,500);
  if(req.body.accentColor) u.accent_color=san(req.body.accentColor,20);
  if(req.body.language) u.language=san(req.body.language,5);
  if(req.body.themeAccent) u.theme_accent=san(req.body.themeAccent,20);
  if(req.body.themeSurface) u.theme_surface=san(req.body.themeSurface,20);
  if(req.body.themeBg) u.theme_bg=san(req.body.themeBg,20);
  const go=Number(req.body.glassOpacity); if(Number.isFinite(go)) u.glass_opacity=Math.min(0.3,Math.max(0.08,go));
  const cr=Number(req.body.cardRadius); if(Number.isFinite(cr)) u.card_radius=Math.min(32,Math.max(10,cr));
  const pr=Number(req.body.pfpRadius); if(Number.isFinite(pr)) u.pfp_radius=Math.min(50,Math.max(0,pr));
  const {data:user,error}=await supabase.from('users').update(u).eq('id',req.user.id).select().single();
  if(error) return res.status(500).json({error:error.message});
  res.json({user:safe(user)});
});

app.post('/api/users/me/avatar',auth,uploadAvatar.single('avatar'),async(req,res)=>{
  if(!req.file) return res.status(400).json({error:'No file uploaded.'});
  const name='avatar-'+Date.now()+'-'+nanoid(10)+path.extname(req.file.originalname);
  const url=await toStorage(req.file.buffer,name,'avatars');
  const {data:user}=await supabase.from('users').update({avatar_url:url}).eq('id',req.user.id).select().single();
  res.json({user:safe(user)});
});

app.post('/api/users/me/background',auth,uploadBackground.single('background'),async(req,res)=>{
  if(!req.file) return res.status(400).json({error:'No file uploaded.'});
  const name='bg-'+Date.now()+'-'+nanoid(10)+path.extname(req.file.originalname);
  const url=await toStorage(req.file.buffer,name,'backgrounds');
  const {data:user}=await supabase.from('users').update({profile_bg_url:url}).eq('id',req.user.id).select().single();
  res.json({user:safe(user)});
});

app.post('/api/admin/users/:id/admin',auth,adminOnly,async(req,res)=>{
  const id=Number(req.params.id);
  const {data:t}=await supabase.from('users').select('*').eq('id',id).single();
  if(!t) return res.status(404).json({error:'User not found.'});
  if(t.is_owner) return res.status(403).json({error:'Cannot change owner role.'});
  await supabase.from('users').update({is_admin:Boolean(req.body.is_admin)}).eq('id',id);
  res.json({ok:true});
});

app.post('/api/admin/users/:id/ban',auth,adminOnly,async(req,res)=>{
  const id=Number(req.params.id);
  const dur=String(req.body.duration||'');
  const {data:t}=await supabase.from('users').select('*').eq('id',id).single();
  if(!t) return res.status(404).json({error:'User not found.'});
  if(t.is_owner) return res.status(403).json({error:'Cannot ban the owner.'});
  if(id===req.user.id) return res.status(403).json({error:'Cannot ban yourself.'});
  let bu;
  if(dur==='forever'){bu='forever';}else{const d=Number(dur);if(!Number.isFinite(d)||d<=0) return res.status(400).json({error:'Invalid duration.'});bu=new Date(Date.now()+d*86400000).toISOString();}
  await supabase.from('users').update({banned_until:bu}).eq('id',id);
  res.json({ok:true,banned_until:bu});
});

app.post('/api/admin/users/:id/unban',auth,adminOnly,async(req,res)=>{
  await supabase.from('users').update({banned_until:''}).eq('id',Number(req.params.id));
  res.json({ok:true});
});

app.delete('/api/admin/users/:id',auth,adminOnly,async(req,res)=>{
  const id=Number(req.params.id);
  const {data:t}=await supabase.from('users').select('*').eq('id',id).single();
  if(!t) return res.status(404).json({error:'User not found.'});
  if(t.is_owner) return res.status(403).json({error:'Cannot delete the owner.'});
  if(id===req.user.id) return res.status(403).json({error:'Cannot delete yourself.'});
  await supabase.from('users').delete().eq('id',id);
  res.json({ok:true});
});

app.get('/api/products',async(req,res)=>{
  const {data:products}=await supabase.from('products').select('*').order('id',{ascending:false});
  res.json({products:products||[]});
});

app.post('/api/products',auth,ownerOnly,uploadImage.single('image'),async(req,res)=>{
  const title=san(req.body.title,120);
  if(!title) return res.status(400).json({error:'Title is required.'});
  let image_url='';
  if(req.file){const n='product-'+Date.now()+'-'+nanoid(10)+path.extname(req.file.originalname);image_url=await toStorage(req.file.buffer,n,'products');}
  const {data:product}=await supabase.from('products').insert({title,description:san(req.body.description,1000),price:san(req.body.price,40),link:san(req.body.link,300),image_url,created_at:now(),updated_at:now()}).select().single();
  res.json({product});
});

app.patch('/api/products/:id',auth,ownerOnly,uploadImage.single('image'),async(req,res)=>{
  const id=Number(req.params.id);
  const u={updated_at:now()};
  if(req.body.title) u.title=san(req.body.title,120);
  if(req.body.description) u.description=san(req.body.description,1000);
  if(req.body.price) u.price=san(req.body.price,40);
  if(req.body.link) u.link=san(req.body.link,300);
  if(req.file){const n='product-'+Date.now()+'-'+nanoid(10)+path.extname(req.file.originalname);u.image_url=await toStorage(req.file.buffer,n,'products');}
  const {data:product}=await supabase.from('products').update(u).eq('id',id).select().single();
  res.json({product});
});

app.delete('/api/products/:id',auth,ownerOnly,async(req,res)=>{
  await supabase.from('products').delete().eq('id',Number(req.params.id));
  res.json({ok:true});
});

app.get('/api/posts',auth,async(req,res)=>{
  const {data:posts}=await supabase.from('posts').select('*,users(id,display_name,avatar_url,accent_color,is_owner,is_admin)').order('id',{ascending:false}).limit(100);
  const pids=(posts||[]).map(p=>p.id);
  const {data:allC}=pids.length?await supabase.from('comments').select('*,users(id,display_name,avatar_url,is_owner,is_admin)').in('post_id',pids):{data:[]};
  const cm={};
  (allC||[]).forEach(c=>{if(!cm[c.post_id])cm[c.post_id]=[];cm[c.post_id].push({id:c.id,user_id:c.user_id,text:c.text,created_at:c.created_at,display_name:(c.users&&c.users.display_name)||'Unknown',avatar_url:(c.users&&c.users.avatar_url)||'',is_admin:(c.users&&c.users.is_admin)||false,is_owner:(c.users&&c.users.is_owner)||false});});
  const result=(posts||[]).map(p=>{const lk=Array.isArray(p.likes)?p.likes:[];return{id:p.id,user_id:p.user_id,content:p.content,media_url:p.media_url,media_type:p.media_type,created_at:p.created_at,display_name:(p.users&&p.users.display_name)||'Unknown',avatar_url:(p.users&&p.users.avatar_url)||'',accent_color:(p.users&&p.users.accent_color)||'#63d4ff',is_owner:(p.users&&p.users.is_owner)||false,is_admin:(p.users&&p.users.is_admin)||false,likes_count:lk.length,liked_by_me:lk.includes(req.user.id),comments:cm[p.id]||[],likes:lk};});
  res.json({posts:result});
});

app.post('/api/posts',auth,adminOnly,uploadMedia.single('media'),async(req,res)=>{
  const content=san(req.body.content,2000);
  let media_url='',media_type='';
  if(req.file){const n='post-'+Date.now()+'-'+nanoid(10)+path.extname(req.file.originalname);media_url=await toStorage(req.file.buffer,n,'posts');media_type=req.file.mimetype;}
  const {data:post}=await supabase.from('posts').insert({user_id:req.user.id,content,media_url,media_type,likes:[],created_at:now()}).select().single();
  const {data:user}=await supabase.from('users').select('*').eq('id',req.user.id).single();
  res.json({post:{id:post.id,user_id:post.user_id,content:post.content,media_url:post.media_url,media_type:post.media_type,created_at:post.created_at,display_name:(user&&user.display_name)||'Unknown',avatar_url:(user&&user.avatar_url)||'',accent_color:(user&&user.accent_color)||'#63d4ff',is_owner:(user&&user.is_owner)||false,likes_count:0,liked_by_me:false,comments:[]}});
});

app.delete('/api/posts/:id',auth,async(req,res)=>{
  const id=Number(req.params.id);
  const {data:post}=await supabase.from('posts').select('*').eq('id',id).single();
  if(!post) return res.status(404).json({error:'Not found'});
  if(post.user_id!==req.user.id&&!req.user.is_owner) return res.status(403).json({error:'Not allowed'});
  await supabase.from('posts').delete().eq('id',id);
  res.json({ok:true});
});

app.post('/api/posts/:id/like',auth,async(req,res)=>{
  const id=Number(req.params.id);
  const {data:post}=await supabase.from('posts').select('likes').eq('id',id).single();
  if(!post) return res.status(404).json({error:'Not found'});
  let lk=Array.isArray(post.likes)?post.likes:[];
  const i=lk.indexOf(req.user.id);
  if(i>=0)lk.splice(i,1);else lk.push(req.user.id);
  await supabase.from('posts').update({likes:lk}).eq('id',id);
  res.json({likes_count:lk.length,liked_by_me:lk.includes(req.user.id)});
});

app.post('/api/posts/:id/comments',auth,async(req,res)=>{
  const id=Number(req.params.id);
  const text=san(req.body.text,500);
  if(!text) return res.status(400).json({error:'Comment is empty.'});
  const {data:comment}=await supabase.from('comments').insert({post_id:id,user_id:req.user.id,text,created_at:now()}).select().single();
  const {data:au}=await supabase.from('users').select('*').eq('id',req.user.id).single();
  res.json({comment:{id:comment.id,user_id:comment.user_id,text:comment.text,created_at:comment.created_at,display_name:(au&&au.display_name)||'Unknown',avatar_url:(au&&au.avatar_url)||'',is_admin:(au&&au.is_admin)||false,is_owner:(au&&au.is_owner)||false}});
});

app.get('/api/conversations',auth,async(req,res)=>{
  const {data:mb}=await supabase.from('conversation_members').select('*').eq('user_id',req.user.id);
  const cids=(mb||[]).map(m=>m.conversation_id);
  if(!cids.length) return res.json({conversations:[]});
  const {data:convos}=await supabase.from('conversations').select('*').in('id',cids);
  const {data:allMb}=await supabase.from('conversation_members').select('*').in('conversation_id',cids);
  const muids=[...new Set((allMb||[]).map(m=>m.user_id))];
  const {data:mu}=muids.length?await supabase.from('users').select('id,display_name,avatar_url,accent_color,is_owner,is_admin').in('id',muids):{data:[]};
  const um={};(mu||[]).forEach(u=>um[u.id]=u);
  const {data:allMsg}=await supabase.from('messages').select('*').in('conversation_id',cids).order('id',{ascending:true});
  const result=(convos||[]).map(convo=>{
    const mbs=(allMb||[]).filter(m=>m.conversation_id===convo.id);
    const sm=mbs.find(m=>m.user_id===req.user.id);
    const om=mbs.filter(m=>m.user_id!==req.user.id);
    const ou=om.map(m=>um[m.user_id]).filter(Boolean);
    const o=ou[0];
    const ig=Boolean(convo.is_group)||ou.length>1;
    const msgs=(allMsg||[]).filter(m=>m.conversation_id===convo.id);
    const last=msgs[msgs.length-1];
    const ls=last?um[last.sender_id]:null;
    const omb=om[0];
    const unr=msgs.filter(m=>{if(m.sender_id===req.user.id)return false;if(!sm||!sm.last_seen_at)return true;return m.created_at>sm.last_seen_at;}).length;
    const seen=!ig&&last&&last.sender_id===req.user.id&&omb&&omb.last_seen_at&&omb.last_seen_at>=last.created_at;
    const dn=ig?(convo.name||ou.map(u=>u.display_name).slice(0,3).join(', ')||'Group chat'):((o&&o.display_name)||'Unknown');
    return{id:convo.id,is_group:ig,group_name:convo.name||'',member_count:mbs.length,member_avatars:ou.map(u=>u.avatar_url).filter(Boolean).slice(0,3),member_names:ou.map(u=>u.display_name).filter(Boolean).slice(0,3),other_id:ig?0:((o&&o.id)||0),display_name:dn,avatar_url:ig?'':((o&&o.avatar_url)||''),accent_color:ig?'#63d4ff':((o&&o.accent_color)||'#63d4ff'),is_admin:ig?false:((o&&o.is_admin)||false),is_owner:ig?false:((o&&o.is_owner)||false),other_last_seen_at:ig?'':((omb&&omb.last_seen_at)||''),self_last_seen_at:(sm&&sm.last_seen_at)||'',last_body:(last&&last.body)||'',last_media_url:(last&&last.media_url)||'',last_media_type:(last&&last.media_type)||'',last_created_at:(last&&last.created_at)||'',last_sender_id:(last&&last.sender_id)||0,last_sender_name:(ls&&ls.display_name)||'',unread_count:unr,seen:Boolean(seen)};
  });
  result.sort((a,b)=>{if(!a.last_created_at&&b.last_created_at)return 1;if(a.last_created_at&&!b.last_created_at)return -1;if(!a.last_created_at&&!b.last_created_at)return 0;return new Date(b.last_created_at)-new Date(a.last_created_at);});
  res.json({conversations:result});
});

app.post('/api/conversations',auth,async(req,res)=>{
  const oid=Number(req.body.userId);
  if(!oid||oid===req.user.id) return res.status(400).json({error:'Invalid user.'});
  const {data:ou}=await supabase.from('users').select('id').eq('id',oid).single();
  if(!ou) return res.status(404).json({error:'User not found.'});
  const {data:mym}=await supabase.from('conversation_members').select('conversation_id').eq('user_id',req.user.id);
  const mids=(mym||[]).map(m=>m.conversation_id);
  const {data:sh}=mids.length?await supabase.from('conversation_members').select('conversation_id').eq('user_id',oid).in('conversation_id',mids):{data:[]};
  for(const m of(sh||[])){const {data:c}=await supabase.from('conversations').select('*').eq('id',m.conversation_id).single();if(c&&!c.is_group)return res.json({conversationId:c.id});}
  const {data:c}=await supabase.from('conversations').insert({is_group:false,name:'',created_by:req.user.id,created_at:now()}).select().single();
  await supabase.from('conversation_members').insert([{conversation_id:c.id,user_id:req.user.id},{conversation_id:c.id,user_id:oid}]);
  res.json({conversationId:c.id});
});

app.post('/api/conversations/group',auth,async(req,res)=>{
  const name=san(req.body.name,80);
  const ids=(Array.isArray(req.body.userIds)?req.body.userIds:[]).map(Number).filter(Number.isFinite);
  const unique=[...new Set([req.user.id,...ids])];
  if(unique.length<3) return res.status(400).json({error:'Select at least 2 other users.'});
  const {data:c}=await supabase.from('conversations').insert({is_group:true,name,created_by:req.user.id,created_at:now()}).select().single();
  await supabase.from('conversation_members').insert(unique.map(uid=>({conversation_id:c.id,user_id:uid})));
  res.json({conversationId:c.id});
});

app.get('/api/conversations/:id/messages',auth,async(req,res)=>{
  const cid=Number(req.params.id);
  const {data:mb}=await supabase.from('conversation_members').select('*').eq('conversation_id',cid).eq('user_id',req.user.id).single();
  if(!mb) return res.status(404).json({error:'Not found'});
  const {data:c}=await supabase.from('conversations').select('*').eq('id',cid).single();
  const ig=Boolean(c&&c.is_group);
  const {data:mbs}=await supabase.from('conversation_members').select('*').eq('conversation_id',cid);
  const oth=(mbs||[]).find(m=>m.user_id!==req.user.id);
  const {data:msgs}=await supabase.from('messages').select('*').eq('conversation_id',cid).order('id',{ascending:true});
  const sids=[...new Set((msgs||[]).map(m=>m.sender_id))];
  const {data:su}=sids.length?await supabase.from('users').select('id,display_name,avatar_url,accent_color,is_owner,is_admin').in('id',sids):{data:[]};
  const sm={};(su||[]).forEach(u=>sm[u.id]=u);
  const messages=(msgs||[]).map(m=>{const u=sm[m.sender_id];return{id:m.id,conversation_id:m.conversation_id,sender_id:m.sender_id,body:m.body,media_url:m.media_url,media_type:m.media_type,created_at:m.created_at,display_name:(u&&u.display_name)||'Unknown',avatar_url:(u&&u.avatar_url)||'',accent_color:(u&&u.accent_color)||'#63d4ff',is_admin:(u&&u.is_admin)||false,is_owner:(u&&u.is_owner)||false};});
  res.json({messages,otherLastSeenAt:ig?'':((oth&&oth.last_seen_at)||''),isGroup:ig,memberCount:(mbs||[]).length});
});

app.post('/api/conversations/:id/messages',auth,uploadMedia.single('media'),async(req,res)=>{
  const cid=Number(req.params.id);
  const {data:mb}=await supabase.from('conversation_members').select('*').eq('conversation_id',cid).eq('user_id',req.user.id).single();
  if(!mb) return res.status(404).json({error:'Not found'});
  const body=san(req.body.text,5000);
  let media_url='',media_type='';
  if(req.file){const n='msg-'+Date.now()+'-'+nanoid(10)+path.extname(req.file.originalname);media_url=await toStorage(req.file.buffer,n,'messages');media_type=req.file.mimetype;}
  if(!body&&!media_url) return res.status(400).json({error:'Message is empty.'});
  const {data:msg}=await supabase.from('messages').insert({conversation_id:cid,sender_id:req.user.id,body,media_url,media_type,created_at:now()}).select().single();
  const {data:user}=await supabase.from('users').select('*').eq('id',req.user.id).single();
  res.json({message:{id:msg.id,conversation_id:msg.conversation_id,sender_id:msg.sender_id,body:msg.body,media_url:msg.media_url,media_type:msg.media_type,created_at:msg.created_at,display_name:(user&&user.display_name)||'Unknown',avatar_url:(user&&user.avatar_url)||'',accent_color:(user&&user.accent_color)||'#63d4ff',is_admin:(user&&user.is_admin)||false,is_owner:(user&&user.is_owner)||false}});
});

app.post('/api/conversations/:id/seen',auth,async(req,res)=>{
  const cid=Number(req.params.id);
  await supabase.from('conversation_members').update({last_seen_at:now()}).eq('conversation_id',cid).eq('user_id',req.user.id);
  res.json({ok:true});
});

app.use((err,req,res,next)=>{if(!err)return next();res.status(400).json({error:err.message||'Error'});});

module.exports = app;