const path=require('path');
const crypto=require('crypto');
const multer=require('multer');
const storage=multer.diskStorage({
  destination:(_req,_file,cb)=>cb(null,path.join(__dirname,'..','..','public','uploads')),
  filename:(_req,file,cb)=>cb(null,`${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`)
});
function fileFilter(_req,file,cb){
  const ok=['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype);
  cb(ok?null:new Error('Only JPG, PNG, WEBP, and GIF images are allowed.'),ok);
}
module.exports=multer({storage,fileFilter,limits:{fileSize:10*1024*1024}});
