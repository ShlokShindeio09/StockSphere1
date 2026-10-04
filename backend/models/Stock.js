import mongoose from "mongoose";
const schema=new mongoose.Schema({symbol:{type:String,required:true,unique:true,uppercase:true,index:true},name:String,sector:{type:String,index:true},price:Number,change:Number,changePercent:Number,marketCap:Number,volume:Number,high52:Number,low52:Number,peRatio:Number,dividendYield:Number,description:String},{timestamps:true});
export default mongoose.model("Stock",schema);
