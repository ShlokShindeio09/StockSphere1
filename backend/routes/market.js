import { Router } from "express";
import Stock from "../models/Stock.js";
import News from "../models/News.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
const router=Router();

router.get("/market/overview",async(_req,res,next)=>{try{
 const stocks=await Stock.find().lean();
 const indices=[{name:"NIFTY 50",value:24852.15,change:312.4,changePercent:1.27},{name:"SENSEX",value:81450.28,change:968.2,changePercent:1.2},{name:"NIFTY IT",value:42118.6,change:894.5,changePercent:2.17}];
 const names=["IT","Banking","Pharma","Automobile","Energy","FMCG"], changes=[2.4,1.8,0.9,-0.4,1.2,0.6];
 res.json({indices,sectors:names.map((name,i)=>({name,changePercent:changes[i]})),movers:[...stocks].sort((a,b)=>b.changePercent-a.changePercent).slice(0,5),updatedAt:new Date().toISOString()});
}catch(e){next(e)}});

router.get("/stocks",async(req,res,next)=>{try{
 const filter={}; if(req.query.search)filter.$or=[{symbol:{$regex:req.query.search,$options:"i"}},{name:{$regex:req.query.search,$options:"i"}}]; if(req.query.sector)filter.sector=req.query.sector;
 res.json(await Stock.find(filter).lean());
}catch(e){next(e)}});

router.get("/stocks/:symbol",async(req,res,next)=>{try{
 const stock=await Stock.findOne({symbol:req.params.symbol.toUpperCase()}).lean(); if(!stock)return res.status(404).json({error:"Stock not found"}); res.json(stock);
}catch(e){next(e)}});

router.get("/stocks/:symbol/history",async(req,res,next)=>{try{
 const stock=await Stock.findOne({symbol:req.params.symbol.toUpperCase()}).lean(); if(!stock)return res.status(404).json({error:"Stock not found"});
 const labels=["09:30","10:15","11:00","11:45","12:30","13:15","14:00","14:45","15:30"], offsets=[-42,-34,-29,-17,-23,-10,-6,9,0];
 res.json(labels.map((label,i)=>({label,price:Number((stock.price-stock.change+offsets[i]*(stock.price/1200)).toFixed(2))})));
}catch(e){next(e)}});

router.get("/news",async(req,res,next)=>{try{
 const filter=req.query.symbol?{$or:[{symbol:req.query.symbol},{symbol:"NIFTY 50"}]}:{};
 res.json(await News.find(filter).lean());
}catch(e){next(e)}});

router.get("/leaderboard", async (_req, res, next) => {
  try {
    const [users, stocks] = await Promise.all([User.find().lean(), Stock.find().lean()]);
    const orders = await Order.find().sort({ createdAt: 1 }).lean();
    const byUser = new Map();
    for (const order of orders) { const p = byUser.get(String(order.userId)) || new Map(); const h = p.get(order.symbol) || { shares: 0, invested: 0 }; if (order.type === "BUY") { h.shares += order.quantity; h.invested += order.total; } else { h.shares -= order.quantity; h.invested -= order.total; } p.set(order.symbol, h); byUser.set(String(order.userId), p); }
    const rows = users.map(u => { const map = byUser.get(String(u._id)) || new Map(); let invested = 0, value = 0; for (const [symbol, h] of map) { const stock = stocks.find(s => s.symbol === symbol); if (stock && h.shares > 0) { invested += h.invested; value += h.shares * stock.price; } } const returnPercent = invested ? ((value - invested) / invested) * 100 : 0; return { name: u.name, initials: u.name.split(/\s+/).map(x => x[0]).join("").slice(0, 2).toUpperCase(), returnPercent: Number(returnPercent.toFixed(2)), portfolioValue: Number((u.cash + value).toFixed(2)) }; }).sort((a,b) => b.returnPercent - a.returnPercent).slice(0, 20).map((x, i) => ({ rank: i + 1, ...x }));
    res.json(rows);
  } catch (e) { next(e); }
});
export default router;
