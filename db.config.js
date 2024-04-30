import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';


const url=process.env.DB_URL;

export const connectToDatabase = async () =>{
    try{
        await mongoose.connect(url);
        console.log("MongoDB connected using mongoose");
    }catch(err){
        console.log(`Error connecting to database: `, err);
    }
}