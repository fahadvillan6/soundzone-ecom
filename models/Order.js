const mongoose = require("mongoose")
const { ObjectId } = mongoose.Schema.Types;
const Product = require("./products");
const Orderschema = new mongoose.Schema({
    User:{
        type:ObjectId,
        required:true,
        ref:"User"
    },
    
    Products : [{
        Items:{
         type:ObjectId,
         ref:"Product"
   },
    Qty:{
        type:Number
    }
    }],
    Paymentmethod:{
        type: String,
        enum:["COD","RazorPay"]
        
      },
      PaymentStatus:{
        type:"String",
        default:"Pending",
        enum:[
            "Pending",
            "Completed",
            "Cancelled",
            "Refunded",
        ]
      },
      SubTotal:{
        type:String,
      },
      TotalPrice:{
           type:Number
      },
      Discount:{
        type:Number
      },
      OrderStatus:{
        type:String,
        default:"Pending",
        enum:[
            "Pending",
            "Placed",
            "Shipped",
            "In-transist",
            "Delivered",
            "Cancelled",
            "Returned",
            "Return-Confirmed"
        ]
      },
      Address:{
        type:ObjectId,
        ref:"Address"
      }, 
    
  

} , {timestamps:true})

const Orders = new mongoose.model("Orders",Orderschema);
module.exports = Orders;