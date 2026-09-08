const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const dataDir = path.join(__dirname, '..', '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'fineink.sqlite');
const native = new DatabaseSync(dbPath);
native.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');

const db = {
  exec(sql){ return native.exec(sql); },
  prepare(sql){
    const stmt = native.prepare(sql);
    return {
      get(...args){ return stmt.get(...normalizeArgs(args)); },
      all(...args){ return stmt.all(...normalizeArgs(args)); },
      run(...args){ return stmt.run(...normalizeArgs(args)); }
    };
  },
  transaction(fn){
    return (...args) => {
      native.exec('BEGIN IMMEDIATE');
      try { const out = fn(...args); native.exec('COMMIT'); return out; }
      catch (e) { native.exec('ROLLBACK'); throw e; }
    };
  }
};
function normalizeArgs(args){
  // node:sqlite accepts bare object keys for named parameters such as
  // @name, :name, or $name. Passing extra prefixed variants causes
  // ERR_SQLITE_ERROR: Unknown named parameter on statements that do not
  // contain every generated variant.
  if(args.length===1 && args[0] && typeof args[0]==='object' && !Array.isArray(args[0])){
    return [args[0]];
  }
  return args;
}
function initDb(){
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT DEFAULT '',email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT DEFAULT 'admin',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS artists (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,specialty TEXT DEFAULT '',location TEXT DEFAULT '',short_bio TEXT DEFAULT '',bio TEXT DEFAULT '',instagram TEXT DEFAULT '',website TEXT DEFAULT '',starting_price TEXT DEFAULT '',awards TEXT DEFAULT '',conventions TEXT DEFAULT '',status TEXT DEFAULT 'accepting',featured INTEGER DEFAULT 0,profile_image TEXT DEFAULT '',hero_image TEXT DEFAULT '',seo_title TEXT DEFAULT '',seo_description TEXT DEFAULT '',sort_order INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS portfolio (id INTEGER PRIMARY KEY AUTOINCREMENT,artist_id INTEGER NOT NULL,title TEXT DEFAULT '',image_path TEXT NOT NULL,style TEXT DEFAULT '',placement TEXT DEFAULT '',description TEXT DEFAULT '',alt_text TEXT DEFAULT '',featured INTEGER DEFAULT 0,sort_order INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS content_blocks (key TEXT PRIMARY KEY,page TEXT NOT NULL,section TEXT NOT NULL,label TEXT NOT NULL,value TEXT DEFAULT '',font TEXT DEFAULT 'Inter',size INTEGER DEFAULT 16,weight INTEGER DEFAULT 400,style TEXT DEFAULT 'normal',transform TEXT DEFAULT 'none',align TEXT DEFAULT 'left',sort_order INTEGER DEFAULT 0);
  `);
  seedAdmin(); seedArtists(); seedSettings(); seedContentBlocks();
}
function seedAdmin(){const email=process.env.ADMIN_EMAIL,password=process.env.ADMIN_PASSWORD;if(!email||!password)return;const e=db.prepare('SELECT id FROM admins WHERE lower(email)=lower(?)').get(email);if(!e)db.prepare('INSERT INTO admins (name,email,password_hash,role) VALUES (?,?,?,?)').run('Ricky Jr.',email,bcrypt.hashSync(password,12),'owner');}
function seedArtists(){if(db.prepare('SELECT COUNT(*) AS count FROM artists').get().count)return;const rows=[['Dimitry Vision','dimitry-vision','Realism / Black & Grey','Fine Ink Studios','Collector-level black and grey realism.','Premium custom realism focused on composition, contrast and large-scale body flow.','Consultation Required','accepting',1,1],['Vanessa Lux','vanessa-lux','Color Realism','Fine Ink Studios','Premium color realism with cinematic detail.','Highly saturated custom color work with a focus on polished finishes and dimensional form.','Consultation Required','accepting',1,2],['Craig Mack','craig-mack','Japanese / Irezumi','Fine Ink Studios','Large-scale Japanese-inspired work.','Large-scale Japanese-inspired tattoo projects designed around strong flow and readable composition.','Consultation Required','accepting',1,3],['Mariah Noir','mariah-noir','Black & Grey / Fine Line','Fine Ink Studios','Fine-line and black & grey specialist.','Refined black and grey work blending fine-line detail with luxury editorial aesthetics.','Consultation Required','accepting',1,4],['Alex Rivera','alex-rivera','Realism / Portraiture','Fine Ink Studios','Portrait and realism specialist.','Collector-level portrait and realism work designed for high-detail, premium tattoo projects.','Consultation Required','accepting',1,5]];const ins=db.prepare('INSERT INTO artists (name,slug,specialty,location,short_bio,bio,starting_price,status,featured,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)');db.transaction(items=>items.forEach(r=>ins.run(...r)))(rows);}
function seedSettings(){const d={site_name:'Fine Ink Studios Pro Team',consultation_embed_url:'',instagram_url:'',meta_title:'Fine Ink Studios Pro Team | Premium Tattoo Artists',meta_description:'Discover Fine Ink Studios Pro Team artists, premium portfolios, and collector-level tattoo experiences.'};const up=db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)');Object.entries(d).forEach(([k,v])=>up.run(k,v));}
function seedContentBlocks(){const rows=[
['header_pro_team','Global','Header','Header — Pro Team','PRO TEAM','Anton',20,400,'normal','uppercase','left',10],
['nav_artists','Global','Header','Navigation — Artists','Artists','Inter',11,500,'normal','uppercase','left',20],
['nav_portfolio','Global','Header','Navigation — Portfolio','Portfolio','Inter',11,500,'normal','uppercase','left',30],
['nav_experience','Global','Header','Navigation — Experience','Experience','Inter',11,500,'normal','uppercase','left',40],
['nav_book','Global','Header','Navigation — Book','Book','Inter',11,500,'normal','uppercase','left',50],
['header_cta','Global','Header','Header CTA','Book Consultation','Anton',12,400,'normal','uppercase','center',60],
['hero_eyebrow','Home','Hero','Hero Eyebrow','Fine Ink Studios','Inter',10,500,'normal','uppercase','left',100],
['hero_title','Home','Hero','Hero Title','PRO TEAM','Anton',120,400,'normal','uppercase','left',110],
['hero_script','Home','Hero','Hero Accent','Elite Artists. Premium Work.','Festigan',38,400,'normal','none','left',120],
['hero_heading','Home','Hero','Hero Heading','Tattoos for those who expect more.','Anton',78,400,'normal','uppercase','left',130],
['hero_body','Home','Hero','Hero Body','A curated collective of specialty tattoo artists creating elevated, large-scale and highly detailed custom work.','Inter',16,300,'normal','none','left',140],
['hero_cta_primary','Home','Hero','Hero Primary Button','Book Consultation →','Anton',14,400,'normal','uppercase','center',150],
['hero_cta_secondary','Home','Hero','Hero Secondary Button','View Artists','Anton',14,400,'normal','uppercase','center',160],
['artists_eyebrow','Home','Artists','Artists Eyebrow','The Pro Team','Inter',10,500,'normal','uppercase','center',200],
['artists_heading','Home','Artists','Artists Heading','Meet Our Elite Artists','Anton',72,400,'normal','uppercase','center',210],
['artist_card_cta','Home','Artists','Artist Card CTA','View Portfolio →','Inter',10,500,'normal','uppercase','left',220],
['experience_script','Home','Experience','Experience Accent','The Fine Ink Difference','Festigan',34,400,'normal','none','left',300],
['experience_heading','Home','Experience','Experience Heading','Collector-Level Experience','Anton',78,400,'normal','uppercase','left',310],
['experience_body','Home','Experience','Experience Body','Every touchpoint is designed around trust, craftsmanship, comfort and an exceptional final result.','Inter',16,300,'normal','none','left',320],
['experience_list','Home','Experience','Experience List — one item per line','Personalized consultation\nCustom project planning\nPremium studio environment\nAftercare guidance','Inter',16,400,'normal','none','left',330],
['experience_cta','Home','Experience','Experience Button','Start Your Project →','Anton',14,400,'normal','uppercase','center',340],
['portfolio_eyebrow','Home','Portfolio','Portfolio Eyebrow','Featured Work','Inter',10,500,'normal','uppercase','left',400],
['portfolio_heading','Home','Portfolio','Portfolio Heading','Art That Speaks For Itself.','Anton',72,400,'normal','uppercase','left',410],
['portfolio_script','Home','Portfolio','Portfolio Accent','Custom. Detailed. Timeless.','Festigan',34,400,'normal','none','left',420],
['consult_eyebrow','Home','Consultation','Consultation Eyebrow','Book Your Consultation','Inter',10,500,'normal','uppercase','left',500],
['consult_heading','Home','Consultation','Consultation Heading',"Let's Create Something Extraordinary.",'Anton',72,400,'normal','uppercase','left',510],
['consult_script','Home','Consultation','Consultation Accent','Your vision. Our expertise.','Festigan',34,400,'normal','none','left',520],
['process_eyebrow','Home','Process','Process Eyebrow','How It Works','Inter',10,500,'normal','uppercase','center',430],
['process_heading','Home','Process','Process Heading','From Idea To Ink','Anton',72,400,'normal','uppercase','center',431],
['process_body','Home','Process','Process Intro','A refined process built around clarity, collaboration and exceptional execution.','Inter',16,300,'normal','none','center',432],
['process_step_1_number','Home','Process','Step 1 Number','01','Bodoni Moda',28,400,'normal','none','left',433],
['process_step_1_title','Home','Process','Step 1 Title','Submit Your Idea','Anton',26,400,'normal','uppercase','left',434],
['process_step_1_body','Home','Process','Step 1 Body','Tell us about the concept, placement, size and direction of your project.','Inter',14,300,'normal','none','left',435],
['process_step_2_number','Home','Process','Step 2 Number','02','Bodoni Moda',28,400,'normal','none','left',436],
['process_step_2_title','Home','Process','Step 2 Title','Match With An Artist','Anton',26,400,'normal','uppercase','left',437],
['process_step_2_body','Home','Process','Step 2 Body','Choose a Pro Team artist or let us help match your idea with the right specialist.','Inter',14,300,'normal','none','left',438],
['process_step_3_number','Home','Process','Step 3 Number','03','Bodoni Moda',28,400,'normal','none','left',439],
['process_step_3_title','Home','Process','Step 3 Title','Consult & Plan','Anton',26,400,'normal','uppercase','left',440],
['process_step_3_body','Home','Process','Step 3 Body','Refine composition, scale, placement, timing and the creative direction with your artist.','Inter',14,300,'normal','none','left',441],
['process_step_4_number','Home','Process','Step 4 Number','04','Bodoni Moda',28,400,'normal','none','left',442],
['process_step_4_title','Home','Process','Step 4 Title','Create The Tattoo','Anton',26,400,'normal','uppercase','left',443],
['process_step_4_body','Home','Process','Step 4 Body','Your custom project comes to life in a premium studio environment built for serious work.','Inter',14,300,'normal','none','left',444],
['process_step_5_number','Home','Process','Step 5 Number','05','Bodoni Moda',28,400,'normal','none','left',445],
['process_step_5_title','Home','Process','Step 5 Title','Aftercare & Support','Anton',26,400,'normal','uppercase','left',446],
['process_step_5_body','Home','Process','Step 5 Body','Leave with clear aftercare guidance and continued support for the finished piece.','Inter',14,300,'normal','none','left',447],
['testimonial_eyebrow','Home','Testimonial','Testimonial Eyebrow','The Collector Experience','Inter',10,500,'normal','uppercase','center',450],
['testimonial_quote','Home','Testimonial','Testimonial Quote','“The entire experience felt elevated from the first conversation to the finished tattoo. Every detail was intentional.”','Bodoni Moda',38,400,'italic','none','center',451],
['testimonial_name','Home','Testimonial','Testimonial Name','Fine Ink Collector','Anton',16,400,'normal','uppercase','center',452],
['testimonial_detail','Home','Testimonial','Testimonial Detail','Large-Scale Custom Project','Inter',11,400,'normal','uppercase','center',453],
['faq_eyebrow','Home','FAQ','FAQ Eyebrow','Questions','Inter',10,500,'normal','uppercase','center',530],
['faq_heading','Home','FAQ','FAQ Heading','Before You Book','Anton',72,400,'normal','uppercase','center',531],
['faq_intro','Home','FAQ','FAQ Intro','A few things to know before starting a project with the Fine Ink Pro Team.','Inter',16,300,'normal','none','center',532],
['faq_q1','Home','FAQ','FAQ 1 Question','How do I choose the right Pro Team artist?','Anton',20,400,'normal','none','left',533],
['faq_a1','Home','FAQ','FAQ 1 Answer','Browse each artist page by specialty and portfolio. If you are unsure, submit your idea and our team can help guide you toward the best fit.','Inter',15,300,'normal','none','left',534],
['faq_q2','Home','FAQ','FAQ 2 Question','How far in advance should I book?','Anton',20,400,'normal','none','left',535],
['faq_a2','Home','FAQ','FAQ 2 Answer','Availability varies by artist and project size. Larger or multi-session pieces should be planned as early as possible.','Inter',15,300,'normal','none','left',536],
['faq_q3','Home','FAQ','FAQ 3 Question','Do you accept large-scale and multi-day projects?','Anton',20,400,'normal','none','left',537],
['faq_a3','Home','FAQ','FAQ 3 Answer','Yes. The Pro Team is specifically built for custom, specialty and larger-scale tattoo projects, including work that may require multiple sessions.','Inter',15,300,'normal','none','left',538],
['faq_q4','Home','FAQ','FAQ 4 Question','Can I bring reference images?','Anton',20,400,'normal','none','left',539],
['faq_a4','Home','FAQ','FAQ 4 Answer','Absolutely. References help communicate the direction you like. Your artist will use them as a starting point while creating an original design for you.','Inter',15,300,'normal','none','left',540],
['faq_q5','Home','FAQ','FAQ 5 Question','How do I start the booking process?','Anton',20,400,'normal','none','left',541],
['faq_a5','Home','FAQ','FAQ 5 Answer','Use the consultation form on this site. Once submitted, the booking team can connect you with the artist and next steps for your project.','Inter',15,300,'normal','none','left',542],
['footer_tagline','Global','Footer','Footer Tagline','Be True. Live Freely. Express Boldly.','Inter',10,400,'normal','uppercase','left',600],
['artists_page_title','Artists','Hero','Artists Page Title','PRO TEAM ARTISTS','Anton',110,400,'normal','uppercase','left',700],
['artists_page_script','Artists','Hero','Artists Page Accent','Find your artist.','Festigan',38,400,'normal','none','left',710],
['artist_page_eyebrow','Artist Detail','Hero','Artist Page Eyebrow','Fine Ink Pro Team','Inter',10,500,'normal','uppercase','left',800],
['artist_page_cta','Artist Detail','Hero','Artist Hero Button','Request This Artist →','Anton',14,400,'normal','uppercase','center',810],
['artist_about_eyebrow','Artist Detail','About','About Eyebrow','About the Artist','Inter',10,500,'normal','uppercase','left',820],
['artist_studio_label','Artist Detail','About','Studio Label','Studio:','Inter',16,600,'normal','none','left',830],
['artist_projects_label','Artist Detail','About','Projects Label','Projects:','Inter',16,600,'normal','none','left',840],
['artist_instagram_label','Artist Detail','About','Instagram Link','Instagram ↗','Inter',16,500,'normal','none','left',850],
['artist_selected_work','Artist Detail','Portfolio','Portfolio Eyebrow','Selected Work','Inter',10,500,'normal','uppercase','left',860],
['artist_portfolio_heading','Artist Detail','Portfolio','Portfolio Heading','Portfolio','Anton',72,400,'normal','uppercase','left',870],
['artist_awards_label','Artist Detail','Credentials','Awards Label','Awards & Recognition','Inter',10,500,'normal','uppercase','left',880],
['artist_conventions_label','Artist Detail','Credentials','Conventions Label','Conventions & Features','Inter',10,500,'normal','uppercase','left',890],
['artist_consult_eyebrow','Artist Detail','Consultation','Consultation Eyebrow','Start A Project','Inter',10,500,'normal','uppercase','left',900],
['artist_consult_prefix','Artist Detail','Consultation','Consultation Heading Prefix','Work With','Anton',72,400,'normal','uppercase','left',910]
];const ins=db.prepare('INSERT OR IGNORE INTO content_blocks (key,page,section,label,value,font,size,weight,style,transform,align,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');rows.forEach(r=>ins.run(...r));}
function getSettings(){return Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map(r=>[r.key,r.value]));}
function getBlocks(){return Object.fromEntries(db.prepare('SELECT * FROM content_blocks ORDER BY page,section,sort_order').all().map(r=>[r.key,r]));}
function blockStyle(b){if(!b)return'';const f={Anton:'Anton, Impact, sans-serif','Bodoni Moda':'"Bodoni Moda", serif',Inter:'Inter, Arial, sans-serif',Festigan:'Festigan, cursive'};return `font-family:${f[b.font]||f.Inter};font-size:${Number(b.size)||16}px;font-weight:${Number(b.weight)||400};font-style:${b.style||'normal'};text-transform:${b.transform||'none'};text-align:${b.align||'left'};`;}
module.exports={db,initDb,getSettings,getBlocks,blockStyle};
