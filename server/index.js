console.log("Nodejs projesinden merhaba");
// node dosyaismi.js
// npm install cors express serve socket.io

// http server

const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");
const io = require("socket.io")(server, {
    cors: {
        origin:"*",
        methods: ["GET","POST"]
    }
});


app.use(cors());  // nodejs use => .net'deki middleware

// server.listen öncesi 
// requirementlar sonrası
app.get('/', (req,res) => {
    res.send("nodejs backend çalışıyor...")
});
// connection => socketio'ya bir bağlantı sağlandığı an fırlatılacak 
// method ismi
io.on("connection", (socket) => {
    socket.emit("me", socket.id);

    socket.on("callUser", (data) => {
        console.log(data);
        io.to(data.to).emit("callUser", {signal:data.signal, from:data.from, name:data.name})
    })

    socket.on("disconnect", () => {
        socket.broadcast.emit("callEnded");
    })

    socket.on("answerCall", (data) => {
        io.to(data.to).emit("callAccepted", data.signal);
    })

})

server.listen(5000, () => { console.log("Server is ready and running") });
