function requireAdmin(req,res,next){
  if(req.session?.adminId) return next();
  req.session.returnTo=req.originalUrl;
  res.redirect('/admin/login');
}
function requireOwner(req,res,next){
  if(req.session?.adminRole==='owner') return next();
  res.status(403).send('Owner access required.');
}
module.exports={requireAdmin,requireOwner};
