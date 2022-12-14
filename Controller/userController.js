const mongoose = require("mongoose");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const Address = require("../models/Address");
const AppError = require("../utils/apperr");
const Coupons = require("../models/coupons");
const { response } = require("../app");
const Twillio = require("../utils/Twillio");


let Mobile
module.exports = {
  userlogin: (logindata) => {
    return new Promise(async (resolve, reject) => {
      //let loginstatus = false;
      let response = {
        status: false,
        usernotfound: false,
        blocked: false,
      };
      try {
        let user = await User.findOne({ email: logindata.email });

        if (user) {
          let Password = user.Password;
          let userstatus = user.IsActive;
          if (userstatus === false) {
            response.blocked = true;
            resolve(response);
          }
          if (user.IsVerified == false) {
            response.unverified = true;
            resolve(response);
          }

          console.log(Password);
          // console.log(req.body.Password);
          bcrypt.compare(logindata.Password, Password).then((status) => {
            if (status) {
              console.log("success");
              response.status = "true";
              response.user = user;
              response.Cart = user.Cart;
              response.email = user.email;

              resolve(response);
            } else {
              console.log("no");
              resolve(response);
           
            }
          });
        } else {
          console.log("failed");
          response.usernotfound = true;
          resolve(response);
      
        }
      } catch (error) {
        reject(error);
      }
    });
  },
  adduser: (data) => {
    return new Promise(async (resolve, reject) => {
      let response = {
        status: false,
        userexist: false,
        errors: {},
      };

      const Name = data.Name;
      const email = data.email;
      const password = data.Password;
      const confirmPass = data.confirmPass;
      const Mobile = data.Mobile;
      User.findOne({$or:[{ email: email },{Mobile:Mobile} ]}).then((Userdoc) => {
        if (Userdoc) {
          console.log("user already exsit");
          // req.session.duplicateuser = true;
         response.userexist = true;
          resolve(response);
        }
      });
      
      const Password = await bcrypt.hash(password, 10);
      console.log(Password);
      const user = new User({
        Name,
        email,
        Mobile,
        Password,
        confirmPass,
      });

      user
        .save()
        .then((doc) => {
          response.status = true;
          response.mobile = Mobile;
          response.email = email;
          
          Coupons.updateMany({$or:[{Category:'All Users'},{Category:'All Users'}]},{$push:{ActiveUsers:doc._id}}).then((data)=>{
            resolve(response);
          })
         
          //res.render("user/confirm");
        })
        .catch((e) => {
          console.log(e);
          response.errors = e;
          resolve(response);
        });
      //console.log(req.body);
    });
  },
  
  addAddress:async(req,res,next)=>{
   
    try{
   const addressfound = await Address.findOne({User:req.session.user._id})
   if(!addressfound)
   {   const address = new Address({
        User:req.session.user._id,
        Addresses: req.body
      }).save().then((doc)=>{
        // console.log(doc);
      })
    }
    else{
      const address = await Address.findOneAndUpdate({User:req.session.user._id},{$push:{Addresses:req.body}})
    }
    res.redirect('back')
  }catch(e){
    next(new AppError("Error While Adding Address",500))
  }
},
viewProfile:(req,res,next)=>{

  res.render("user/myaccount",{user:req.session.user,userlogged:true})
},
viewAddresses:async(req,res,next)=>{
  try{
 let userAddress = await Address.findOne({User:req.session.user._id})
 if(!userAddress){
  userAddress = {}
 }

  res.render("user/addresses",{Address:userAddress.Addresses,userlogged:true})
}
catch{
  next(new AppError('error found while viewing address'))
}
},
vieweditaddress:async(req,res,next)=>{
  let addressid = req.body.id;
  console.log(addressid);
  try{
  findAddress(addressid).then((data)=>{
 console.log(data[0].Addresses);
res.render("user/edit-address",{data:data[0].Addresses, userlogged:true})
  }) 
}
catch{
  next(new AppError('error found while add address'))
} 
},
ProfileSecurity:(req,res,next)=>{
  res.render("user/accountsettings",{user:req.session.user,userlogged:true, })
},
editAddress:async(req,res,next)=>{
  console.log(req.body);
  try{
  Address.findOneAndUpdate({'Addresses._id':req.body.id},{'$set':{'Addresses.$.FirstName':req.body.FirstName,
   'Addresses.$.LastName':req.body.LastName, 
   'Addresses.$.Phone':req.body.Phone,
   'Addresses.$.Email':req.body.Email,
   'Addresses.$.House':req.body.House,
   'Addresses.$.Address':req.body.Address,
   'Addresses.$.Pincode':req.body.Pincode,
   'Addresses.$.City':req.body.City,
   'Addresses.$.State':req.body.State,
      }})
  .then((data)=>{
    console.log(data);
      res.redirect("/myaccount/addresses")
    }).catch((e)=>{
      next(new AppError("Error while fetching Address !!",500))
    })
  }
  catch{
    next(new AppError("Error"))
  }

},
deleteaddress:async(req,res,next)=>{
console.log(req.body);
try{
  await Address.findOneAndUpdate({User:req.session.user._id},
    // {$pull:{'Addresses._id':req.body.id}})
  { $pull: { Addresses: { _id: req.body.id } } })
}
catch{
  next(new AppError('error found while deletion'))
}
res.redirect("user/addresses")
},
viewchangePassword:(req,res,next)=>{
  res.render("user/changePassword",{notmatch:req.session.passwordnotmatch,Notmatch:req.session.confirmnotmatch,userlogged:true})
  req.session.passwordnotmatch = null;
},
changePassword:async(req,res,next)=>{
  if (req.body.Password!==req.body.ConfirmPassword)
  {
    req.session.confirmnotmatch = true;
    res.redirect("/changePassword")
  }
 let data = await User.findOne({email:req.session.email} ,"Password -_id")
await bcrypt.compare(req.body.OldPassword,data.Password).then(async(doc)=>{
  if(doc){

    console.log(doc);
    Password = await bcrypt.hash(req.body.Password,10)
    User.findOneAndUpdate({email:req.session.email},{Password:Password}).then((d)=>{
      res.redirect("/myaccount/account-security")
    })
  }
  else{
    console.log("old Password Not Match !!")
    req.session.passwordnotmatch = true;
    res.redirect("/changePassword")
  }
})
},
EditName:async(req,res,next)=>{
  console.log(req.body)
  try {
 let updated =  await  User.findOneAndUpdate({_id:mongoose.Types.ObjectId(req.session.user._id)},{Name:req.body.Name},{new:true}) 
 console.log(updated);
 res.json(updated)
  } catch (error) {
    next(new AppError('Error While Editing Name',500))
  }


},
EditEmail:async(req,res,next)=>{
  console.log(req.body.Email)
  let response = {}
  try {
   
  let exist = await User.findOne({email:req.body.Email})
  console.log(exist);
  if(!exist)
  {
  let updated = await User.findOneAndUpdate({_id:mongoose.Types.ObjectId(req.session.user._id)},{email:req.body.Email},{new:true})
  response.data = updated;
  res.json(response)

  }
  else{
    response.message = 'This email is already registered '
   
    res.json(response)
  }
} catch (error) {
  response.failed  = true;
  res.json(response)
  console.log(error);
    next(new AppError('Error found While Editing Email Please try later',500))
}
  
},
EditMobile:async(req,res,next)=>{
  console.log(req.body);
  let response = {};
  try{
let exist = await User.findOne({Mobile:req.body.Mobile})
console.log(exist);
if(exist){
  response.exist ='Mobile Already Exist';
  res.json(response)
}
 else if(!exist){
 Twillio.getOtp(req.body.Mobile).then(()=>{
  response.otpsent = true; 
  Mobile = req.body.Mobile;
  req.session.EditngMobile = req.body.Mobile;
  res.json(response)
 })
 }
  }
  catch{
    next(new AppError("error found while editing"))
  }
},
VerifyOtp:(req,res,next)=>{
  let Number = req.session.EditMobile || Mobile;
  console.log(req.body,Number)
  let response = {}
  Twillio.checkOtp(req.body.code,Number).then(async(data)=>{
  if(data)
  {
   let updated = await User.findOneAndUpdate({_id:mongoose.Types.ObjectId(req.session.user._id)},{Mobile:Number},{new:true})
    response.Mobile = updated.Mobile;  
   res.json(response)
  }
  else if(!data)
  { 
    response.message = 'failed'
    res.json(response)

  }
  }).catch((e)=>{new AppError("error found at verification")})
},
ViewCoupons:async(req,res,next)=>{
  let userId =mongoose.Types.ObjectId(req.session.user._id);
  try{
    
  let availableCoupons = await Coupons.find({ActiveUsers:userId}) 
  console.log(availableCoupons);
  if(req.originalUrl == '/coupons'){
  res.render("user/coupons",{availableCoupons,userlogged:true});
  }
  else{
    //res.json(availableCoupons)
    return availableCoupons;
  }
  }
  catch(error){
    console.log(error);
    next(new AppError('Error While viewing coupons'))
  }


},
}


function findAddress(addressid){
  return new Promise ((resolve,reject)=>{
 Address.aggregate([
  {
    '$unwind': {
        'path': '$Addresses'
      }
    },
     {
      '$match': {
       'Addresses._id': mongoose.Types.ObjectId(addressid)  
      }
    }
  ]).then((data)=>{
  resolve(data)
  }).catch((e)=>{reject(e)})
})
    }

