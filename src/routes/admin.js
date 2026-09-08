const express=require('express');
const bcrypt=require('bcryptjs');
const slugify=require('slugify');
const fs=require('fs');
const path=require('path');
const rateLimit=require('express-rate-limit');
const router=express.Router();
const {db,getSettings}=require('../lib/db');
const {requireAdmin,requireOwner}=require('../middleware/auth');
const upload=require('../lib/uploads');
const loginLimiter=rateLimit({windowMs:15*60*1000,max:10,standardHeaders:true,legacyHeaders:false});
function deleteUpload(filePath){if(!filePath||!filePath.startsWith('/uploads/'))return;const full=path.join(__dirname,'..','..','public',filePath);if(fs.existsSync(full))fs.unlinkSync(full);}
router.get('/login',(req,res)=>{if(req.session.adminId)return res.redirect('/admin');res.render('admin/login',{error:null});});
router.post('/login',loginLimiter,express.urlencoded({extended:true}),(req,res)=>{
  const admin=db.prepare('SELECT * FROM admins WHERE lower(email)=lower(?)').get(req.body.email||'');
  if(!admin||!bcrypt.compareSync(req.body.password||'',admin.password_hash))return res.status(401).render('admin/login',{error:'Invalid email or password.'});
  req.session.regenerate(err=>{if(err)return res.status(500).send('Session error.');req.session.adminId=admin.id;req.session.adminEmail=admin.email;req.session.adminRole=admin.role;res.redirect('/admin');});
});
router.post('/logout',requireAdmin,(req,res)=>req.session.destroy(()=>res.redirect('/admin/login')));
router.get('/',requireAdmin,(_req,res)=>{
  const counts={artists:db.prepare('SELECT COUNT(*) c FROM artists').get().c,portfolio:db.prepare('SELECT COUNT(*) c FROM portfolio').get().c,users:db.prepare('SELECT COUNT(*) c FROM admins').get().c};
  const recentArtists=db.prepare('SELECT * FROM artists ORDER BY updated_at DESC LIMIT 6').all();
  res.render('admin/dashboard',{counts,recentArtists});
});
router.get('/artists',requireAdmin,(_req,res)=>res.render('admin/artists',{artists:db.prepare('SELECT * FROM artists ORDER BY sort_order ASC,name ASC').all()}));
router.get('/artists/new',requireAdmin,(_req,res)=>res.render('admin/artist-form',{artist:null}));
router.post('/artists/new',requireAdmin,upload.fields([{name:'profile_image',maxCount:1},{name:'hero_image',maxCount:1}]),(req,res)=>{
  const b=req.body,slug=slugify(b.slug||b.name,{lower:true,strict:true});
  const profile=req.files?.profile_image?.[0]?`/uploads/${req.files.profile_image[0].filename}`:'';
  const hero=req.files?.hero_image?.[0]?`/uploads/${req.files.hero_image[0].filename}`:'';
  db.prepare(`INSERT INTO artists (name,slug,specialty,location,short_bio,bio,instagram,website,starting_price,awards,conventions,status,featured,profile_image,hero_image,seo_title,seo_description,sort_order,updated_at) VALUES (@name,@slug,@specialty,@location,@short_bio,@bio,@instagram,@website,@starting_price,@awards,@conventions,@status,@featured,@profile_image,@hero_image,@seo_title,@seo_description,@sort_order,CURRENT_TIMESTAMP)`).run({name:b.name,slug,specialty:b.specialty||'',location:b.location||'',short_bio:b.short_bio||'',bio:b.bio||'',instagram:b.instagram||'',website:b.website||'',starting_price:b.starting_price||'',awards:b.awards||'',conventions:b.conventions||'',status:b.status||'accepting',featured:b.featured?1:0,profile_image:profile,hero_image:hero,seo_title:b.seo_title||'',seo_description:b.seo_description||'',sort_order:Number(b.sort_order||0)});
  res.redirect('/admin/artists');
});
router.get('/artists/:id/edit',requireAdmin,(req,res)=>{const artist=db.prepare('SELECT * FROM artists WHERE id=?').get(req.params.id);if(!artist)return res.status(404).send('Artist not found');res.render('admin/artist-form',{artist});});
router.post('/artists/:id/edit',requireAdmin,upload.fields([{name:'profile_image',maxCount:1},{name:'hero_image',maxCount:1}]),(req,res)=>{
  const artist=db.prepare('SELECT * FROM artists WHERE id=?').get(req.params.id);if(!artist)return res.status(404).send('Artist not found');const b=req.body,slug=slugify(b.slug||b.name,{lower:true,strict:true});let profile=artist.profile_image,hero=artist.hero_image;
  if(req.files?.profile_image?.[0]){deleteUpload(profile);profile=`/uploads/${req.files.profile_image[0].filename}`;}if(req.files?.hero_image?.[0]){deleteUpload(hero);hero=`/uploads/${req.files.hero_image[0].filename}`;}
  db.prepare(`UPDATE artists SET name=@name,slug=@slug,specialty=@specialty,location=@location,short_bio=@short_bio,bio=@bio,instagram=@instagram,website=@website,starting_price=@starting_price,awards=@awards,conventions=@conventions,status=@status,featured=@featured,profile_image=@profile_image,hero_image=@hero_image,seo_title=@seo_title,seo_description=@seo_description,sort_order=@sort_order,updated_at=CURRENT_TIMESTAMP WHERE id=@id`).run({id:artist.id,name:b.name,slug,specialty:b.specialty||'',location:b.location||'',short_bio:b.short_bio||'',bio:b.bio||'',instagram:b.instagram||'',website:b.website||'',starting_price:b.starting_price||'',awards:b.awards||'',conventions:b.conventions||'',status:b.status||'accepting',featured:b.featured?1:0,profile_image:profile,hero_image:hero,seo_title:b.seo_title||'',seo_description:b.seo_description||'',sort_order:Number(b.sort_order||0)});
  res.redirect('/admin/artists');
});
router.post('/artists/:id/delete',requireAdmin,(req,res)=>{const artist=db.prepare('SELECT * FROM artists WHERE id=?').get(req.params.id);if(artist){deleteUpload(artist.profile_image);deleteUpload(artist.hero_image);}db.prepare('SELECT image_path FROM portfolio WHERE artist_id=?').all(req.params.id).forEach(p=>deleteUpload(p.image_path));db.prepare('DELETE FROM artists WHERE id=?').run(req.params.id);res.redirect('/admin/artists');});
router.get('/artists/:id/portfolio',requireAdmin,(req,res)=>{const artist=db.prepare('SELECT * FROM artists WHERE id=?').get(req.params.id);if(!artist)return res.status(404).send('Artist not found');res.render('admin/portfolio',{artist,portfolio:db.prepare('SELECT * FROM portfolio WHERE artist_id=? ORDER BY sort_order ASC,created_at DESC').all(artist.id)});});
router.post('/artists/:id/portfolio',requireAdmin,upload.array('images',20),(req,res)=>{const artist=db.prepare('SELECT * FROM artists WHERE id=?').get(req.params.id);if(!artist)return res.status(404).send('Artist not found');const b=req.body,ins=db.prepare('INSERT INTO portfolio (artist_id,title,image_path,style,placement,description,alt_text,featured,sort_order) VALUES (?,?,?,?,?,?,?,?,?)');(req.files||[]).forEach((f,i)=>ins.run(artist.id,b.title||'',`/uploads/${f.filename}`,b.style||'',b.placement||'',b.description||'',b.alt_text||`${artist.name} tattoo portfolio image`,b.featured?1:0,Number(b.sort_order||0)+i));res.redirect(`/admin/artists/${artist.id}/portfolio`);});
router.post('/portfolio/:id/delete',requireAdmin,(req,res)=>{const item=db.prepare('SELECT * FROM portfolio WHERE id=?').get(req.params.id);if(!item)return res.status(404).send('Portfolio item not found');deleteUpload(item.image_path);db.prepare('DELETE FROM portfolio WHERE id=?').run(item.id);res.redirect(`/admin/artists/${item.artist_id}/portfolio`);});

router.get('/editor',requireAdmin,(req,res)=>{
  const blocks=db.prepare("SELECT * FROM content_blocks ORDER BY CASE page WHEN 'Global' THEN 0 WHEN 'Home' THEN 1 ELSE 2 END, page, section, sort_order").all();
  res.render('admin/editor',{blocks,saved:req.query.saved==='1'});
});
router.post('/editor',requireAdmin,express.urlencoded({extended:true,limit:'2mb'}),(req,res)=>{
  const allowedFonts=new Set(['Anton','Bodoni Moda','Inter','Festigan']);
  const allowedWeights=new Set([300,400,500,600]);
  const allowedStyles=new Set(['normal','italic']);
  const allowedTransforms=new Set(['none','uppercase','lowercase','capitalize']);
  const allowedAligns=new Set(['left','center','right']);
  const blocks=db.prepare('SELECT key FROM content_blocks').all();
  const up=db.prepare('UPDATE content_blocks SET value=?,font=?,size=?,weight=?,style=?,transform=?,align=? WHERE key=?');
  const tx=db.transaction(()=>{blocks.forEach(({key})=>{
    const value=String(req.body[`${key}__value`]??'').slice(0,5000);
    const font=allowedFonts.has(req.body[`${key}__font`])?req.body[`${key}__font`]:'Inter';
    const size=Math.max(8,Math.min(180,Number(req.body[`${key}__size`]||16)));
    const weight=allowedWeights.has(Number(req.body[`${key}__weight`]))?Number(req.body[`${key}__weight`]):400;
    const style=allowedStyles.has(req.body[`${key}__style`])?req.body[`${key}__style`]:'normal';
    const transform=allowedTransforms.has(req.body[`${key}__transform`])?req.body[`${key}__transform`]:'none';
    const align=allowedAligns.has(req.body[`${key}__align`])?req.body[`${key}__align`]:'left';
    up.run(value,font,size,weight,style,transform,align,key);
  })}); tx(); res.redirect('/admin/editor?saved=1');
});

router.get('/settings',requireAdmin,(_req,res)=>res.render('admin/settings',{settings:getSettings()}));
router.post('/settings',requireAdmin,express.urlencoded({extended:true}),(req,res)=>{const allowed=['site_name','hero_eyebrow','hero_title','hero_script','hero_heading','hero_body','consultation_heading','consultation_embed_url','instagram_url','meta_title','meta_description'];const up=db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');allowed.forEach(k=>up.run(k,req.body[k]||''));res.redirect('/admin/settings');});
router.get('/account',requireAdmin,(req,res)=>res.render('admin/account',{error:null,success:null,email:req.session.adminEmail}));
router.post('/account/password',requireAdmin,express.urlencoded({extended:true}),(req,res)=>{const admin=db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.adminId);const b=req.body;if(!bcrypt.compareSync(b.current_password||'',admin.password_hash))return res.status(400).render('admin/account',{error:'Current password is incorrect.',success:null,email:admin.email});if(!b.new_password||b.new_password.length<10)return res.status(400).render('admin/account',{error:'New password must be at least 10 characters.',success:null,email:admin.email});if(b.new_password!==b.confirm_password)return res.status(400).render('admin/account',{error:'New passwords do not match.',success:null,email:admin.email});db.prepare('UPDATE admins SET password_hash=? WHERE id=?').run(bcrypt.hashSync(b.new_password,12),admin.id);res.render('admin/account',{error:null,success:'Password updated.',email:admin.email});});
router.get('/users',requireAdmin,requireOwner,(_req,res)=>res.render('admin/users',{users:db.prepare('SELECT id,name,email,role,created_at FROM admins ORDER BY created_at ASC').all(),error:null}));
router.post('/users',requireAdmin,requireOwner,express.urlencoded({extended:true}),(req,res)=>{const b=req.body;if(!b.email||!b.password||b.password.length<10)return res.status(400).render('admin/users',{users:db.prepare('SELECT id,name,email,role,created_at FROM admins ORDER BY created_at ASC').all(),error:'Email and a password of at least 10 characters are required.'});try{db.prepare('INSERT INTO admins(name,email,password_hash,role) VALUES(?,?,?,?)').run(b.name||'',b.email,bcrypt.hashSync(b.password,12),b.role==='owner'?'owner':'admin');}catch(e){return res.status(400).render('admin/users',{users:db.prepare('SELECT id,name,email,role,created_at FROM admins ORDER BY created_at ASC').all(),error:'That email already exists.'});}res.redirect('/admin/users');});
router.post('/users/:id/delete',requireAdmin,requireOwner,(req,res)=>{if(Number(req.params.id)===Number(req.session.adminId))return res.status(400).send('You cannot delete your own account while signed in.');db.prepare('DELETE FROM admins WHERE id=?').run(req.params.id);res.redirect('/admin/users');});
module.exports=router;
