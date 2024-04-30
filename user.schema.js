import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username:String,
    room: String,
});

export const userModel = mongoose.model('User', userSchema);