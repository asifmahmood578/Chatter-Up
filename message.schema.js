import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    username:String,
    text:String,
    room:String,
    timestamp: Date,
    avatar:{
        type:String,
        default:'admin.jpg'
    }
});

export const chatModel = mongoose.model('Message',messageSchema);