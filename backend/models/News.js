import mongoose from "mongoose";
const schema=new mongoose.Schema({id:Number,title:String,summary:String,source:String,category:String,symbol:String,publishedAt:String},{timestamps:true});
export default mongoose.model("News",schema);
