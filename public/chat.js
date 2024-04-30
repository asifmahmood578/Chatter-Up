// const socket = io()
// Create socket connection to the server
const socket = io('http://localhost:3000');

// Initialize typing status and timeout
const typing=false;
const timeout = undefined;

// Function to generate a random avatar
function getRandomDp() {
    const index = Math.floor(Math.random()*20) +1;
    return `./profile/${index}.jpg`;
}
var userAvatar = getRandomDp();

// Extract username and room from the URL query parameters
const {username,room} = Qs.parse(location.search, {ignoreQueryPrefix: true})

// DOM Elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput =$messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages=document.querySelector('#messages')

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Function to automatically scroll to the bottom of the messages
const autoScroll = ()=>{
    // New message Element
    const $newMessage = $messages.lastElementChild;

    // Height of the new Message
    const newMessageStyle = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyle.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // visible height
    const visibleHeight = $messages.offsetHeight
    
    // Height of message container
    const containerHeight = $messages.scrollHeight;

    // How far i have scrolled
    const Scrolloffset = $messages.scrollTop + visibleHeight

    if(Math.round(containerHeight - newMessageHeight -1) <= Math.round(Scrolloffset)) {
        $messages.scrollTop = $messages.scrollHeight; 
    }
}

// Function to handle timeout for typing
function timeoutFunction(){
    typing=false;
    socket.emit('nottyping', {username, room});
}

// Function to handle key press event when not pressing enter
function onKeyDownNotEnter(){
    if(typing==false){
        typing=true
        socket.emit("typing",{username, room});
        timeout=setTimeout(timeoutFunction,2000);
    }else{
        clearTimeout(timeout);
        timeout = setTimeout(timeoutFunction,2000);
    }
}

// Event listener for input field to handle typing indication
$messageFormInput.addEventListener('input',()=>{
    onKeyDownNotEnter();
});

// Event listener for 'typing...' event
socket.on("typing...",(user)=>{
    console.log(`${user.username} is typing...`);

    // insert typing... message to all users
    const typingInfo = document.createElement('p');
    typingInfo.classList.add('typinginfo');
    typingInfo.innerHTML = `<strong>${user.username}</strong> is typing...`;
    $messages.insertAdjacentElement("afterend", typingInfo);
});

// Event listener for 'nottyping...' event
socket.on('nottyping...',(user)=>{
    console.log(`${user.username} stopped typing...`);

    // remove typing.. message fro all user
    const typinginfo =document.querySelector('.typinginfo');
    typinginfo.remove();
});

// Event listener for 'notification' event
socket.on('notification', ({username, text}) => {
    // add notification sound
    var audio = new Audio('notification.mp3');
    audio.play();
    alert(`${username} has sent a message`);
})

// Event listener for 'message' event
socket.on('message' , (message)=>{
    console.log(message)
    const html = Mustache.render(messageTemplate,{
        username:message.username,
        message:message.text,
        createdAt: moment(message.timestamp).format('h:mm a'),
        avatar:message.avatar
    })
    $messages.insertAdjacentHTML('beforeend',html)
    autoScroll()
})

// Event listener for 'locationMessage' event
socket.on('locationMessage',(message)=>{
    console.log(message);
    const html =Mustache.render(locationMessageTemplate,{
        username:message.username,
        url:message.text,
        createdAt: moment(message.timestamp).format('h:mm a'),
        avatar:message.avatar
    })
    $messages.insertAdjacentHTML('beforeend',html)
    autoScroll()
})

// Event listener for 'updateOnlineUsers' event
socket.on('updateOnlineUsers', ({room, users}) => {
    const sidebar = document.querySelector("#sidebar");
    sidebar.innerHTML = '';
    const heading = document.createElement('h2');
    heading.textContent = 'Users';
    heading.style.alignSelf = 'center'
    heading.style.marginBottom = '20px'
    sidebar.appendChild(heading);
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('user-element');
        const greenDot = document.createElement('div');
        greenDot.classList.add('online-green-dot');

        const userName = document.createElement('p');
        userName.classList.add('username');
        userName.innerHTML = user.username;

        userElement.appendChild(greenDot);
        userElement.appendChild(userName);
        sidebar.appendChild(userElement);
    });
});

// Event listener for 'updateMessages' event
socket.on('updateMessages',(messages)=>{
    messages.forEach((message)=>{
        socket.emit('loadMessages',{text:message.text , username:message.username, room:message.room, timestamp:message.timestamp, avatar:message.avatar },(error)=>{
            //enable the form
            // $messageFormButton.removeAttribute('disabled')
            // $messageFormInput.value = ''

            if(error){
                return console.log(`error in loading messages`,error);
            }
        });
    });
    $messageFormInput.focus()
})

// Event listener for 'roomData' event
socket.on('roomData', ({room, users}) => {
    // const html = Mustache.render(sidebarTemplate, {
    //     room, 
    //     users
    // })
    // document.querySelector('#sidebar').innerHTML = html
    const sidebar = document.querySelector("#sidebar");
    sidebar.innerHTML = '';
    const heading = document.createElement('h2');
    heading.textContent = 'Users';
    heading.style.alignSelf = 'center'
    heading.style.marginBottom = '20px'
    sidebar.appendChild(heading);
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('user-element');
        const greenDot = document.createElement('div');
        greenDot.classList.add('online-green-dot');

        const userName = document.createElement('p');
        userName.classList.add('username');
        userName.innerHTML = user.username;

        userElement.appendChild(greenDot);
        userElement.appendChild(userName);
        sidebar.appendChild(userElement);
    });

    autoScroll()
})

// Event listener for form submission
$messageForm.addEventListener('submit',(e)=>{
    e.preventDefault();
    // disable the form
    $messageFormButton.setAttribute('disabled','disbaled')

    const message = e.target.message.value

    socket.emit('sendMessage',{text:message,username,room,avatar:userAvatar}, (error)=>{
        // enable the form
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value=''
        $messageFormInput.focus()

        if(error){
            return console.log(error)
        }
        console.log("Message Delivered!")
    })
})

// Event listener for sending location
$sendLocationButton.addEventListener('click',()=>{
    if(!navigator.geolocation){
        return alert('Geolocation is not supported by your browser!')
    }

    $sendLocationButton.setAttribute('disabled','disabled')

    
    navigator.geolocation.getCurrentPosition((position)=>{
        socket.emit('sendLocation',{
            username,room,
            latitude:position.coords.latitude,
            longitude: position.coords.longitude,
            avatar: userAvatar
        },()=>{
            $sendLocationButton.removeAttribute('disabled')
            console.log('Location Shared!')
        })
    })
})

// Event listener for joining the chat room
socket.emit('join',{username,room}, (error)=>{
    if(error){
        alert(error)
        location.href= '/'
    }
});