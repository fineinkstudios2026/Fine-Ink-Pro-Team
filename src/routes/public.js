const express=require('express');
const router=express.Router();
const {db,getSettings,getBlocks,blockStyle}=require('../lib/db');
router.use((_req,res,next)=>{res.locals.settings=getSettings();res.locals.blocks=getBlocks();res.locals.blockStyle=blockStyle;next();});
router.get('/',(_req,res)=>{
  const artists=db.prepare('SELECT * FROM artists ORDER BY featured DESC,sort_order ASC,name ASC').all();
  const featuredWork=db.prepare(`SELECT p.*,a.name artist_name,a.slug artist_slug FROM portfolio p JOIN artists a ON a.id=p.artist_id WHERE p.featured=1 ORDER BY p.sort_order ASC,p.created_at DESC LIMIT 12`).all();
  res.render('public/home',{artists,featuredWork});
});
router.get('/artists',(_req,res)=>{
  const artists=db.prepare('SELECT * FROM artists ORDER BY sort_order ASC,name ASC').all();
  res.render('public/artists',{artists});
});
router.get('/artists/:slug',(req,res)=>{
  const artist=db.prepare('SELECT * FROM artists WHERE slug=?').get(req.params.slug);
  if(!artist) return res.status(404).render('public/404');
  const portfolio=db.prepare('SELECT * FROM portfolio WHERE artist_id=? ORDER BY sort_order ASC,created_at DESC').all(artist.id);
  res.render('public/artist',{artist,portfolio});
});
module.exports=router;
