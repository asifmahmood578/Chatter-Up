import express from 'express';
import http from 'http';
import path from 'path';
import {Server} from 'socket.io';
import cors from 'cors';
import {connectToDatabase} from './db.config.js';
import {userModel} from './user.schema.js';
import {chatModel} from './message.schema.js';
import { fileURLToPath } from 'url';
import Filter from 'bad-words';

// Serve Static files from the 'public' folder
const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);

// Create express app
export const app=express();
app.use(cors());

// Define the public path
const publicpath = path.join(__dirname,'public');
app.use(express.static(publicpath));

// Create server using http
export const server=http.createServer(app);

// Create socket.io server instance
const io=new Server(server,{
    cors:{
        origin:'*',
        methods:['GET','POST']
    }
});

// socket.emit - sends message to the current user
// io.emit - send message to every user including current user
// socket.broadcast.emit - send message to every user except current user
// io.to.emit- emits an event to everybody in specific room
// socket.broadcast.to.emit - emits an event to everybody in specific room except current user

// Handle socket connection event
io.on('connection',(socket)=>{
    console.log('New Websoscket conncetion');

    // Handle 'join' event when a user joins a room
    socket.on("join", async(Options,callback)=>{

        var {username,room} = Options;
        //clean the data
        username=username.trim().toLowerCase()
        room=room.trim().toLowerCase()

        // validate the data
        if(!username || !room){
            return callback("Username and room required")
        }

        // check for existing online user in current room
        const existingUser= await userModel.findOne({username,room});

        //validate username
        if(existingUser){
            return callback("Username is already in use")
        }

        const newUser=new userModel({username,room});
        await newUser.save();

        socket.join(room);

        socket.room=room;
        socket.username=username;

        const newMessage = new chatModel({username:'Admin',text:`Welcome! ${username}`,room:room,timestamp:new Date()});
        socket.emit('message',newMessage);

        socket.broadcast.to(room).emit('message',new chatModel({username: "Admin", text: `${username} has joined!`, room: room, timestamp: new Date()}));

        const allUsers=await userModel.find({room:room});

        // Limit the number of messages to 40
        var allMessages=await chatModel.find({room:room}).sort({timestamp:-1}).limit(40);
        allMessages=allMessages.reverse();

        io.to(room).emit('roomData',{
            room:room,
            users:allUsers
        });

        socket.emit('updateMessages',allMessages);

        callback();
    });

    // Handle 'sendMessage' event when a user sends a message
    socket.on('sendMessage', async(message,callback)=>{
        const {text,username,room,avatar}=message;

        // Creating a new instance of the profanity filter
        const filter = new Filter();

        // Checking if the message contains profanity
        if (filter.isProfane(text)) {
        // If profanity is detected, invoke the callback with an error message
        return callback("Profanity is not allowed!");
        }

        const newMessage=new chatModel({username:username,text:text,room:room,timestamp:new Date().getTime(), avatar});
        await newMessage.save();
        io.to(room).emit('message',newMessage);
        socket.broadcast.to(room).emit('notification',{username,text})

        callback();
    });

     // Handle 'loadMessages' event when loading messages
    socket.on('loadMessages', async(message,callback)=>{
        const{text,username,room,timestamp,avatar}=message;

        const newMessage= new chatModel({username:username,text:text,room:room,timestamp:new Date().getTime(),avatar});
        socket.emit('message',newMessage);
        callback();
    });

    // Handle 'sendLocation' event when client sends location data
    socket.on('sendLocation', async(coords,callback)=>{
        const {username,room,avatar}=coords;

        const newMessage= new chatModel({username:username,text:`http://google.com/maps?q=${coords.latitude},${coords.longitude}`,room:room,timestamp: new Date().getTime(),avatar});
        await newMessage.save();

        // Emit the 'locationMessage' event to all clients in the room
        io.to(room).emit('locationMessage',newMessage);
        callback();
    });

    // Handle 'typing' event when a user starts typing
    socket.on('typing',(user)=>{
        socket.broadcast.to(user.room).emit("typing...",user);
    });

      // Handle 'nottyping' event when a user stops typing
    socket.on('nottyping',(user)=>{
        socket.broadcast.to(user.room).emit('nottyping...',user);
    });

     // Handle 'disconnect' event when a user disconnects
    socket.on('disconnect',async()=>{
        // Access the room and username information from the socket
        const room=socket.room;
        const username=socket.username;

        // Remove the user from the userModel when disconnected
        if(room && username){
            await userModel.deleteOne({username,room});
            const newMessage= new chatModel({username:"Admin",text:`${username} has left!`,room:room,timestamp:new Date().getTime()});
            io.to(room).emit("message", newMessage);
            const allusers= await userModel.find({room:room});
            io.to(room).emit('updateOnlineUsers',{room:room,users:allusers});
            console.log(`${username} from ${room} is disconnected`);
        }
    });
});

// Start the server and connect to the database
server.listen(3000,()=>{
    console.log("Server is listening on port 3000");
    connectToDatabase();
})
